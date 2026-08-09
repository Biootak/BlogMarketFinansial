output "instance_name" {
  value = openstack_compute_instance_v2.web.name
}

output "instance_id" {
  value = openstack_compute_instance_v2.web.id
}

output "public_ip" {
  description = "IP عمومی سرور — برای SSH و تنظیم DNS"
  value       = openstack_compute_instance_v2.web.access_ip_v4
}

output "db_volume_id" {
  description = "ID حجم بلوکی دیتابیس — با حذف instance از بین نمی‌رود"
  value       = openstack_blockstorage_volume_v3.db.id
}

output "backup_object_container" {
  description = "باکت Object Storage برای بکاپ‌ها — باید از پورتال ساخته شود"
  value       = var.backup_object_container
}
