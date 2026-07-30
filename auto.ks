# auto.ks -- Kickstart for unattended Fedora 44 + Trae + fingerprint randomizer
# ============================================================
#  Installs Fedora to disk with:
#    - XFS root on NVMe (fast)
#    - liveuser auto-login
#    - open-vm-tools (clipboard, shared folders, GPU)
#    - All Electron libs Trae needs
#    - Trae RPM extracted and ready (no manual setup per boot)
#    - sandbox-fingerprint.service: randomizes MAC/SID/hostname on every boot
#    - sandbox-boot.sh launcher installed to /usr/local/bin
# ============================================================

# --- Basic install ---
text
install
cdrom
lang en_US.UTF-8
keyboard --vckeymap=us --xlayouts=us
timezone UTC --utc

# --- Network: DHCP, but hostname will be randomized by the service ---
network --bootproto=dhcp --device=ens32 --activate --hostname=fedora-sandbox

# --- Root: locked, no root login ---
rootpw --lock

# --- Disk partitioning: single XFS root + swap ---
# Using LVM-thin would add complexity; a simple / partition is fastest for Live-like feel.
zerombr
clearpart --all --initlabel
part /boot/efi --fstype=efi --size=600
part swap --size=4096
part / --fstype=xfs --grow --size=20480

# --- User: liveuser, no password, auto-login on tty1 and GNOME ---
user --name=liveuser --gecos="Live User" --groups=wheel --password=
# Auto-login on tty1
services --enabled=vmtoolsd,sshd,systemd-resolved --disabled=

# --- Packages ---
%packages --default
@core
@base-x
@gnome-desktop
@fonts
@hardware-support
kernel
kernel-modules
# VMware integration
open-vm-tools
open-vm-tools-desktop
# Electron / Trae deps
nss
mesa-libgbm
pango
alsa-lib
libxkbcommon
libdrm
libXcomposite
libXdamage
libXrandr
cups-libs
# Utilities
rsync
vim
git
curl
wget
# Needed for fingerprint randomization
macchanger
%end

# --- Post-install: Trae + fingerprint service + launcher ---
%post --log=/var/log/ks-post.log

# ============================================================
# 1. GNOME auto-login for liveuser
# ============================================================
mkdir -p /etc/gdm
cat > /etc/gdm/custom.conf <<'GDMEOF'
[daemon]
AutomaticLogin=liveuser
AutomaticLoginEnable=True
WaylandEnable=true
GDMEOF

# ============================================================
# 2. sudo without password for liveuser (needed for mount/fingerprint ops)
# ============================================================
echo "liveuser ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/liveuser
chmod 440 /etc/sudoers.d/liveuser

# ============================================================
# 3. Trae RPM -- will be extracted on first boot (in sandbox-boot.sh)
#    We just ensure the dir exists.
# ============================================================
mkdir -p /opt/trae
chown liveuser:liveuser /opt/trae

# ============================================================
# 4. Fingerprint randomizer service
#    Runs ON EVERY BOOT (After=vmtoolsd.service).
#    - Sets random hostname (fedora-<random6>)
#    - Generates new machine-id (affects cookies, browser fingerprint)
#    - Randomizes /etc/machine-id (dbus/Tracker/Chromium use this)
#    - Clears systemd journal (contains old hostname/ids)
#    - Shuffles MAC via macchanger (if NIC is down)
# ============================================================
cat > /usr/local/sbin/sandbox-fingerprint.sh <<'FPEOF'
#!/usr/bin/env bash
# sandbox-fingerprint.sh -- randomize guest fingerprint on every boot
set -euo pipefail

# Random hostname
HN="fedora-$(head -c 3 /dev/urandom | od -An -tx1 | tr -d ' \n' | head -c 6)"
hostnamectl set-hostname "$HN" 2>/dev/null || true

# New machine-id (Chrome/Electron/DBus read this as hardware ID)
# systemd-tmpfiles recreates it if empty; writing a fresh random one is safe.
rm -f /etc/machine-id /var/lib/dbus/machine-id
systemd-machine-id-setup 2>/dev/null || true
# Ensure dbus sees the new id
ln -sf /etc/machine-id /var/lib/dbus/machine-id 2>/dev/null || true

# Clear old journal entries that reference previous hostname/ids
journalctl --rotate 2>/dev/null || true
journalctl --vacuum-time=1s 2>/dev/null || true

# Randomize MAC on the NIC if it's currently down (avoids disrupting active sessions)
# The hypervisor sets the MAC; we only re-spin when we can.
NIC=$(ip -o link show | awk -F': ' '/state UP/{print $2}' | head -1)
if [[ -n "${NIC:-}" ]]; then
    STATE=$(cat /sys/class/net/"$NIC"/operstate 2>/dev/null || echo "unknown")
    if [[ "$STATE" == "down" ]] && command -v macchanger &>/dev/null; then
        macchanger -a "$NIC" 2>/dev/null || true
    fi
fi

# Randomize /etc/ssh host keys so fingerprint differs each boot
rm -f /etc/ssh/ssh_host_*_key*
ssh-keygen -A 2>/dev/null || true

# Set a random wallpaper hue offset for GNOME (cosmetic fingerprint diff)
if [[ -n "${DISPLAY:-}" || -n "${WAYLAND_DISPLAY:-}" ]]; then
    HUE=$(( (RANDOM % 360) ))
    gsettings set org.gnome.desktop.background picture-uri "" 2>/dev/null || true
fi

exit 0
FPEOF
chmod +x /usr/local/sbin/sandbox-fingerprint.sh

# systemd unit
cat > /etc/systemd/system/sandbox-fingerprint.service <<'SVCEOF'
[Unit]
Description=Sandbox Fingerprint Randomizer
After=vmtoolsd.service network-pre.target
Before=network.service gdm.service
ConditionPathExists=/usr/local/sbin/sandbox-fingerprint.sh

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/sandbox-fingerprint.sh
RemainAfterExit=yes
StandardOutput=journal+console

[Install]
WantedBy=multi-user.target
SVCEOF
systemctl enable sandbox-fingerprint.service

# ============================================================
# 5. sandbox-boot.sh -- the in-guest launcher
#    Reads project from VMware shared folder, sets up RAM disk,
#    installs/launches Trae. This version is "permanent install" aware.
# ============================================================
cat > /usr/local/bin/sandbox-boot.sh <<'BOOTEOF'
#!/usr/bin/env bash
# sandbox-boot.sh -- mount VMware share + launch Trae on permanent Fedora
set -euo pipefail

MOUNT_DIR="/mnt/hgfs/FinancialMarket"
RPM_FILE="$MOUNT_DIR/Trae-linux-x64.rpm"
WORK_DIR="/run/live-work"
TRAE_BIN=""

RED='\e[31m'; GREEN='\e[32m'; YELLOW='\e[33m'; BLUE='\e[34m'; BOLD='\e[1m'; NC='\e[0m'
ok()   { echo -e "${GREEN}[OK]${NC}    $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC}  $*"; }
info() { echo -e "${BLUE}[INFO]${NC}  $*"; }
step() { echo; echo -e "${BOLD}${BLUE}==> $*${NC}"; }
fail() { echo -e "${RED}[FAIL]${NC}  $*" >&2; exit 1; }

# 1. Mount shared folder (open-vm-tools vmhgfs-fuse)
step "Shared folder (vmhgfs-fuse)"
sudo mkdir -p "$MOUNT_DIR"
if ! mountpoint -q "$MOUNT_DIR"; then
    sudo mount -t fuse.vmhgfs-fuse \
        -o allow_other,uid=$(id -u),gid=$(id -g),fmode=0755,dmode=0755,exec \
        .host:/FinancialMarket "$MOUNT_DIR" \
        || fail "Mount failed. Is open-vm-tools running?"
fi
ok "Mounted: $MOUNT_DIR"
[[ -f "$RPM_FILE" ]] || fail "Trae RPM not found: $RPM_FILE"

# 2. GPU check
step "GPU"
if lsmod | grep -q vmwgfx; then ok "vmwgfx active -- 3D ready."
else warn "vmwgfx not loaded -- software rendering."
fi

# 3. tmpfs workspace
step "tmpfs workspace"
if ! mountpoint -q "$WORK_DIR"; then
    sudo mkdir -p "$WORK_DIR"
    sudo mount -t tmpfs -o size=4G,uid=$(id -u),gid=$(id -g),mode=0755 tmpfs "$WORK_DIR"
fi
ok "Workspace: $WORK_DIR (4 GB tmpfs)"

# 4. Zram swap
step "Zram"
if ! swapon --show | grep -q zram; then
    ZRAM_MB=$(awk '/MemTotal/{print int($2/2/1024)}' /proc/meminfo)
    [[ $ZRAM_MB -gt 8192 ]] && ZRAM_MB=8192
    sudo modprobe zram 2>/dev/null || true
    echo zstd | sudo tee /sys/block/zram0/comp_algorithm >/dev/null 2>/dev/null || true
    echo "${ZRAM_MB}M" | sudo tee /sys/block/zram0/disksize >/dev/null 2>&1 || true
    sudo mkswap /dev/zram0 >/dev/null 2>/dev/null || true
    sudo swapon -p 100 /dev/zram0 2>/dev/null || true
    swapon --show | grep -q zram && ok "Zram ${ZRAM_MB}MB (zstd)." || warn "Zram skipped."
else
    ok "Zram already active."
fi

# 5. Trae cache -- persistent on disk this time (permanent install)
step "Trae cache"
mkdir -p "$HOME/.config/Trae" "$HOME/.cache/Trae"
ok "Trae cache dirs ready (persistent on disk)"

# 6. Project on RAM disk
step "Project RAM disk"
PROJECT_RAM="$WORK_DIR/project"
mkdir -p "$PROJECT_RAM"
if command -v rsync &>/dev/null; then
    info "Syncing project to RAM disk..."
    rsync -a --delete \
        --exclude='.git/' --exclude='node_modules/' --exclude='.next/' \
        --exclude='__pycache__/' --exclude='.cache/' \
        "$MOUNT_DIR/" "$PROJECT_RAM/" \
        && ok "Project on RAM disk: $PROJECT_RAM" \
        || warn "rsync failed -- using shared folder directly."
    (
        while true; do
            sleep 30
            rsync -a --delete \
                --exclude='.git/' --exclude='node_modules/' --exclude='.next/' \
                --exclude='__pycache__/' --exclude='.cache/' \
                "$PROJECT_RAM/" "$MOUNT_DIR/" 2>/dev/null || true
        done
    ) &
    ok "Background sync PID $! -- saves to Windows every 30s."
    TRAE_PROJECT="$PROJECT_RAM"
else
    warn "rsync missing -- using shared folder directly."
    TRAE_PROJECT="$MOUNT_DIR"
fi

# 7. Install/extract Trae
step "Trae IDE"
EXTRACT_DIR="/opt/trae"
TRAE_BIN=$(find "$EXTRACT_DIR" -type f -name "trae" 2>/dev/null | head -1 || true)
if [[ -n "$TRAE_BIN" && -x "$TRAE_BIN" ]]; then
    ok "Trae already installed: $TRAE_BIN"
else
    info "Installing Trae RPM..."
    sudo rpm -i "$RPM_FILE" 2>/dev/null || {
        info "RPM install failed, extracting to /opt/trae..."
        sudo mkdir -p "$EXTRACT_DIR"
        (cd "$EXTRACT_DIR" && sudo rpm2cpio "$RPM_FILE" | sudo cpio -idm 2>/dev/null)
    }
    TRAE_BIN=$(find /opt/trae /usr/share/trae /usr/lib/trae -type f -name "trae" 2>/dev/null | head -1 || true)
    [[ -n "$TRAE_BIN" ]] || fail "Trae binary not found after install."
    sudo chmod +x "$TRAE_BIN" 2>/dev/null || true
    ok "Trae installed: $TRAE_BIN"
fi

# 8. Launch Trae
if [[ -n "${WAYLAND_DISPLAY:-}" ]]; then
    OZONE="--ozone-platform=wayland"; info "Display: Wayland"
else
    OZONE="--ozone-platform=x11"; info "Display: X11"
fi
echo
echo -e "${BOLD}${GREEN}======================================================"
echo "  Ready!  Free RAM: $(free -m | awk '/^Mem:/{print $7}') MB"
echo "  Project: $TRAE_PROJECT"
echo "  Hostname: $(hostname)"
echo "  Machine-ID: $(cat /etc/machine-id)"
echo -e "======================================================${NC}"
echo
step "Launching Trae IDE"
exec "$TRAE_BIN" \
    --no-sandbox --disable-gpu-sandbox \
    $OZONE \
    --enable-gpu-rasterization --enable-zero-copy \
    --ignore-gpu-blocklist \
    --disable-dev-shm-usage \
    "$TRAE_PROJECT"
BOOTEOF
chmod +x /usr/local/bin/sandbox-boot.sh

# Add a desktop launcher icon for sandbox-boot.sh
mkdir -p /usr/share/applications
cat > /usr/share/applications/trae-sandbox.desktop <<'DESKTOPEOF'
[Desktop Entry]
Name=Trae Sandbox
Comment=Launch Trae IDE in sandbox
Exec=/usr/local/bin/sandbox-boot.sh
Terminal=true
Icon=utilities-terminal
Type=Application
Categories=Development;IDE;
DESKTOPEOF

# 9. Enable services
systemctl enable vmtoolsd
systemctl enable sandbox-fingerprint.service

%end

# --- Reboot after install ---
reboot
