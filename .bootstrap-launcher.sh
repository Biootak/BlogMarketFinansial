#!/usr/bin/env bash
# .bootstrap-launcher.sh -- self-contained bootstrap that does NOT depend on
# the shared folder being mounted yet. Installs open-vm-tools, mounts the
# shared folder, then runs the full start-vmware.sh.
# Designed to be launched via: vmrun runProgramInGuest ... /bin/bash /tmp/.bootstrap-launcher.sh
set -x

LOG=/tmp/bootstrap-launcher.log
exec >"$LOG" 2>&1

# 1. open-vm-tools (may already be installed from kickstart)
if ! rpm -q open-vm-tools >/dev/null 2>&1; then
    dnf install -y open-vm-tools 2>&1 || true
fi
systemctl enable --now vmtoolsd 2>&1 || true
sleep 3

# 2. Mount the shared folder
mkdir -p /mnt/hgfs/FinancialMarket
mount -t fuse.vmhgfs-fuse -o allow_other,uid=1000,gid=1000 .host:/FinancialMarket /mnt/hgfs/FinancialMarket 2>&1 || true
sleep 1

# 3. Run the real bootstrap as the desktop user (UID 1000 = liveuser)
if [ -f /mnt/hgfs/FinancialMarket/start-vmware.sh ]; then
    su -l liveuser -c 'bash /mnt/hgfs/FinancialMarket/start-vmware.sh' 2>&1
else
    echo "ERROR: start-vmware.sh not found on shared folder"
    ls -la /mnt/hgfs/ 2>&1 || true
fi
