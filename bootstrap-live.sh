#!/bin/bash
# Bootstrap from Fedora Live: install to disk + bake golden image
set -e
LOG=/tmp/bootstrap.log
exec > >(tee $LOG) 2>&1

echo "=== [1/6] mount shared folder ==="
sudo mkdir -p /mnt/FinancialMarket
sudo mount -t vboxsf -o uid=$(id -u),gid=$(id -g) FinancialMarket /mnt/FinancialMarket 2>/dev/null || \
  echo "vboxsf not available on Live - will use HTTP"

echo "=== [2/6] download install scripts ==="
cd /tmp
curl -sf -o bake-golden.sh http://10.0.2.2:8080/bake-golden.sh || echo "curl bake failed"
curl -sf -o autostart-trae.sh http://10.0.2.2:8080/autostart-trae.sh || echo "curl autostart failed"
curl -sf -o bidirectional-sync.sh http://10.0.2.2:8080/bidirectional-sync.sh || echo "curl sync failed"
ls -la /tmp/*.sh 2>/dev/null

echo "=== [3/6] check network ==="
curl -s -o /dev/null -w "host reachable: %{http_code}\n" http://10.0.2.2:8080/bake-golden.sh
curl -s -o /dev/null -w "internet: %{http_code}\n" https://www.google.com 2>&1 || echo "no internet"

echo "=== [4/6] install to disk? This requires anaconda ==="
echo "NOTE: Full install requires running 'Install to Hard Drive' from the desktop"
echo "This script prepares the files for after install."

echo "=== DONE. Files ready in /tmp ==="
echo "Next: after Fedora installed, run: sudo bash /tmp/bake-golden.sh"
