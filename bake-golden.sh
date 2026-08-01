#!/usr/bin/env bash
# bake-golden.sh -- ONE-TIME golden image bake (run INSIDE the Fedora VM)
# ============================================================================
# Run this exactly ONCE, from a Terminal inside the VM, BEFORE taking the
# final "golden" snapshot. It bakes everything into the image so that every
# future sandbox session needs:
#   - ZERO internet
#   - ZERO dnf installs
#   - ZERO passwords
#   - ZERO re-installation
# The only thing that changes per session is the fingerprint (host + guest).
#
# USAGE (inside VM terminal):
#   sudo bash /path/to/bake-golden.sh
#
# After it finishes: close Trae, SHUT DOWN the VM, then on Windows run:
#   rebase-golden.ps1     (re-takes the golden snapshot)
# ============================================================================

set -uo pipefail

# --- Resolve the real desktop user ---
U="${SUDO_USER:-$(logname 2>/dev/null || echo alinovin)}"
[[ "$U" == "root" ]] && U="alinovin"
REAL_HOME="$(getent passwd "$U" | cut -d: -f6)"
[[ -z "$REAL_HOME" ]] && REAL_HOME="/home/$U"
UID_R=$(id -u "$U")
GID_R=$(id -g "$U")

MNT="/mnt/FinancialMarket"
SHARE="FinancialMarket"
PROJECT_DIR="$REAL_HOME/$SHARE"
RPM_SRC="$MNT/Trae-linux-x64.rpm"

RED=$'\e[31m'; GREEN=$'\e[32m'; YELLOW=$'\e[33m'; BLUE=$'\e[34m'; BOLD=$'\e[1m'; NC=$'\e[0m'
ok()   { printf '%s[OK]%s    %s\n' "$GREEN" "$NC" "$*"; }
info() { printf '%s[INFO]%s  %s\n' "$BLUE"  "$NC" "$*"; }
warn() { printf '%s[WARN]%s  %s\n' "$YELLOW" "$NC" "$*"; }
fail() { printf '%s[FAIL]%s  %s\n' "$RED" "$NC" "$*" >&2; exit 1; }
step() { echo; printf '%s==> %s%s\n' "$BOLD$BLUE" "$*" "$NC"; }

[[ "$EUID" -eq 0 ]] || { echo "Run with sudo: sudo bash bake-golden.sh"; exit 1; }

echo "============================================================"
echo "  GOLDEN IMAGE BAKE  (user=$U home=$REAL_HOME)"
echo "============================================================"

# ---------------------------------------------------------------------------
# 1. Packages (ONE-TIME internet use; never again after the snapshot)
# ---------------------------------------------------------------------------
step "1/9 Packages"
rpm -q open-vm-tools >/dev/null 2>&1 || dnf install -y open-vm-tools >>/var/log/bake-golden.log 2>&1
rpm -q rsync      >/dev/null 2>&1 || dnf install -y rsync      >>/var/log/bake-golden.log 2>&1
rpm -q fuse3      >/dev/null 2>&1 || dnf install -y fuse3      >>/var/log/bake-golden.log 2>&1
ok "open-vm-tools, rsync, fuse3 present"
systemctl enable --now vmtoolsd 2>/dev/null || true

# ---------------------------------------------------------------------------
# 2. Mount share so we can read the Trae RPM and project
# ---------------------------------------------------------------------------
step "2/9 Share"
mkdir -p "$MNT"; chmod 755 "$MNT"
if ! timeout 5 ls -A "$MNT" >/dev/null 2>&1; then
    /usr/bin/vmhgfs-fuse ".host:/$SHARE" "$MNT" \
        -o allow_other,uid="$UID_R",gid="$GID_R",umask=022 2>/dev/null \
        || /usr/bin/vmhgfs-fuse ".host:/$SHARE" "$MNT" -o allow_other,umask=022 2>/dev/null \
        || warn "share mount failed -- ensure Shared Folders is enabled in VMware"
fi
timeout 5 ls -A "$MNT" >/dev/null 2>&1 && ok "share mounted: $MNT" || warn "share unavailable"

grep -qs '^[[:space:]]*user_allow_other' /etc/fuse.conf 2>/dev/null || \
    echo 'user_allow_other' >> /etc/fuse.conf
ok "fuse.conf user_allow_other"

# ---------------------------------------------------------------------------
# 3. Install Trae (from share RPM; fallback to cached/downloaded copies)
# ---------------------------------------------------------------------------
step "3/9 Trae"
TRAE_BIN=""
for c in /usr/share/trae/trae /usr/bin/trae /opt/Trae/trae; do
    [[ -x "$c" ]] && TRAE_BIN="$c" && break
done
if [[ -z "$TRAE_BIN" ]]; then
    RPM=""
    for cand in "$RPM_SRC" /tmp/Trae-linux-x64.rpm "$REAL_HOME/.cache/trae-install/Trae-linux-x64.rpm"; do
        [[ -f "$cand" ]] && RPM="$cand" && break
    done
    if [[ -n "$RPM" ]]; then
        info "installing Trae from $RPM"
        rpm -i "$RPM" 2>/dev/null || dnf install -y "$RPM" >>/var/log/bake-golden.log 2>&1 \
            || fail "Trae RPM install failed"
    else
        info "no RPM found -- downloading once (needs internet for this step only)"
        mkdir -p "$REAL_HOME/.cache/trae-install"
        curl -fL https://download.trae.ai/application/Trae-linux-x64.rpm \
            -o "$REAL_HOME/.cache/trae-install/Trae-linux-x64.rpm" 2>/dev/null \
            && rpm -i "$REAL_HOME/.cache/trae-install/Trae-linux-x64.rpm" 2>/dev/null \
            || fail "could not obtain Trae. Copy Trae-linux-x64.rpm to E:\\FinancialMarket first."
    fi
    for c in /usr/share/trae/trae /usr/bin/trae /opt/Trae/trae; do
        [[ -x "$c" ]] && TRAE_BIN="$c" && break
    done
fi
[[ -n "$TRAE_BIN" ]] && ok "Trae ready: $TRAE_BIN" || fail "Trae binary not found after install"

# ---------------------------------------------------------------------------
# 4. NOPASSWD sudo for $U (kills every password prompt forever)
# ---------------------------------------------------------------------------
step "4/9 sudo"
echo "$U ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/sandbox
chmod 440 /etc/sudoers.d/sandbox
ok "NOPASSWD sudo installed"

# ---------------------------------------------------------------------------
# 5. GNOME auto-login + tweaks (persist in the image)
# ---------------------------------------------------------------------------
step "5/9 GNOME"
mkdir -p /etc/gdm
cat > /etc/gdm/custom.conf <<'GDMEOF'
[daemon]
AutomaticLoginEnable=True
AutomaticLogin=alinovin
WaylandEnable=true
GDMEOF
ok "auto-login configured"

# User-level tweaks
su - "$U" -c '
    gsettings set org.gnome.desktop.interface enable-animations false 2>/dev/null || true
    systemctl --user mask tracker-miner-fs-3.service tracker-extract-3.service 2>/dev/null || true
' 2>/dev/null || true
ok "animations off, tracker disabled"

# ---------------------------------------------------------------------------
# 6. Autostart files: sync service + login launcher + desktop entry
# ---------------------------------------------------------------------------
step "6/9 autostart"

# systemd USER service for bidirectional sync (starts at every login)
mkdir -p "$REAL_HOME/.config/systemd/user"
cat > "$REAL_HOME/.config/systemd/user/bidirectional-sync.service" <<'SYSEOF'
[Unit]
Description=Bidirectional sync guest disk <-> VMware share
After=default.target

[Service]
Type=simple
ExecStart=/bin/bash %h/bidirectional-sync.sh
Restart=on-failure
RestartSec=10

[Install]
WantedBy=default.target
SYSEOF

chown -R "$U":"$U" "$REAL_HOME/.config/systemd"

# GNOME autostart entry for Trae
mkdir -p "$REAL_HOME/.config/autostart"
cat > "$REAL_HOME/.config/autostart/autostart-trae.desktop" <<'DESKTOPEOF'
[Desktop Entry]
Type=Application
Name=Trae Autostart
Comment=Mount share, start sync, launch Trae
Exec=/home/alinovin/autostart-trae.sh
Terminal=false
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
X-GNOME-Autostart-Delay=10
DESKTOPEOF
chown -R "$U":"$U" "$REAL_HOME/.config/autostart"
ok "autostart entries installed"

# ---------------------------------------------------------------------------
# 7. Fingerprint randomizer service (runs BEFORE login, every boot)
#    Only hostname/machine-id/ssh-keys/MAC change -- nothing else.
# ---------------------------------------------------------------------------
step "7/9 fingerprint service"
cat > /usr/local/sbin/sandbox-fingerprint.sh <<'FPEOF'
#!/usr/bin/env bash
set -euo pipefail
HN="fedora-$(head -c 3 /dev/urandom | od -An -tx1 | tr -d ' \n' | head -c 6)"
hostnamectl set-hostname "$HN" 2>/dev/null || true
echo "$HN" > /etc/hostname
rm -f /etc/machine-id /var/lib/dbus/machine-id
systemd-machine-id-setup 2>/dev/null || true
ln -sf /etc/machine-id /var/lib/dbus/machine-id 2>/dev/null || true
journalctl --rotate 2>/dev/null || true
journalctl --vacuum-time=1s 2>/dev/null || true
NIC=$(ip -o link show 2>/dev/null | awk -F': ' '$2 !~ /^(lo|vmnet|veth)/{print $2}' | head -1)
if [[ -n "$NIC" && "$(cat /sys/class/net/$NIC/operstate 2>/dev/null)" == "down" ]] \
   && command -v macchanger &>/dev/null; then
    macchanger -a "$NIC" 2>/dev/null || true
fi
rm -f /etc/ssh/ssh_host_*_key*
ssh-keygen -A 2>/dev/null || true
exit 0
FPEOF
chmod +x /usr/local/sbin/sandbox-fingerprint.sh

cat > /etc/systemd/system/sandbox-fingerprint.service <<'SVCEOF'
[Unit]
Description=Sandbox Fingerprint Randomizer
After=vmtoolsd.service network-pre.target
Before=gdm.service network.service
ConditionPathExists=/usr/local/sbin/sandbox-fingerprint.sh

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/sandbox-fingerprint.sh
RemainAfterExit=yes
StandardOutput=journal+console

[Install]
WantedBy=multi-user.target
SVCEOF
systemctl daemon-reload
systemctl enable sandbox-fingerprint.service
ok "fingerprint service enabled"

# ---------------------------------------------------------------------------
# 8. Initial project pull to guest disk (so Trae has it locally right away)
# ---------------------------------------------------------------------------
step "8/9 project sync"
mkdir -p "$PROJECT_DIR"
chown "$U":"$U" "$PROJECT_DIR"
if timeout 5 ls -A "$MNT" >/dev/null 2>&1; then
    info "pulling project to guest disk (first copy, may take a minute)..."
    rsync -a --update \
        --exclude='.git/' --exclude='node_modules/' --exclude='.next/' \
        --exclude='__pycache__/' --exclude='.cache/' --exclude='*.rpm' \
        --exclude='.Trash-1000/' --exclude='coverage/' --exclude='.vercel/' \
        --exclude='graphify-out/' --exclude='offline-cache/' --exclude='vendor/' \
        --exclude='tsconfig.tsbuildinfo' \
        "$MNT/" "$PROJECT_DIR/" 2>&1 | tail -2 || warn "initial pull had errors"
    chown -R "$U":"$U" "$PROJECT_DIR"
    ok "project pulled ($(find "$PROJECT_DIR" -maxdepth 1 -mindepth 1 | wc -l) top-level items)"
else
    warn "share unavailable -- project will pull on first boot"
fi

# ---------------------------------------------------------------------------
# 9. GUEST CLEANUP: everything transient removed so the snapshot is pristine
# ---------------------------------------------------------------------------
step "9/9 cleanup"
rm -f /tmp/Trae-linux-x64.rpm "$MNT/Trae-linux-x64.rpm" 2>/dev/null || true
rm -f "$REAL_HOME/.cache/trae-install/Trae-linux-x64.rpm" 2>/dev/null || true
rm -f "$REAL_HOME/.bash_history" 2>/dev/null || true
dnf clean all >/dev/null 2>&1 || true
journalctl --vacuum-size=5M >/dev/null 2>&1 || true
rm -f /var/log/bake-golden.log /var/log/sandbox-autostart.log 2>/dev/null || true
: > /var/log/wtmp 2>/dev/null || true
rm -rf "$REAL_HOME/.cache/Trae/Crashpad" 2>/dev/null || true
ok "guest cleaned"

echo
echo "============================================================"
echo "  BAKE COMPLETE"
echo "============================================================"
echo "  User      : $U"
echo "  Trae      : $TRAE_BIN"
echo "  Project   : $PROJECT_DIR (pulled from share)"
echo "  Share     : $MNT"
echo
echo "  NEXT STEPS (do exactly this):"
echo "   1. Close Trae if it opened."
echo "   2. SHUT DOWN the VM (not reboot)."
echo "   3. On Windows, double-click:  rebase-golden.ps1"
echo "      -> this re-takes the 'golden' snapshot."
echo "   4. From now on, double-click 'Launch Trae Sandbox' on the"
echo "      Windows desktop every session. That's it."
echo "============================================================"
exit 0
