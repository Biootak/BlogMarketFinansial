#!/usr/bin/env bash
# optimize-guest.sh -- remove GUI lag inside the Fedora VMware guest.
#
# Run once after the host-side fix-vm-performance.ps1:
#     sudo bash /mnt/hgfs/FinancialMarket/optimize-guest.sh
#
# What it does (all reversible, all idempotent):
#   1. Installs the VMware 3D userspace stack (mesa-dri-drivers, glx-utils).
#   2. Reports the active renderer so you can tell SVGA3D from llvmpipe.
#   3. Disables GNOME animations and the tracker indexers.
#   4. Tunes swappiness / dirty ratios for a VM on an SSD.
#   5. Enables zram so memory pressure compresses instead of stalling.
#   6. Disables the services that cause periodic freezes in a VM
#      (fstrim timer, packagekit, abrt, fwupd-refresh).
#   7. Adds Electron flags so Trae uses the GPU path.

set -uo pipefail

RED='\e[31m'; GREEN='\e[32m'; YELLOW='\e[33m'; BLUE='\e[34m'; BOLD='\e[1m'; NC='\e[0m'
ok()   { echo -e "${GREEN}[OK]${NC}    $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC}  $*"; }
info() { echo -e "${BLUE}[INFO]${NC}  $*"; }
step() { echo; echo -e "${BOLD}${BLUE}==> $*${NC}"; }

if [[ $EUID -ne 0 ]]; then
    exec sudo -- bash "$0" "$@"
fi

REAL_USER="${SUDO_USER:-$(logname 2>/dev/null || who | awk 'NR==1{print $1}')}"
if [[ -z "$REAL_USER" || "$REAL_USER" == "root" ]]; then
    echo "ERROR: cannot identify the desktop user. Run: sudo SUDO_USER=<you> bash $0"
    exit 1
fi
REAL_UID=$(id -u "$REAL_USER")
REAL_HOME=$(getent passwd "$REAL_USER" | cut -d: -f6)
RUNTIME_DIR="/run/user/$REAL_UID"
DBUS_ADDR="unix:path=$RUNTIME_DIR/bus"

as_user() {
    sudo -u "$REAL_USER" env \
        XDG_RUNTIME_DIR="$RUNTIME_DIR" \
        DBUS_SESSION_BUS_ADDRESS="$DBUS_ADDR" \
        HOME="$REAL_HOME" "$@"
}

# ============================================================================
# 1. VMware 3D userspace stack
# ============================================================================
step "3D drivers"
PKGS=()
rpm -q mesa-dri-drivers      &>/dev/null || PKGS+=(mesa-dri-drivers)
rpm -q mesa-vulkan-drivers   &>/dev/null || PKGS+=(mesa-vulkan-drivers)
rpm -q glx-utils             &>/dev/null || PKGS+=(glx-utils)
rpm -q open-vm-tools-desktop &>/dev/null || PKGS+=(open-vm-tools-desktop)

if ((${#PKGS[@]})); then
    info "Installing: ${PKGS[*]}"
    dnf install -y "${PKGS[@]}" >/dev/null 2>&1 && ok "Installed." || warn "Some packages failed."
else
    ok "Already present."
fi

if lsmod | grep -q '^vmwgfx'; then
    ok "vmwgfx kernel module loaded."
else
    warn "vmwgfx NOT loaded -- host 3D is probably still disabled (mks.enable3d)."
fi

# ============================================================================
# 2. Renderer report
# ============================================================================
step "Renderer check"
if command -v glxinfo &>/dev/null; then
    RENDERER=$(as_user glxinfo -B 2>/dev/null | sed -n 's/^OpenGL renderer string: //p')
    if [[ -z "$RENDERER" ]]; then
        warn "Could not query GL (no active X/Wayland session?)."
    elif [[ "$RENDERER" == *llvmpipe* || "$RENDERER" == *softpipe* ]]; then
        warn "Software rendering active: $RENDERER"
        warn "Power off the VM and run fix-vm-performance.ps1 on the host."
    else
        ok "Hardware renderer: $RENDERER"
    fi
else
    warn "glxinfo unavailable."
fi

# ============================================================================
# 3. GNOME: animations off, indexers off
# ============================================================================
step "GNOME tuning"
if [[ -d "$RUNTIME_DIR" ]]; then
    as_user gsettings set org.gnome.desktop.interface enable-animations false 2>/dev/null || true
    as_user gsettings set org.gnome.desktop.search-providers disable-external true 2>/dev/null || true
    as_user gsettings set org.gnome.desktop.privacy remember-recent-files false 2>/dev/null || true
    as_user gsettings set org.gnome.mutter check-alive-timeout 20000 2>/dev/null || true

    for svc in tracker-miner-fs-3 tracker-extract-3 tracker-miner-rss-3 \
               tracker-miner-fs-control-3 evolution-addressbook-factory \
               evolution-calendar-factory; do
        as_user systemctl --user mask "${svc}.service" 2>/dev/null || true
        as_user systemctl --user stop "${svc}.service" 2>/dev/null || true
    done
    ok "Animations off, trackers masked."
else
    warn "No user session at $RUNTIME_DIR -- log in to the desktop and rerun."
fi

# ============================================================================
# 4. Kernel VM tuning (SSD-backed guest)
# ============================================================================
step "Kernel tuning"
cat >/etc/sysctl.d/99-vm-desktop.conf <<'EOF'
# Tuned for a VMware guest on an SSD with zram swap.
vm.swappiness = 10
vm.vfs_cache_pressure = 50
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5
vm.max_map_count = 262144
fs.inotify.max_user_watches = 524288
fs.inotify.max_user_instances = 1024
EOF
sysctl --system >/dev/null 2>&1 && ok "sysctl applied." || warn "sysctl reload failed."

# ============================================================================
# 5. Zram swap
# ============================================================================
step "Zram swap"
if swapon --show 2>/dev/null | grep -q zram; then
    ok "Zram already active."
else
    if rpm -q zram-generator-defaults &>/dev/null || rpm -q zram-generator &>/dev/null; then
        mkdir -p /etc/systemd
        cat >/etc/systemd/zram-generator.conf <<'EOF'
[zram0]
zram-size = min(ram / 2, 4096)
compression-algorithm = zstd
EOF
        systemctl daemon-reload 2>/dev/null || true
        systemctl restart systemd-zram-setup@zram0.service 2>/dev/null || true
    else
        ZRAM_MB=$(awk '/MemTotal/{v=int($2/2/1024); print (v>4096?4096:v)}' /proc/meminfo)
        modprobe zram 2>/dev/null || true
        echo zstd >/sys/block/zram0/comp_algorithm 2>/dev/null || true
        echo "${ZRAM_MB}M" >/sys/block/zram0/disksize 2>/dev/null || true
        mkswap /dev/zram0 >/dev/null 2>&1 || true
        swapon -p 100 /dev/zram0 2>/dev/null || true
    fi
    swapon --show 2>/dev/null | grep -q zram && ok "Zram enabled." || warn "Zram not enabled."
fi

# ============================================================================
# 6. Services that stall a VM
# ============================================================================
step "Background services"
for unit in fstrim.timer packagekit.service abrt-journal-core.service \
            abrtd.service fwupd-refresh.timer dnf-makecache.timer \
            NetworkManager-wait-online.service; do
    systemctl disable --now "$unit" 2>/dev/null && info "disabled $unit" || true
done
ok "Periodic stall sources disabled."

# ============================================================================
# 7. Electron/Trae GPU flags
# ============================================================================
step "Electron flags for Trae"
CONF_DIR="$REAL_HOME/.config"
mkdir -p "$CONF_DIR"
cat >"$CONF_DIR/trae-flags.conf" <<'EOF'
--enable-gpu-rasterization
--enable-zero-copy
--ignore-gpu-blocklist
--disable-features=CalculateNativeWinOcclusion
--disable-dev-shm-usage
EOF
cat >"$CONF_DIR/electron-flags.conf" <<'EOF'
--enable-gpu-rasterization
--enable-zero-copy
--ignore-gpu-blocklist
EOF
chown -R "$REAL_USER":"$REAL_USER" "$CONF_DIR/trae-flags.conf" "$CONF_DIR/electron-flags.conf"
ok "Wrote trae-flags.conf and electron-flags.conf."

# ============================================================================
# Summary
# ============================================================================
echo
echo -e "${BOLD}${GREEN}======================================================"
echo "  Guest tuning complete."
echo -e "======================================================${NC}"
echo
echo "Memory:"
free -h | sed 's/^/  /'
echo
echo "Swap:"
swapon --show 2>/dev/null | sed 's/^/  /' || echo "  none"
echo
echo -e "${BOLD}Do this now:${NC}"
echo "  1. Log out."
echo "  2. At the login screen, click the gear icon and choose 'GNOME on Xorg'."
echo "     VMware's 3D driver is noticeably faster on Xorg than on Wayland."
echo "  3. Log back in and start Trae:  sudo start-trae"
echo
