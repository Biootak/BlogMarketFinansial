#!/usr/bin/env bash
# autostart-trae.sh -- the ONLY thing that runs at every login
# ============================================================================
# 1. Mounts the VMware share cleanly (via sudo -n, NOPASSWD is baked in)
# 2. Ensures the project is synced to guest disk
# 3. Starts the bidirectional sync daemon (systemd --user)
# 4. Launches Trae on the guest-disk copy (FAST)
#
# NO INTERNET. NO re-install. NO passwords. Runs from the desktop session
# so SELinux context and display env are correct (vmrun can't do this).
#
# Invocations that all work:
#   bash /home/alinovin/autostart-trae.sh        (from desktop terminal)
#   sudo bash /home/alinovin/autostart-trae.sh   (from desktop terminal)
#   GNOME autostart (.desktop) at every login    (automatic)
# ============================================================================

set -uo pipefail

U="alinovin"
REAL_HOME="/home/$U"
SHARE="FinancialMarket"
MNT="/mnt/$SHARE"
PROJECT_DIR="$REAL_HOME/$SHARE"
LOG="/var/log/sandbox-autostart.log"
SYNC_SVC="bidirectional-sync.service"

log() { echo "[$(date '+%H:%M:%S')] $*" | tee -a "$LOG"; }
err() { echo "[$(date '+%H:%M:%S')] ERROR: $*" | tee -a "$LOG"; }

# ---------------------------------------------------------------------------
# 0. If invoked via sudo (root), re-derive the graphical session env from the
#    real user's processes. If invoked as the user, env is already intact.
# ---------------------------------------------------------------------------
IS_ROOT=false
if [[ "$EUID" -eq 0 ]]; then
    IS_ROOT=true
    export HOME="$REAL_HOME"
    if [[ -z "${DISPLAY:-}${WAYLAND_DISPLAY:-}" ]]; then
        RUNTIME_DIR="/run/user/$(id -u "$U")"
        for pid in $(pgrep -u "$U" -x gnome-shell 2>/dev/null) \
                   $(pgrep -u "$U" -x gnome-session-binary 2>/dev/null) \
                   $(pgrep -u "$U" -x plasmashell 2>/dev/null); do
            eval "$(tr '\0' '\n' <"/proc/$pid/environ" 2>/dev/null | grep -E '^(DISPLAY|WAYLAND_DISPLAY|DBUS_SESSION_BUS_ADDRESS|XDG_RUNTIME_DIR)=' | head -4)"
            [[ -n "${WAYLAND_DISPLAY:-}${DISPLAY:-}" ]] && break
        done
        export DISPLAY="${DISPLAY:-:0}"
        export WAYLAND_DISPLAY="${WAYLAND_DISPLAY:-wayland-0}"
        export DBUS_SESSION_BUS_ADDRESS="${DBUS_SESSION_BUS_ADDRESS:-unix:path=$RUNTIME_DIR/bus}"
        export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-$RUNTIME_DIR}"
    fi
fi

as_user() {
    if $IS_ROOT; then
        sudo -u "$U" env \
            HOME="$REAL_HOME" \
            DISPLAY="$DISPLAY" \
            WAYLAND_DISPLAY="${WAYLAND_DISPLAY:-}" \
            DBUS_SESSION_BUS_ADDRESS="$DBUS_SESSION_BUS_ADDRESS" \
            XDG_RUNTIME_DIR="$XDG_RUNTIME_DIR" "$@"
    else
        "$@"
    fi
}

log "=== autostart-trae ==="
log "euid=$EUID display=${WAYLAND_DISPLAY:-$DISPLAY:-none}"

# ---------------------------------------------------------------------------
# 1. Ensure share is mounted (root op via NOPASSWD sudo)
# ---------------------------------------------------------------------------
if [[ ! -d "$MNT" ]] || ! timeout 5 ls -A "$MNT" >/dev/null 2>&1; then
    log "mounting share..."
    sudo -n bash -c '
        MNT=/mnt/FinancialMarket
        d=$(awk -v m="$MNT" '\''$2==m{n++}END{print n+0}'\'' /proc/self/mounts)
        fuser -km "$MNT" 2>/dev/null || true
        for i in $(seq 1 30); do
            n=$(awk -v m="$MNT" '\''$2==m{n++}END{print n+0}'\'' /proc/self/mounts)
            [[ "$n" -eq 0 ]] && break
            fusermount3 -u "$MNT" 2>/dev/null || umount -f "$MNT" 2>/dev/null || umount -l "$MNT" 2>/dev/null || true
            sleep 0.4
        done
        mkdir -p "$MNT"; chmod 755 "$MNT"
        UID_R=$(id -u alinovin); GID_R=$(id -g alinovin)
        /usr/bin/vmhgfs-fuse ".host:/FinancialMarket" "$MNT" \
            -o allow_other,uid="$UID_R",gid="$GID_R",umask=022 \
            || /usr/bin/vmhgfs-fuse ".host:/FinancialMarket" "$MNT" -o allow_other,umask=022 \
            || exit 1
    ' 2>/dev/null || err "mount failed (retrying via sync daemon later)"
fi

# Wait for readability (vmtoolsd may need a moment)
for i in $(seq 1 12); do
    timeout 5 ls -A "$MNT" >/dev/null 2>&1 && break
    sleep 5
done

if timeout 5 ls -A "$MNT" >/dev/null 2>&1; then
    log "share ready"
else
    err "share unreadable -- Trae will still open (sync daemon will retry mount)"
fi

# ---------------------------------------------------------------------------
# 2. Project dir on guest disk
# ---------------------------------------------------------------------------
mkdir -p "$PROJECT_DIR"
chown "$U":"$U" "$PROJECT_DIR" 2>/dev/null || true

# ---------------------------------------------------------------------------
# 3. Start bidirectional sync daemon (systemd user service, auto-start enabled)
# ---------------------------------------------------------------------------
if as_user systemctl --user start "$SYNC_SVC" 2>/dev/null; then
    log "sync daemon started ($SYNC_SVC)"
else
    log "WARN: could not start $SYNC_SVC -- falling back to direct launch"
    as_user bash "$REAL_HOME/bidirectional-sync.sh" >>"$LOG" 2>&1 &
    log "sync daemon launched directly (pid $!)"
fi

# ---------------------------------------------------------------------------
# 4. Zram swap (cheap, per-boot, no internet)
# ---------------------------------------------------------------------------
if ! swapon --show 2>/dev/null | grep -q zram; then
    ZRAM_MB=$(awk '/MemTotal/{print int($2/2/1024)}' /proc/meminfo)
    [[ $ZRAM_MB -gt 8192 ]] && ZRAM_MB=8192
    [[ $ZRAM_MB -lt 1024 ]] && ZRAM_MB=2048
    modprobe zram 2>/dev/null || true
    echo zstd > /sys/block/zram0/comp_algorithm 2>/dev/null || true
    echo "${ZRAM_MB}M" > /sys/block/zram0/disksize 2>/dev/null || true
    mkswap /dev/zram0 >/dev/null 2>&1 || true
    swapon -p 100 /dev/zram0 >/dev/null 2>&1 || true
    swapon --show 2>/dev/null | grep -q zram && log "zram ${ZRAM_MB}MB active" || log "zram skipped"
fi

# ---------------------------------------------------------------------------
# 5. Launch Trae (as the real user, on the guest-disk copy)
# ---------------------------------------------------------------------------
TRAE_BIN=""
for c in /usr/share/trae/trae /usr/bin/trae /opt/Trae/trae; do
    [[ -x "$c" ]] && TRAE_BIN="$c" && break
done
if [[ -z "$TRAE_BIN" ]]; then
    TRAE_BIN=$(command -v trae 2>/dev/null || true)
fi

if [[ -z "$TRAE_BIN" ]]; then
    err "Trae binary NOT FOUND. Run bake-golden.sh inside the VM once, then re-take the snapshot."
    exit 6
fi

if pgrep -u "$U" -f "$TRAE_BIN" >/dev/null 2>&1; then
    log "Trae already running -- not starting a second instance"
else
    if [[ -n "${WAYLAND_DISPLAY:-}" ]]; then
        OZONE="--ozone-platform=wayland"
    else
        OZONE="--ozone-platform=x11"
    fi
    log "launching Trae: $TRAE_BIN ($OZONE) on $PROJECT_DIR"
    as_user env NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=4096}" \
        "$TRAE_BIN" \
        --no-sandbox --disable-gpu-sandbox \
        $OZONE \
        --enable-gpu-rasterization --enable-zero-copy --ignore-gpu-blocklist \
        --disable-dev-shm-usage \
        "$PROJECT_DIR" >>"$LOG" 2>&1 &
    log "Trae launched (pid $!)"
fi

log "=== autostart-trae DONE ==="
exit 0
