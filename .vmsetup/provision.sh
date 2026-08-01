#!/usr/bin/env bash
# ============================================================================
#  provision.sh -- Run ONCE inside the freshly installed Fedora VM.
#
#  Usage:  sudo bash /mnt/hgfs/hostshare/.vmsetup/provision.sh
#
#  !!! IMPORTANT -- METERED / LIMITED INTERNET CONNECTION !!!
#  ----------------------------------------------------------------------------
#  This host runs on a limited data allowance. Wasting it is NOT acceptable.
#  When working on this codebase, treat every download as suspect:
#
#    - DO NOT add steps that download large files, package indexes, AI models,
#      updates or toolchains in the background or "just in case".
#    - DO NOT re-enable the update machinery this script disables below
#      (dnf-makecache, fwupd-refresh, PackageKit, GNOME Software updates).
#    - If something really must be fetched, do it once, explicitly, with an
#      obvious message, and prefer the cached RPMs already on the share.
#    - The Trae RPM and all build deps are ALREADY on the shared folder;
#      nothing here needs the internet except a one-time dnf install.
#
#  Every AI agent reading this file MUST honour this: the user pays for data
#  and has been burned by background downloads more than once.
#  ============================================================================
#
#  What it does, and why each part matters:
#
#   1. open-vm-tools        clipboard, drag-and-drop, HGFS. Ships with Fedora,
#                           so unlike VirtualBox Guest Additions there is no
#                           chicken-and-egg problem on first boot.
#   2. Network data saver   disables every background downloader so a running
#                           VM never burns the host's data allowance.
#   3. Data disk            formats the second virtual disk as ext4 labelled
#                           DEVDATA and mounts it at /data via fstab.
#   4. Kernel tuning        raises inotify watch limits. This is the single
#                           most important change for Trae's AI: with the
#                           default 8192 watches, a tree of ~81,000 files
#                           silently exhausts the limit and the editor stops
#                           seeing changes on disk.
#   5. Toolchain            Node.js, git, ripgrep and the Electron runtime
#                           libraries, installed permanently instead of being
#                           re-downloaded on every boot.
#   6. Trae IDE             installed from the RPM as a normal package.
#   7. Desktop tuning       disables the tracker indexer and animations.
#   8. Fresh identity       a systemd unit that regenerates machine-id and the
#                           hostname on each boot.
#   9. Project seeding      copies the project onto /data INCLUDING
#                           node_modules and .git.
#  10. SSH server           enables sshd and authorizes the host's public key
#                           so the Windows host can attach a Mutagen sync
#                           session (real-time two-way, no internet needed).
# ============================================================================

set -euo pipefail

RED=$'\e[31m'; GREEN=$'\e[32m'; YELLOW=$'\e[33m'; CYAN=$'\e[36m'; BOLD=$'\e[1m'; NC=$'\e[0m'
ok()   { printf '%s[OK]%s    %s\n'   "$GREEN"  "$NC" "$*"; }
info() { printf '%s[INFO]%s  %s\n'   "$CYAN"   "$NC" "$*"; }
warn() { printf '%s[WARN]%s  %s\n'   "$YELLOW" "$NC" "$*"; }
step() { printf '\n%s%s==> %s%s\n'   "$BOLD" "$CYAN" "$*" "$NC"; }
die()  { printf '%s[FAIL]%s  %s\n'   "$RED"    "$NC" "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "Run this with sudo."

# The user who invoked sudo owns the desktop session; files must belong to them,
# not to root.
TARGET_USER="${SUDO_USER:-}"
[[ -n "$TARGET_USER" ]] || die "Could not determine the invoking user. Run via sudo, not as root directly."
TARGET_UID=$(id -u "$TARGET_USER")
TARGET_GID=$(id -g "$TARGET_USER")
TARGET_HOME=$(getent passwd "$TARGET_USER" | cut -d: -f6)

SHARE="/mnt/hgfs/hostshare"
DATA="/data"
DATA_LABEL="DEVDATA"
PROJECT="$DATA/FinancialMarket"

printf '\n%s%s====================================================%s\n' "$BOLD" "$CYAN" "$NC"
printf '%s%s  Provisioning the golden Fedora dev VM%s\n' "$BOLD" "$CYAN" "$NC"
printf '%s%s====================================================%s\n' "$BOLD" "$CYAN" "$NC"
info "User: $TARGET_USER (uid $TARGET_UID)"

# ============================================================================
# 1. open-vm-tools -- needed before we can read the shared folder
# ============================================================================
step "VMware guest tools"
if ! rpm -q open-vm-tools >/dev/null 2>&1; then
    dnf install -y open-vm-tools open-vm-tools-desktop || die "Could not install open-vm-tools. Check networking."
fi
systemctl enable --now vmtoolsd >/dev/null 2>&1 || true
ok "open-vm-tools installed and running."

# HGFS is mounted by a helper that races with vmtoolsd on first boot; give it a
# moment before declaring the share missing.
if [[ ! -d "$SHARE" ]]; then
    info "Waiting for the shared folder to appear..."
    for _ in $(seq 1 15); do
        [[ -d "$SHARE" ]] && break
        sleep 1
    done
fi
[[ -d "$SHARE" ]] || die "Shared folder not found at $SHARE. Reboot the VM and re-run this script."
ok "Shared folder: $SHARE"

# ============================================================================
# 2. Network data saver -- this VM runs on a metered connection
# ============================================================================
step "Network data saver"

# A fresh Fedora quietly downloads a lot in the background: repo metadata
# timers, PackageKit / GNOME Software auto-updates, firmware metadata. Behind
# VMware NAT all of it counts against the host's data allowance, so every
# background download job is disabled and downloads only happen when
# explicitly asked for.
systemctl mask --now dnf-makecache.timer fwupd-refresh.timer >/dev/null 2>&1 || true

# PackageKit is socket-activated on Fedora -- masking only the service leaves
# the socket alive and a client can still trigger activation. Mask the socket
# too, and mask --now so it cannot restart.
systemctl mask --now packagekit.service packagekit-offline-update.service packagekit.socket >/dev/null 2>&1 || true

# GNOME Software: never auto-download, auto-notify or auto-apply updates.
sudo -u "$TARGET_USER" bash -c '
    gsettings set org.gnome.software download-updates false 2>/dev/null || true
    gsettings set org.gnome.software download-updates-notify false 2>/dev/null || true
    gsettings set org.gnome.software automatic-updates false 2>/dev/null || true
' || true

# dnf: never refresh metadata on a timer.
mkdir -p /etc/dnf
if [[ -f /etc/dnf/dnf.conf ]] && ! grep -q 'metadata_timer_sync' /etc/dnf/dnf.conf; then
    printf '\nmetadata_timer_sync = 0\n' >> /etc/dnf/dnf.conf
fi

ok "Background downloads disabled -- only explicit installs use data."

# ============================================================================
# 3. Data disk -- format and mount the project volume
# ============================================================================
step "Data disk"

# Identify the root disk so we can never touch it, then pick the other disk.
ROOT_SRC=$(findmnt -no SOURCE / 2>/dev/null || true)
# findmnt on btrfs can append the subvolume in brackets (e.g. /dev/nvme0n1p3[/root]);
# strip it so we are left with the plain device node.
ROOT_SRC="${ROOT_SRC%%\[*}"
# Resolve any symlink (e.g. /dev/root on some installs) to the real block
# device node; lsblk will otherwise fail to look the source up.
ROOT_SRC=$(readlink -f "$ROOT_SRC" 2>/dev/null || echo "$ROOT_SRC")
info "Root device: ${ROOT_SRC:-<unknown>}"

ROOT_DISK=""
if [[ -b "$ROOT_SRC" ]]; then
    # On btrfs, LVM or LUKS the source may be a subvolume/mapper device;
    # walk up the device tree to the top-level disk that holds it. -r keeps
    # the names free of tree-drawing characters (-s alone can prefix them).
    ROOT_DISK=$(lsblk -rsno NAME,TYPE "$ROOT_SRC" 2>/dev/null | awk '$2=="disk"{print $1; exit}' || true)
    # Defensive: strip any tree-drawing prefix that slipped through.
    ROOT_DISK=$(printf '%s' "$ROOT_DISK" | sed -E 's/^[^a-zA-Z0-9]+//' 2>/dev/null || true)
fi
if [[ -z "$ROOT_DISK" ]]; then
    # Fallback: scan every disk and find the one whose tree contains the
    # resolved root device.
    for disk in $(lsblk -dno NAME 2>/dev/null); do
        if lsblk -no PATH "/dev/$disk" 2>/dev/null | grep -qxF "$ROOT_SRC"; then
            ROOT_DISK="$disk"
            break
        fi
    done
fi
[[ -n "$ROOT_DISK" ]] || die "Could not determine the root disk (source: '${ROOT_SRC:-unknown}'). Aborting rather than risk formatting the wrong one."
info "Root disk: /dev/$ROOT_DISK (will not be touched)"

DATA_DEV=""
if BY_LABEL=$(blkid -L "$DATA_LABEL" 2>/dev/null); then
    # Already formatted by a previous run -- reuse it, do not reformat.
    DATA_DEV="$BY_LABEL"
    ok "Existing $DATA_LABEL filesystem found at $DATA_DEV -- keeping its contents."
else
    while read -r name type; do
        [[ "$type" == "disk" ]] || continue
        # Skip virtual devices -- zram/loop/ram/dm/md are not storage targets
        # (a swap zram device can otherwise be picked as the "second disk").
        [[ "$name" =~ ^(zram|loop|ram|dm-|md)[0-9]*$ ]] && continue
        [[ "$name" == "$ROOT_DISK" ]] && continue
        # An unpartitioned, unformatted disk is our data disk.
        if [[ -z "$(lsblk -no NAME "/dev/$name" 2>/dev/null | tail -n +2)" ]]; then
            DATA_DEV="/dev/$name"
            break
        fi
    done < <(lsblk -dno NAME,TYPE)

    [[ -n "$DATA_DEV" ]] || die "No unformatted second disk found. Check that the data disk is attached in the VM settings."

    warn "About to format $DATA_DEV as ext4 (label $DATA_LABEL)."
    info "Size: $(lsblk -dno SIZE "$DATA_DEV")"
    # No partition table: we format the whole device. One filesystem on one
    # virtual disk needs no partitioning, and it makes resizing trivial later.
    mkfs.ext4 -F -L "$DATA_LABEL" -m 1 -E lazy_itable_init=0,lazy_journal_init=0 "$DATA_DEV" \
        || die "mkfs.ext4 failed on $DATA_DEV"
    ok "Formatted $DATA_DEV"
fi

mkdir -p "$DATA"

# fstab by label, so the entry keeps working if device naming changes.
# nofail means a missing data disk cannot leave the VM stuck in emergency mode.
if ! grep -q "LABEL=$DATA_LABEL" /etc/fstab; then
    printf 'LABEL=%s  %s  ext4  defaults,noatime,nofail,x-systemd.device-timeout=10s  0 2\n' \
        "$DATA_LABEL" "$DATA" >> /etc/fstab
    ok "Added /etc/fstab entry."
fi
systemctl daemon-reload
mountpoint -q "$DATA" || mount "$DATA" || die "Could not mount $DATA"
chown "$TARGET_UID:$TARGET_GID" "$DATA"
ok "Mounted $DATA ($(df -h --output=size "$DATA" | tail -1 | tr -d ' ') total)"

# ============================================================================
# 4. Kernel tuning -- the part that makes Trae's AI reliable
# ============================================================================
step "Kernel limits for large project trees"

# Default max_user_watches on Fedora is 8192. The project has ~81,000 files
# (node_modules alone is ~77,000). Once the limit is hit, inotify_add_watch
# returns ENOSPC, the editor's file watcher dies, and the AI starts working
# from a stale in-memory copy: it "reads" code that no longer matches disk and
# its edits can overwrite newer changes. Raising this is not optional.
cat > /etc/sysctl.d/99-dev-watches.conf <<'EOF'
# Raised for IDE / AI file watching on large repositories.
fs.inotify.max_user_watches = 1048576
fs.inotify.max_user_instances = 8192
fs.inotify.max_queued_events = 65536

# Electron plus a language server can hold a very large number of open files.
fs.file-max = 2097152

# The project lives on a local disk, so favour cache retention over swapping.
vm.swappiness = 10
vm.vfs_cache_pressure = 50

# VS Code-derived editors (Trae included) and their language servers mmap a
# lot of memory; the stock 65530 map limit causes flaky "out of memory"
# crashes in Electron under load. Raise it well beyond what a dev session
# needs.
vm.max_map_count = 1048576

# This VM is a single socket, so NUMA balancing can only burn CPU cycles
# chasing migrations that can never happen.
kernel.numa_balancing = 0
EOF
sysctl --system >/dev/null 2>&1 || true
ok "inotify watches: $(cat /proc/sys/fs/inotify/max_user_watches)"

# Per-process file descriptor ceiling. sysctl raises the system-wide maximum;
# this raises what a single process is allowed to ask for.
cat > /etc/security/limits.d/99-dev.conf <<'EOF'
*  soft  nofile  262144
*  hard  nofile  524288
EOF
mkdir -p /etc/systemd/system.conf.d
cat > /etc/systemd/system.conf.d/99-dev-limits.conf <<'EOF'
[Manager]
DefaultLimitNOFILE=262144:524288
EOF
ok "File descriptor limits raised."

# ============================================================================
# 5. Toolchain and Electron runtime libraries
# ============================================================================
step "Development toolchain"

# ripgrep matters specifically: VS Code-derived editors, Trae included, shell
# out to rg for workspace search. Without it, search silently degrades and the
# AI's ability to locate code across the repo gets much worse.
PACKAGES=(
    git git-lfs rsync ripgrep fd-find jq
    nodejs npm
    nss mesa-libgbm pango alsa-lib libxkbcommon libdrm
    libXcomposite libXdamage libXrandr libXScrnSaver
    cups-libs at-spi2-atk gtk3 libsecret
    xdg-utils zram-generator
)
dnf install -y "${PACKAGES[@]}" || warn "Some packages failed to install -- see the output above."
ok "Node $(node --version 2>/dev/null || echo '?')  npm $(npm --version 2>/dev/null || echo '?')  rg $(rg --version 2>/dev/null | head -1 | awk '{print $2}' || echo '?')"

# ============================================================================
# 6. Trae IDE
# ============================================================================
step "Trae IDE"
TRAE_RPM="$SHARE/Trae-linux-x64.rpm"
if rpm -q trae >/dev/null 2>&1; then
    ok "Trae already installed."
elif [[ -f "$TRAE_RPM" ]]; then
    dnf install -y "$TRAE_RPM" || warn "Trae RPM install reported problems."
    ok "Trae installed from $TRAE_RPM"
else
    warn "Trae RPM not found at $TRAE_RPM -- install it manually later."
fi

# ============================================================================
# 7. Desktop tuning
# ============================================================================
step "Desktop tuning"

# tracker/localsearch indexes the whole home directory. Pointed at
# node_modules it burns CPU continuously and competes with the editor for I/O
# on exactly the files being edited. Masking it per-user is the supported way
# to switch it off.
sudo -u "$TARGET_USER" bash -c '
    systemctl --user mask tracker-miner-fs-3.service tracker-extract-3.service \
        localsearch-3.service tracker-miner-fs-control-3.service 2>/dev/null || true
    gsettings set org.gnome.desktop.interface enable-animations false 2>/dev/null || true
    gsettings set org.gnome.desktop.search-providers disable-external true 2>/dev/null || true
    gsettings set org.gnome.desktop.session idle-delay 0 2>/dev/null || true
    gsettings set org.gnome.settings-daemon.plugins.power sleep-inactive-ac-type nothing 2>/dev/null || true
' || warn "Some gsettings calls failed (harmless if no desktop session is active yet)."
ok "Indexer masked, animations off, sleep disabled."

# Force the CPU to the performance governor for the whole session. In a VM
# there is no real frequency scaling to win here, but it stops power-profiles
# daemon from ever selecting 'powersave' scheduling knobs that add latency to
# editor input while an AI is running.
if command -v powerprofilesctl >/dev/null 2>&1; then
    powerprofilesctl set performance 2>/dev/null || true
fi
ok "CPU performance profile set."

# zram gives compressed swap in RAM. Fedora ships this by default, but we size
# it explicitly so a memory spike from the AI features cannot OOM-kill the
# editor mid-edit.
cat > /etc/systemd/zram-generator.conf <<'EOF'
[zram0]
zram-size = min(ram / 2, 8192)
compression-algorithm = zstd
swap-priority = 100
EOF
ok "zram swap configured (zstd, up to 8 GB)."

# Boot faster: these services are pointless in a short-lived dev VM.
systemctl disable --now \
    NetworkManager-wait-online.service \
    firewalld.service \
    abrtd.service abrt-oops.service abrt-journal-core.service \
    >/dev/null 2>&1 || true
systemctl mask systemd-oomd.service >/dev/null 2>&1 || true
ok "Unneeded boot services disabled."

# ============================================================================
# 8. Fresh identity on every boot
# ============================================================================
step "Per-boot identity reset"

# The host randomises the SMBIOS UUID and MAC for each session. Those are the
# hardware-level identifiers. On Linux, however, most software reads
# /etc/machine-id and the hostname, so those must change too -- otherwise
# every "fresh" session still presents the same identity to anything running
# inside the guest.
cat > /usr/local/sbin/refresh-identity.sh <<'EOF'
#!/usr/bin/env bash
# Regenerate the guest's software identity. Runs once per boot.
set -eu

# systemd recreates machine-id from scratch when the file is empty.
: > /etc/machine-id
systemd-machine-id-setup >/dev/null 2>&1 || true

# A plausible-looking random hostname rather than an obviously generated one.
ADJ=(swift calm bright quiet solid rapid clear plain)
NOUN=(harbor summit meadow canyon willow beacon quartz cedar)
NEW_HOST="${ADJ[RANDOM % ${#ADJ[@]}]}-${NOUN[RANDOM % ${#NOUN[@]}]}-$(printf '%03d' $((RANDOM % 1000)))"
hostnamectl set-hostname "$NEW_HOST" >/dev/null 2>&1 || true

# Drop identifiers that would otherwise correlate sessions.
rm -f /var/lib/dbus/machine-id 2>/dev/null || true
ln -sf /etc/machine-id /var/lib/dbus/machine-id 2>/dev/null || true
rm -f /var/lib/systemd/random-seed 2>/dev/null || true
EOF
chmod 755 /usr/local/sbin/refresh-identity.sh

cat > /etc/systemd/system/refresh-identity.service <<'EOF'
[Unit]
Description=Regenerate machine-id and hostname for a fresh session
DefaultDependencies=no
After=systemd-remount-fs.service
Before=systemd-machine-id-commit.service network-pre.target sysinit.target
Conflicts=shutdown.target

[Service]
Type=oneshot
RemainAfterExit=no
ExecStart=/usr/local/sbin/refresh-identity.sh

[Install]
WantedBy=sysinit.target
EOF
systemctl enable refresh-identity.service >/dev/null 2>&1 || true
ok "Identity will be regenerated on each boot."

# ============================================================================
# 9. Seed the project onto the data disk
# ============================================================================
step "Seeding the project onto $DATA"

if [[ -d "$PROJECT/.git" || -f "$PROJECT/package.json" ]]; then
    ok "Project already present at $PROJECT -- leaving it untouched."
else
    if [[ -d "$SHARE" ]]; then
        info "Copying from the shared folder. This runs once and includes"
        info "node_modules and .git, so no npm install is needed later."
        mkdir -p "$PROJECT"
        # mkdir -p (as root) leaves the project dir owned by root; hand it to
        # the target user BEFORE rsync runs as them, otherwise every mkdir
        # inside fails with EACCES and every chgrp with EPERM (seen live:
        # the whole copy silently fails and the golden image ships empty).
        chown "$TARGET_UID:$TARGET_GID" "$PROJECT"
        # Deliberately NO --delete and NO excludes for node_modules/.git:
        # the whole point of the data disk is that the dependency tree lives
        # here permanently. Transient build output is skipped.
        # --no-group: -a preserves the source group, but the HGFS share's
        # group is not one the target user belongs to, so every chgrp fails
        # with EPERM and rsync exits 23 even though all data copied. The
        # chown -R below sets correct ownership anyway.
        if sudo -u "$TARGET_USER" rsync -a --no-group --info=progress2 \
            --exclude='.vmsetup/' \
            --exclude='.next/cache/' \
            --exclude='.Trash-1000/' \
            --exclude='*.rpm' \
            "$SHARE/" "$PROJECT/"; then
            ok "Project seeded at $PROJECT"
        else
            warn "rsync reported errors -- the project may be incomplete. Re-run this script."
        fi
        chown -R "$TARGET_UID:$TARGET_GID" "$DATA"
    else
        warn "Shared folder unavailable -- skipping the initial copy."
    fi
fi

# ---------------------------------------------------------------------------
# Editor settings that keep the AI accurate on a tree this size.
#
# Trae is VS Code-derived, so it honours the same settings keys. The watcher
# and search exclusions matter: node_modules holds ~77,000 of the ~81,000
# files. Watching it wastes the inotify budget, and indexing it floods
# workspace search with irrelevant matches, which measurably degrades the
# AI's ability to find the right file. Excluding it from watch/search does
# NOT stop the editor from opening those files when it needs to.
# ---------------------------------------------------------------------------
step "Editor configuration"
for CFG_DIR in "$TARGET_HOME/.config/Trae/User" "$TARGET_HOME/.config/Code/User"; do
    mkdir -p "$CFG_DIR"
    SETTINGS="$CFG_DIR/settings.json"
    if [[ -f "$SETTINGS" ]]; then
        info "$SETTINGS already exists -- not overwriting."
        continue
    fi
    cat > "$SETTINGS" <<'EOF'
{
  "files.watcherExclude": {
    "**/node_modules/**": true,
    "**/.git/objects/**": true,
    "**/.git/subtree-cache/**": true,
    "**/.next/**": true,
    "**/dist/**": true,
    "**/build/**": true,
    "**/coverage/**": true,
    "**/.cache/**": true,
    "**/offline-cache/**": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/.next": true,
    "**/dist": true,
    "**/coverage": true,
    "**/package-lock.json": true,
    "**/*.log": true
  },
  "files.exclude": {
    "**/.Trash-1000": true
  },
  "search.followSymlinks": false,
  "search.useIgnoreFiles": true,
  "files.autoSave": "afterDelay",
  "files.autoSaveDelay": 1000,
  "typescript.tsserver.maxTsServerMemory": 4096,
  "editor.largeFileOptimizations": true,
  "telemetry.telemetryLevel": "off",
  "update.mode": "none",
  "extensions.autoUpdate": false,
  "editor.codeActionsOnSave": {}
}
EOF
    ok "Wrote $SETTINGS"
done
chown -R "$TARGET_UID:$TARGET_GID" "$TARGET_HOME/.config" 2>/dev/null || true

# ---------------------------------------------------------------------------
# Launcher: a desktop entry and a shell command that both open the project
# from the data disk with the right Electron flags.
# ---------------------------------------------------------------------------
step "Launcher"
install -m 0755 "$SHARE/.vmsetup/launch-trae.sh" /usr/local/bin/dev 2>/dev/null \
    || warn "Could not install the launcher -- run launch-trae.sh from the share instead."

cat > /usr/share/applications/dev-project.desktop <<'EOF'
[Desktop Entry]
Type=Application
Name=Open Project in Trae
Comment=Launch Trae on the project stored on the persistent data disk
Exec=/usr/local/bin/dev
Icon=trae
Terminal=false
Categories=Development;IDE;
EOF
ok "Desktop entry created. Run 'dev' in a terminal, or use the app menu."

# ============================================================================
# 10. SSH server -- lets the Windows host attach a Mutagen sync session
# ============================================================================
step "SSH server (Mutagen sync)"

# The host syncs the project two-way with Mutagen over SSH. sshd must be
# running, and the host's public key (staged on the share by
# mutagen-sync.ps1) must be authorized for the desktop user.
if ! rpm -q openssh-server >/dev/null 2>&1; then
    dnf install -y openssh-server || warn "Could not install openssh-server -- the host cannot connect for sync."
fi
systemctl enable --now sshd >/dev/null 2>&1 || true
ssh-keygen -A >/dev/null 2>&1 || true

AUTH="$TARGET_HOME/.ssh/authorized_keys"
mkdir -p "$TARGET_HOME/.ssh"
touch "$AUTH"
HOST_PUB="$SHARE/.vmsetup/host.pub"
if [[ -f "$HOST_PUB" ]]; then
    while read -r line; do
        [[ -z "$line" ]] && continue
        grep -qF "$line" "$AUTH" 2>/dev/null || echo "$line" >> "$AUTH"
    done < "$HOST_PUB"
    chmod 700 "$TARGET_HOME/.ssh"
    chmod 600 "$AUTH"
    chown -R "$TARGET_UID:$TARGET_GID" "$TARGET_HOME/.ssh"
    ok "Host SSH key authorized for $TARGET_USER."
else
    warn "No host.pub staged yet -- run mutagen-sync.ps1 -GenKeyOnly on Windows first."
fi

# ============================================================================
# Done
# ============================================================================
MARKER="$SHARE/.golden-provisioned"
{
    printf 'provisioned=%s\n' "$(date -Is)"
    printf 'user=%s\n' "$TARGET_USER"
    printf 'fedora=%s\n' "$(rpm -E %fedora 2>/dev/null || echo '?')"
    printf 'kernel=%s\n' "$(uname -r)"
    printf 'node=%s\n' "$(node --version 2>/dev/null || echo 'missing')"
    printf 'trae=%s\n' "$(rpm -q trae 2>/dev/null || echo 'missing')"
    printf 'inotify_watches=%s\n' "$(cat /proc/sys/fs/inotify/max_user_watches)"
    printf 'data_disk=%s\n' "$(findmnt -no SOURCE "$DATA" 2>/dev/null || echo 'not mounted')"
} > "$MARKER" 2>/dev/null || warn "Could not write the marker file to the share."

printf '\n%s%s====================================================%s\n' "$BOLD" "$GREEN" "$NC"
printf '%s%s  Provisioning complete%s\n' "$BOLD" "$GREEN" "$NC"
printf '%s%s====================================================%s\n' "$BOLD" "$GREEN" "$NC"
printf '\n'
printf '  Project    : %s\n' "$PROJECT"
printf '  Data disk  : %s\n' "$(findmnt -no SOURCE,SIZE "$DATA" 2>/dev/null || echo '?')"
printf '  inotify    : %s watches\n' "$(cat /proc/sys/fs/inotify/max_user_watches)"
printf '\n'
printf '  Next: shut this VM down, then run on Windows:\n'
printf '     %spowershell -ExecutionPolicy Bypass -File build-golden.ps1 -Finalize%s\n' "$CYAN" "$NC"
printf '\n'
