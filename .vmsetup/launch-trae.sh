#!/usr/bin/env bash
# ============================================================================
#  launch-trae.sh -- Open the project in Trae. Installed as /usr/local/bin/dev
#
#  Usage:  dev            open the default project
#          dev <path>     open a specific directory
#
#  This is the per-session entry point. It is deliberately short: all the
#  heavy setup (packages, kernel limits, disk formatting) happened once in
#  provision.sh and is baked into the golden image, so nothing here downloads
#  or extracts anything.
# ============================================================================

set -euo pipefail

GREEN=$'\e[32m'; YELLOW=$'\e[33m'; CYAN=$'\e[36m'; RED=$'\e[31m'; BOLD=$'\e[1m'; NC=$'\e[0m'
ok()   { printf '%s[OK]%s    %s\n' "$GREEN"  "$NC" "$*"; }
info() { printf '%s[INFO]%s  %s\n' "$CYAN"   "$NC" "$*"; }
warn() { printf '%s[WARN]%s  %s\n' "$YELLOW" "$NC" "$*"; }
die()  { printf '%s[FAIL]%s  %s\n' "$RED"    "$NC" "$*" >&2; exit 1; }

DATA="/data"
PROJECT="${1:-$DATA/FinancialMarket}"

# ---------------------------------------------------------------------------
# Verify the persistent disk is actually mounted.
#
# fstab uses nofail so that a detached data disk cannot block boot. The
# tradeoff is that the mount can be silently absent, and /data would then be
# an empty directory on the throwaway system disk. Writing a session's work
# there would lose it on shutdown, so refuse to start instead.
# ---------------------------------------------------------------------------
if ! mountpoint -q "$DATA"; then
    warn "$DATA is not mounted. Attempting to mount it..."
    sudo mount "$DATA" 2>/dev/null || true
fi
mountpoint -q "$DATA" || die "$DATA is not mounted. Your work would be lost on shutdown. Check that the data disk is attached to this VM."

[[ -d "$PROJECT" ]] || die "Project not found: $PROJECT"

# ---------------------------------------------------------------------------
# Confirm the inotify limit survived into this boot.
#
# This is the setting that determines whether the AI sees the true state of
# your files. If it is at the stock 8192, the watcher will exhaust its budget
# on node_modules and the editor will start reading stale content.
# ---------------------------------------------------------------------------
WATCHES=$(cat /proc/sys/fs/inotify/max_user_watches 2>/dev/null || echo 0)
if [[ "$WATCHES" -lt 100000 ]]; then
    warn "inotify watches are only $WATCHES -- raising for this session."
    sudo sysctl -q fs.inotify.max_user_watches=1048576 2>/dev/null || true
    WATCHES=$(cat /proc/sys/fs/inotify/max_user_watches)
fi
ok "inotify watches: $WATCHES"

# ---------------------------------------------------------------------------
# Silence the "Getting code actions from 'TypeScript and JavaScript Language
# Features' (configure)" status message.
#
# That message appears whenever tsserver is asked for code actions on save
# (editor.codeActionsOnSave / source.fixAll / organizeImports). On a tree
# this large the TS server is slow, so the status bar sits on that message
# after every AI edit and it looks like an error. An EMPTY
# editor.codeActionsOnSave stops those on-save requests entirely (explicit
# quick-fixes the user invokes still work). jq is installed by provision.sh.
# Apply at launch so a session whose settings.json was reset self-heals.
# ---------------------------------------------------------------------------
SETTINGS_FILE="$HOME/.config/Trae/User/settings.json"
if command -v jq >/dev/null 2>&1 && [[ -f "$SETTINGS_FILE" ]]; then
    if ! jq -e 'has("editor.codeActionsOnSave")' "$SETTINGS_FILE" >/dev/null 2>&1; then
        # a && b && c || d: if the merge fails for any reason the || warn
        # keeps the whole chain non-fatal -- under set -euo pipefail a bare
        # top-level failure would abort the script BEFORE Trae launches,
        # which is the wrong failure mode for a cosmetic setting tweak.
        jq '. + {"editor.codeActionsOnSave": {}}' "$SETTINGS_FILE" > "$SETTINGS_FILE.tmp" 2>/dev/null \
            && mv "$SETTINGS_FILE.tmp" "$SETTINGS_FILE" 2>/dev/null \
            && info "Disabled code actions on save (silences TS status message)." \
            || warn "Could not apply the settings tweak (settings.json untouched)."
    fi
fi

# ---------------------------------------------------------------------------
# Report the 3D driver state.
#
# The host VMX sets mks.enable3d, and Fedora's kernel carries vmwgfx in-tree.
# When both are in place Electron gets real GPU rasterisation; when they are
# not, it falls back to software rendering and the UI feels sluggish. The old
# VirtualBox setup passed GPU flags while 3D was off at the hypervisor, which
# is why it never actually accelerated anything.
# ---------------------------------------------------------------------------
if lsmod | grep -q '^vmwgfx'; then
    ok "vmwgfx loaded -- hardware 3D available."
else
    warn "vmwgfx not loaded -- expect software rendering."
fi

# ---------------------------------------------------------------------------
# Session-scoped tuning. Cheap, and re-applied because a fresh clone boots
# with whatever the golden image had rather than whatever you last set.
# ---------------------------------------------------------------------------
if [[ -n "${DISPLAY:-}${WAYLAND_DISPLAY:-}" ]]; then
    gsettings set org.gnome.desktop.interface enable-animations false 2>/dev/null || true
    command -v powerprofilesctl >/dev/null 2>&1 && powerprofilesctl set performance 2>/dev/null || true
fi

# Node needs a larger heap than the default for a project of this size;
# next build in particular will OOM at the stock limit.
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=4096}"

# ---------------------------------------------------------------------------
# Locate the Trae binary. It is installed as an RPM, so it is on PATH; the
# fallbacks cover a manual install.
# ---------------------------------------------------------------------------
TRAE_BIN=""
for candidate in trae /usr/bin/trae /opt/Trae/trae /usr/share/trae/trae; do
    if command -v "$candidate" >/dev/null 2>&1; then TRAE_BIN=$(command -v "$candidate"); break; fi
    if [[ -x "$candidate" ]]; then TRAE_BIN="$candidate"; break; fi
done
[[ -n "$TRAE_BIN" ]] || die "Trae not found. Install it with: sudo dnf install /mnt/hgfs/hostshare/Trae-linux-x64.rpm"

# ---------------------------------------------------------------------------
# Ozone platform: Wayland is Fedora's default and performs better, but only
# if the session really is Wayland. Guessing wrong makes Electron fail to
# start, so detect rather than hardcode.
# ---------------------------------------------------------------------------
if [[ -n "${WAYLAND_DISPLAY:-}" ]]; then
    OZONE="--ozone-platform=wayland"
    info "Display: Wayland"
else
    OZONE="--ozone-platform=x11"
    info "Display: X11"
fi

printf '\n%s%s====================================================%s\n' "$BOLD" "$GREEN" "$NC"
printf '  Project   : %s\n' "$PROJECT"
printf '  Free RAM  : %s MB\n' "$(free -m | awk '/^Mem:/{print $7}')"
printf '  Disk free : %s\n' "$(df -h --output=avail "$DATA" | tail -1 | tr -d ' ')"
printf '%s%s====================================================%s\n\n' "$BOLD" "$GREEN" "$NC"

# --disable-dev-shm-usage: /dev/shm is small by default and Electron's shared
#   memory allocations can exhaust it, producing renderer crashes.
# --ignore-gpu-blocklist: the virtual GPU is on Chromium's blocklist, so
#   acceleration would otherwise be refused even though it works here.
exec "$TRAE_BIN" \
    $OZONE \
    --enable-gpu-rasterization \
    --enable-zero-copy \
    --ignore-gpu-blocklist \
    --disable-dev-shm-usage \
    "$PROJECT"
