#!/usr/bin/env bash
# install-share-permanent.sh -- make the VMware share work PERMANENTLY, with the
# right ownership, and without ever touching the wedged /mnt/hgfs tree.
#
# Run once in the Fedora guest:
#   sudo bash install-share-permanent.sh
#
# ---------------------------------------------------------------------------
# WHY /mnt/hgfs IS UNFIXABLE IN PLACE
#
# open-vm-tools mounts the whole HGFS tree on the PARENT directory /mnt/hgfs.
# When that parent mount dies (or a lazy `umount -l` leaves it half-detached),
# every lookup BELOW it fails with EACCES -- including /mnt/hgfs/FinancialMarket.
# That is why a fresh mount on the child directory still returns
# "Permission denied" for root: the failure happens while walking through the
# dead parent, before the child mount is ever consulted.
#
# The fix is to stop using /mnt/hgfs entirely and mount the share on a brand
# new path outside it, then make that mount persistent via systemd.
# ---------------------------------------------------------------------------
#
# What this installs:
#   /mnt/FinancialMarket                      -- the real, working mountpoint
#   /usr/local/sbin/mount-financialmarket.sh  -- unstack + mount helper
#   financialmarket-share.service             -- mounts it on every boot
#   ~/FinancialMarket-share                   -- convenience symlink for the user
#   /usr/local/bin/fix-share, start-trae      -- local copies, never read from FUSE

set -uo pipefail

if [[ $EUID -ne 0 ]]; then
    exec sudo -- bash "$0" "$@"
fi

REAL_USER="${SUDO_USER:-$(logname 2>/dev/null || who | awk 'NR==1{print $1}')}"
if [[ -z "$REAL_USER" || "$REAL_USER" == "root" ]]; then
    echo "ERROR: could not identify the desktop user. Run: sudo SUDO_USER=<you> bash $0"
    exit 1
fi
REAL_UID=$(id -u "$REAL_USER")
REAL_GID=$(id -g "$REAL_USER")
REAL_HOME=$(getent passwd "$REAL_USER" | cut -d: -f6)

SHARE_NAME="FinancialMarket"
NEW_MOUNT="/mnt/$SHARE_NAME"
HELPER="/usr/local/sbin/mount-financialmarket.sh"
UNIT="/etc/systemd/system/financialmarket-share.service"

RED='\e[31m'; GREEN='\e[32m'; YELLOW='\e[33m'; BLUE='\e[34m'; BOLD='\e[1m'; NC='\e[0m'
ok()   { echo -e "${GREEN}[OK]${NC}    $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC}  $*"; }
info() { echo -e "${BLUE}[INFO]${NC}  $*"; }
step() { echo; echo -e "${BOLD}${BLUE}==> $*${NC}"; }
fail() { echo -e "${RED}[FAIL]${NC}  $*" >&2; exit 1; }

layers() { awk -v d="$1" '$2 == d { n++ } END { print n+0 }' /proc/self/mounts; }

# Pop every stacked layer on a directory. /proc/self/mounts has one line per
# layer; `mountpoint` only reports the newest, so one unmount is never enough.
unstack() {
    local dir="$1" n i
    n=$(layers "$dir")
    [[ "$n" -eq 0 ]] && return 0
    info "unstacking $n layer(s) from $dir"
    fuser -km "$dir" 2>/dev/null || true
    for (( i = 0; i < n * 4 + 16; i++ )); do
        [[ "$(layers "$dir")" -eq 0 ]] && return 0
        fusermount3 -u "$dir" 2>/dev/null \
            || fusermount -u "$dir" 2>/dev/null \
            || umount "$dir" 2>/dev/null \
            || umount -f "$dir" 2>/dev/null \
            || umount -l "$dir" 2>/dev/null \
            || true
        sleep 0.4
    done
    for (( i = 0; i < 20; i++ )); do
        [[ "$(layers "$dir")" -eq 0 ]] && return 0
        sleep 0.5
    done
    return 1
}

# ---------------------------------------------------------------------------
step "1. Prerequisites"
if ! rpm -q open-vm-tools &>/dev/null; then
    info "installing open-vm-tools..."
    dnf install -y open-vm-tools || fail "open-vm-tools install failed"
fi
[[ -x /usr/bin/vmhgfs-fuse ]] || fail "/usr/bin/vmhgfs-fuse missing after install"
systemctl enable --now vmtoolsd &>/dev/null || true
sleep 2

if ! grep -qs '^[[:space:]]*user_allow_other' /etc/fuse.conf 2>/dev/null; then
    echo 'user_allow_other' >> /etc/fuse.conf
    ok "added user_allow_other to /etc/fuse.conf"
else
    ok "user_allow_other already set"
fi

if command -v vmware-hgfsclient &>/dev/null; then
    SHARES=$(vmware-hgfsclient 2>/dev/null | tr '\n' ' ')
    [[ -n "${SHARES// /}" ]] || fail "The host exports no shared folder.
  On Windows: VM > Settings > Options > Shared Folders > Always enabled,
  with '$SHARE_NAME' pointing at E:\\$SHARE_NAME."
    ok "host shares: $SHARES"
fi

# ---------------------------------------------------------------------------
step "2. Abandon the broken /mnt/hgfs tree"
# Order matters: children first, then the parent.
unstack "/mnt/hgfs/$SHARE_NAME" || warn "/mnt/hgfs/$SHARE_NAME still has layers"
unstack "/mnt/hgfs"             || warn "/mnt/hgfs still has layers (reboot clears it)"

# Disable the distro fstab entry that keeps re-creating the broken parent mount.
if grep -qs 'vmhgfs' /etc/fstab; then
    cp -a /etc/fstab "/etc/fstab.bak.$(date +%Y%m%d%H%M%S)"
    sed -i 's|^\([^#].*vmhgfs.*\)$|# disabled by install-share-permanent.sh: \1|' /etc/fstab
    ok "commented out vmhgfs entries in /etc/fstab (backup kept)"
fi
systemctl mask mnt-hgfs.mount &>/dev/null || true

# ---------------------------------------------------------------------------
step "3. Mount helper on a clean path: $NEW_MOUNT"
mkdir -p "$NEW_MOUNT"
chmod 755 "$NEW_MOUNT"

cat > "$HELPER" <<HELPEREOF
#!/usr/bin/env bash
# mount-financialmarket.sh -- generated by install-share-permanent.sh
# Mounts the VMware share on $NEW_MOUNT owned by $REAL_USER.
set -uo pipefail

DIR="$NEW_MOUNT"
SHARE="$SHARE_NAME"
OWNER_UID=$REAL_UID
OWNER_GID=$REAL_GID

layers() { awk -v d="\$1" '\$2 == d { n++ } END { print n+0 }' /proc/self/mounts; }

# Already mounted and readable? Nothing to do.
if [[ "\$(layers "\$DIR")" -gt 0 ]] && timeout 5 ls -A "\$DIR" >/dev/null 2>&1; then
    echo "already mounted and readable: \$DIR"
    exit 0
fi

# Pop any dead layer before mounting again.
n=\$(layers "\$DIR")
if [[ "\$n" -gt 0 ]]; then
    fuser -km "\$DIR" 2>/dev/null || true
    for (( i = 0; i < n * 4 + 16; i++ )); do
        [[ "\$(layers "\$DIR")" -eq 0 ]] && break
        fusermount3 -u "\$DIR" 2>/dev/null \\
            || umount "\$DIR" 2>/dev/null \\
            || umount -f "\$DIR" 2>/dev/null \\
            || umount -l "\$DIR" 2>/dev/null \\
            || true
        sleep 0.4
    done
    for (( i = 0; i < 20; i++ )); do
        [[ "\$(layers "\$DIR")" -eq 0 ]] && break
        sleep 0.5
    done
fi

mkdir -p "\$DIR"
chmod 755 "\$DIR"

/usr/bin/vmhgfs-fuse ".host:/\$SHARE" "\$DIR" \\
    -o allow_other,uid=\$OWNER_UID,gid=\$OWNER_GID,umask=022 \\
  || /usr/bin/vmhgfs-fuse ".host:/\$SHARE" "\$DIR" -o allow_other,umask=022 \\
  || { echo "vmhgfs-fuse failed"; exit 4; }

sleep 1
timeout 5 ls -A "\$DIR" >/dev/null 2>&1 || { echo "mounted but unreadable"; exit 5; }
echo "mounted: \$DIR"
HELPEREOF
chmod 0755 "$HELPER"
restorecon "$HELPER" 2>/dev/null || true
bash -n "$HELPER" || fail "generated helper has a syntax error"
ok "helper: $HELPER"

# ---------------------------------------------------------------------------
step "4. systemd unit (mounts on every boot)"
cat > "$UNIT" <<UNITEOF
[Unit]
Description=Mount VMware shared folder $SHARE_NAME at $NEW_MOUNT
Requires=vmtoolsd.service
After=vmtoolsd.service local-fs.target
Before=gdm.service

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=$HELPER
ExecStop=/bin/sh -c 'fusermount3 -u $NEW_MOUNT 2>/dev/null || umount -l $NEW_MOUNT 2>/dev/null || true'
TimeoutStartSec=90

[Install]
WantedBy=multi-user.target
UNITEOF
systemctl daemon-reload
systemctl enable financialmarket-share.service &>/dev/null \
    || fail "could not enable financialmarket-share.service"
systemctl restart financialmarket-share.service \
    || fail "mount service failed. Check: journalctl -u financialmarket-share -n 40"
ok "service enabled and started"

# ---------------------------------------------------------------------------
step "5. Verify"
timeout 5 ls -A "$NEW_MOUNT" >/dev/null 2>&1 \
    || fail "still unreadable at $NEW_MOUNT. Check: journalctl -u financialmarket-share -n 40"
ok "readable: $NEW_MOUNT"
echo "  layers: $(layers "$NEW_MOUNT")"
timeout 5 ls -A "$NEW_MOUNT" | head -5 | sed 's/^/  /'

# Prove a real file read works, not just a directory listing.
if [[ -f "$NEW_MOUNT/fix-share.sh" ]]; then
    timeout 5 head -c 32 "$NEW_MOUNT/fix-share.sh" >/dev/null 2>&1 \
        && ok "file reads work (fix-share.sh)" \
        || warn "directory lists but file reads fail -- run diagnose-share.sh"
fi

# Confirm the desktop user can read it too, not only root.
if sudo -u "$REAL_USER" timeout 5 ls -A "$NEW_MOUNT" >/dev/null 2>&1; then
    ok "$REAL_USER can read the share without sudo"
else
    warn "$REAL_USER cannot read the share; check user_allow_other in /etc/fuse.conf"
fi

if command -v getenforce &>/dev/null && [[ "$(getenforce)" == "Enforcing" ]]; then
    setsebool -P use_fusefs_home_dirs on 2>/dev/null || true
    info "SELinux Enforcing (fusefs boolean ensured)"
fi

# ---------------------------------------------------------------------------
step "6. Convenience links and local script copies"
ln -sfn "$NEW_MOUNT" "$REAL_HOME/$SHARE_NAME-share"
chown -h "$REAL_USER":"$REAL_USER" "$REAL_HOME/$SHARE_NAME-share" 2>/dev/null || true
ok "symlink: $REAL_HOME/$SHARE_NAME-share -> $NEW_MOUNT"

# Copy scripts to local disk with cat (never execute straight off FUSE) and
# strip Windows CRLF, so future runs do not depend on the share at all.
install_local() {
    local src="$1" dst="$2"
    [[ -f "$src" ]] || return 1
    timeout 20 cat "$src" > "${dst}.tmp" 2>/dev/null || { rm -f "${dst}.tmp"; return 1; }
    [[ -s "${dst}.tmp" ]] || { rm -f "${dst}.tmp"; return 1; }
    sed -i 's/\r$//' "${dst}.tmp"
    bash -n "${dst}.tmp" 2>/dev/null || { rm -f "${dst}.tmp"; return 1; }
    mv "${dst}.tmp" "$dst"
    chmod 0755 "$dst"
    restorecon "$dst" 2>/dev/null || true
}

install_local "$NEW_MOUNT/start-installed.sh" /usr/local/bin/start-trae \
    && ok "installed: sudo start-trae" || warn "could not install start-trae"
install_local "$NEW_MOUNT/fix-share.sh" /usr/local/bin/fix-share \
    && ok "installed: sudo fix-share" || warn "could not install fix-share"
install_local "$NEW_MOUNT/diagnose-share.sh" /usr/local/bin/diagnose-share \
    && ok "installed: sudo diagnose-share" || true

# ---------------------------------------------------------------------------
echo
echo -e "${BOLD}${GREEN}======================================================"
echo "  PERMANENT share is ready."
echo
echo "  Path      : $NEW_MOUNT   (owner $REAL_USER)"
echo "  Shortcut  : $REAL_HOME/$SHARE_NAME-share"
echo "  On boot   : financialmarket-share.service"
echo "  Remount   : sudo systemctl restart financialmarket-share"
echo "  Start Trae: sudo start-trae"
echo
echo "  /mnt/hgfs is no longer used. Reboot once to clear its dead mounts."
echo -e "======================================================${NC}"
