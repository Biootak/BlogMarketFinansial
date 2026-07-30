#!/usr/bin/env bash
# diagnose-share.sh -- find out WHY /mnt/hgfs/FinancialMarket is unreadable.
# Run in the Fedora guest:  sudo bash diagnose-share.sh
# Prints a compact report; does not change anything except unmounting a dead mount.

MOUNT_DIR="/mnt/hgfs/FinancialMarket"
line() { printf '%s\n' "----------------------------------------------------------"; }

line; echo "1. Identity / SELinux"
id
echo "getenforce: $(getenforce 2>/dev/null || echo 'n/a')"

line; echo "2. open-vm-tools / vmtoolsd"
rpm -q open-vm-tools 2>/dev/null || echo "open-vm-tools NOT installed"
systemctl is-active vmtoolsd 2>/dev/null || true
vmware-toolbox-cmd -v 2>/dev/null || echo "vmware-toolbox-cmd missing"
echo "HGFS shares visible to tools:"
vmware-hgfsclient 2>/dev/null || echo "  (vmware-hgfsclient returned nothing -> host share not visible)"

line; echo "3. Mount state"
mount | grep -i hgfs || echo "  no hgfs mount"
stat -c '%n mode=%a owner=%U:%G type=%F' /mnt /mnt/hgfs "$MOUNT_DIR" 2>&1

line; echo "4. Read test as root"
if timeout 3 ls -la "$MOUNT_DIR" >/tmp/hgfs-ls.txt 2>/tmp/hgfs-ls.err; then
    head -5 /tmp/hgfs-ls.txt
else
    echo "  FAILED: $(cat /tmp/hgfs-ls.err)"
fi
echo "read start-installed.sh:"
timeout 3 head -c 60 "$MOUNT_DIR/start-installed.sh" 2>&1 | head -3

line; echo "5. fuse.conf"
cat /etc/fuse.conf 2>/dev/null || echo "  /etc/fuse.conf missing"

line; echo "6. Recent SELinux denials (last 5 min)"
if command -v ausearch >/dev/null 2>&1; then
    ausearch -m avc -ts recent 2>/dev/null | tail -30 || echo "  none"
else
    journalctl -k --since "5 min ago" 2>/dev/null | grep -i -m 10 avc || echo "  none"
fi

line; echo "7. Clean remount attempt (allow_other + root owner)"
umount -l "$MOUNT_DIR" 2>/dev/null
mkdir -p "$MOUNT_DIR"
chmod 755 "$MOUNT_DIR"
grep -qs '^[[:space:]]*user_allow_other' /etc/fuse.conf 2>/dev/null || echo 'user_allow_other' >>/etc/fuse.conf
if /usr/bin/vmhgfs-fuse .host:/FinancialMarket "$MOUNT_DIR" -o allow_other,umask=022 2>&1; then
    sleep 1
    if timeout 3 ls "$MOUNT_DIR" >/dev/null 2>&1; then
        echo "  RESULT: mount is now READABLE"
    else
        echo "  RESULT: mounted but STILL unreadable"
    fi
else
    echo "  RESULT: mount command failed"
fi

line; echo "Done. Send this whole output back."
