#!/usr/bin/env bash
# bidirectional-sync.sh -- FAST two-way sync: guest disk <-> VMware share
# ============================================================================
# WHY THIS IS FAST:
#   - Trae works on the GUEST DISK (/home/alinovin/FinancialMarket, XFS)
#     because vmhgfs-fuse is 40-110x slower for writes and has a 5s
#     attribute cache that corrupts .git indexes.
#   - This daemon only syncs CHANGES (rsync --update = mtime+size compare,
#     no full reads, no checksums). Typical pass on a dev tree: < 1 second.
#   - Polls every 10s (not 15/30) so edits propagate almost instantly.
#
# NO INTERNET USED: everything happens over the local VMware share.
#
# SAFETY:
#   - "newest mtime wins" both directions (--update).
#   - --delete is ONLY used host->guest when the share is confirmed
#     readable AND non-empty (guards against wiping the project if the
#     share is ever momentarily empty/unmounted).
#   - guest->host never uses --delete (Windows copy is the safe archive).
#
# INSTALL:  copied to /home/<user>/bidirectional-sync.sh by bake-golden.sh
#           and enabled as a systemd USER service (auto-start at login).
# MANUAL:   systemctl --user start bidirectional-sync
# LOGS:     journalctl --user -u bidirectional-sync -f
# ============================================================================

set -uo pipefail

SYNC_INTERVAL="${SYNC_INTERVAL:-10}"

# Resolve real user/home (works whether launched by systemd --user, autostart, or root)
U="$(id -un)"
if [[ "$U" == "root" ]]; then
    U="$(logname 2>/dev/null || echo alinovin)"
fi
REAL_HOME="$(getent passwd "$U" | cut -d: -f6)"
[[ -z "$REAL_HOME" ]] && REAL_HOME="/home/$U"

SHARE_NAME="FinancialMarket"
MNT="/mnt/$SHARE_NAME"
LOCAL="$REAL_HOME/$SHARE_NAME"

# Excludes: platform/large dirs that must NOT cross-sync.
EXCLUDES=(
    --exclude='.git/'
    --exclude='node_modules/'
    --exclude='.next/'
    --exclude='__pycache__/'
    --exclude='.cache/'
    --exclude='*.rpm'
    --exclude='.Trash-1000/'
    --exclude='coverage/'
    --exclude='.vercel/'
    --exclude='graphify-out/'
    --exclude='offline-cache/'
    --exclude='vendor/'
    --exclude='tsconfig.tsbuildinfo'
)

log() { logger -t bidir-sync "$*"; }

# ---------------------------------------------------------------------------
# Mount/share health helpers
# ---------------------------------------------------------------------------
layers() { awk -v d="$MNT" '$2 == d { n++ } END { print n+0 }' /proc/self/mounts; }

share_nonempty() { [[ -n "$(ls -A "$MNT" 2>/dev/null | head -1)" ]]; }

share_ok() { timeout 5 ls -A "$MNT" >/dev/null 2>&1; }

ensure_mount() {
    if share_ok && share_nonempty; then
        return 0
    fi
    # Unstack dead layers then remount (needs root; sudo is NOPASSWD on this image)
    sudo -n bash -c '
        set -e
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
        sleep 1
    ' 2>/dev/null || return 1
    sleep 1
    share_ok
}

# ---------------------------------------------------------------------------
# One-shot full pull (host -> guest), used when local copy is empty/missing
# ---------------------------------------------------------------------------
initial_pull() {
    log "initial pull host->guest"
    local extra=()
    if share_ok && share_nonempty; then
        extra+=(--delete)
    fi
    if rsync -a --update "${EXCLUDES[@]}" "${extra[@]}" "$MNT/" "$LOCAL/" 2>/dev/null; then
        chown -R "$U":"$U" "$LOCAL" 2>/dev/null || true
        log "initial pull done"
        return 0
    else
        log "WARN: initial pull failed (share unavailable?)"
        return 1
    fi
}

# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------
mkdir -p "$LOCAL"
chown "$U":"$U" "$LOCAL" 2>/dev/null || true

# Wait up to ~90s for the share at startup (vmtoolsd may still be registering)
for i in $(seq 1 18); do
    ensure_mount && break
    sleep 5
done

if ! share_ok; then
    log "share unavailable after retries -- will retry in-loop every 30s"
else
    log "share ready: $MNT -> $LOCAL"
    if [[ -z "$(ls -A "$LOCAL" 2>/dev/null | head -1)" ]]; then
        initial_pull || true
    fi
fi

log "sync loop started (interval ${SYNC_INTERVAL}s)"

while true; do
    if ! share_ok; then
        log "share lost; remounting..."
        ensure_mount || { sleep 30; continue; }
    fi

    # A) host -> guest: pick up Windows-side edits (--delete only if share has content)
    if share_ok && share_nonempty; then
        rsync -a --update --delete "${EXCLUDES[@]}" "$MNT/" "$LOCAL/" 2>/dev/null || true
    fi

    # B) guest -> host: push Trae/VM edits back to Windows (never --delete)
    rsync -a --update "${EXCLUDES[@]}" "$LOCAL/" "$MNT/" 2>/dev/null || true

    sleep "$SYNC_INTERVAL"
done
