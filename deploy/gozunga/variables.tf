variable "instance_name" {
  description = "نام instance در پورتال گوزونگا"
  type        = string
  default     = "fm-blog-prod"
}

variable "image_name" {
  description = "تصویر سیستم‌عامل (برای پایداری می‌توانی image_id بگذاری)"
  type        = string
  default     = "ubuntu-26.04"
}

variable "flavor_name" {
  description = "سایز instance — gp.small1 = 2 vCPU / 4GB / 100GB SSD"
  type        = string
  default     = "gp.small1"
}

variable "key_pair" {
  description = "نام SSH key که قبلاً در پورتال آپلود کرده‌ای (Portal → Compute → Key Pairs)"
  type        = string
}

variable "network_name" {
  description = "شبکهٔ عمومی گوزونگا — در مثال رسمی «Internet» است"
  type        = string
  default     = "Internet"
}

variable "db_volume_size_gb" {
  description = "حجم بلوکی جدا برای داده‌های Postgres — با حذف instance از بین نمی‌رود"
  type        = number
  default     = 20
}

variable "ssh_allowed_cidr" {
  description = "محدودهٔ IP مجاز برای SSH (برای امنیت بهتر یک IP ثابت بده)"
  type        = string
  default     = "0.0.0.0/0"
}

variable "backup_object_container" {
  description = "نام کانتینر/باکت Object Storage برای بکاپ‌ها (باید دستی ساخته شود)"
  type        = string
  default     = "fm-blog-backups"
}
