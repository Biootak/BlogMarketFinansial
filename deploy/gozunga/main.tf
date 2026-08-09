# ============================================================================
# Gozunga Cloud — زیرساخت اپ (بر اساس راهنمای رسمی OpenTofu گوزونگا)
# ----------------------------------------------------------------------------
#  - یک instance برای اپ Next.js + Postgres
#  - حجم بلوکی جدا برای دادهٔ دیتابیس (با حذف instance از بین نمی‌رود)
#  - security groups: SSH / HTTP / HTTPS
#  - استراتژی 3-2-1: بکاپ‌ها با scripts/backup-db.mjs به Object Storage
#    گوزونگا + یک مقصد خارج از پلتفرم آپلود می‌شوند (اینجا ساخته نمی‌شود —
#    باکتی که scripts/backup-db.mjs استفاده می‌کند را از پورتال بساز یا با
#    aws s3 mb؛ نامش را در variable.backup_object_container ببین).
#
# Credentials از متغیرهای OS_* می‌آیند (فایل openrc را source کن).
# ============================================================================

provider "openstack" {
  # از OS_* env ها می‌خواند — اینجا چیزی نمی‌نویسیم
}

# ── Security Groups ──────────────────────────────────────────────────────────

resource "openstack_networking_secgroup_v2" "ssh" {
  name        = "${var.instance_name}-ssh"
  description = "SSH access"
}

resource "openstack_networking_secgroup_rule_v2" "ssh_in" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 22
  port_range_max    = 22
  remote_ip_prefix  = var.ssh_allowed_cidr
  security_group_id = openstack_networking_secgroup_v2.ssh.id
}

resource "openstack_networking_secgroup_v2" "http" {
  name        = "${var.instance_name}-http"
  description = "HTTP/HTTPS access"
}

resource "openstack_networking_secgroup_rule_v2" "http_in" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 80
  port_range_max    = 80
  remote_ip_prefix  = "0.0.0.0/0"
  security_group_id = openstack_networking_secgroup_v2.http.id
}

resource "openstack_networking_secgroup_rule_v2" "https_in" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 443
  port_range_max    = 443
  remote_ip_prefix  = "0.0.0.0/0"
  security_group_id = openstack_networking_secgroup_v2.http.id
}

# ── Block Storage: حجم جدا برای دادهٔ Postgres ─────────────────────────────
# نکتهٔ راهنمای رسمی: «attach a persistent volume for database data, separate
# from the instance lifecycle» — این حجم با حذف instance پاک نمی‌شود.

resource "openstack_blockstorage_volume_v3" "db" {
  name        = "${var.instance_name}-db"
  description = "PostgreSQL data — persistent across instance rebuilds"
  size        = var.db_volume_size_gb
  volume_type = "performance" # یا "capacity" برای ارزان‌تر
}

# ── Compute Instance ─────────────────────────────────────────────────────────

resource "openstack_compute_instance_v2" "web" {
  name            = var.instance_name
  image_name      = var.image_name
  flavor_name     = var.flavor_name
  key_pair        = var.key_pair
  security_groups = [
    openstack_networking_secgroup_v2.ssh.name,
    openstack_networking_secgroup_v2.http.name,
  ]

  user_data = file("${path.module}/cloud-init/nextjs-postgres.yaml")

  network {
    name = var.network_name
  }
}

# اتصال حجم دیتابیس به instance
resource "openstack_compute_volume_attach_v2" "db" {
  instance_id = openstack_compute_instance_v2.web.id
  volume_id   = openstack_blockstorage_volume_v3.db.id
}
