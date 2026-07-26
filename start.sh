#!/usr/bin/env bash
# start.sh — single entry point for Fedora Live
# Usage: bash /mnt/FinancialMarket/start.sh

MOUNT_DIR="/mnt/FinancialMarket"

# Mount with fmode=0755 if not already mounted
if ! mountpoint -q "$MOUNT_DIR" 2>/dev/null; then
    echo "[INFO]  Mounting shared folder..."
    sudo mkdir -p "$MOUNT_DIR"
    sudo mount -t vboxsf -o uid=1000,gid=1000,fmode=0755,dmode=0755 FinancialMarket "$MOUNT_DIR" \
        || { echo "[FAIL]  Mount failed. Are Guest Additions installed?"; exit 1; }
fi

echo "[INFO]  Running guest-optimize.sh..."
bash "$MOUNT_DIR/guest-optimize.sh"

echo "[INFO]  Running fedora-live-setup.sh..."
bash "$MOUNT_DIR/fedora-live-setup.sh"
