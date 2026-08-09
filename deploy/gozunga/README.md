# Deploy روی گوزونگا Cloud با OpenTofu

زیرساخت کامل اپ روی [گوزونگا](https://gozunga.com) به‌صورت Infrastructure-as-Code،
بر اساس [راهنمای رسمی OpenTofu گوزونگا](https://gozunga.com/technical-guides-and-how-tos/infrastructure-as-code-on-gozunga-cloud-with-opentofu):

- **Instance** برای اپ Next.js + PostgreSQL (flavor قابل تغییر در `variables.tf`)
- **حجم بلوکی جدا** برای دادهٔ دیتابیس — با حذف instance از بین **نمی‌رود**
  (توصیهٔ رسمی: «attach a persistent volume for database data, separate from the instance lifecycle»)
- **Security Groups**: فقط SSH (۲۲) + HTTP (۸۰) + HTTPS (۴۴۳)
- **cloud-init** که در اولین بوت همهچیز را نصب و راه‌اندازی می‌کند
- **cron بکاپ شبانه** Postgres با آپلود به دو مقصد S3 (قانون 3-2-1)

اگر روزی کل اکانت/سرور حذف شد: کد و زیرساخت اینجاست (git + IaC) و دیتا در
بکاپ‌های S3 — با `tofu apply` دوباره بالا می‌آید.

---

## پیش‌نیازها

1. اکانت گوزونگا ([ثبت‌نام — ۱۰۰ دلار اعتبار رایگان](https://gozunga.com))
2. [OpenTofu](https://opentofu.org/docs/intro/install/) (یا Terraform — سینتکس یکی است)
3. SSH key آپلودشده در پورتال (Portal → Compute → Key Pairs)
4. Application Credentials از پورتال (Portal → Access → Application Credentials)

## راه‌اندازی

```bash
# ۱) credentials را آماده کن
cp example-openrc my-project.openrc
#    مقادیر را از پورتال (Access → Application Credentials) پر کن
source my-project.openrc

# ۲) متغیرها
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars          # حداقل key_pair (نام SSH key پورتال) را بده

# ۳) آدرس ریپو و شاخه را در cloud-init بگذار
nano cloud-init/nextjs-postgres.yaml   # خط‌های REPO_URL و BRANCH

# ۴) deploy
tofu init
tofu plan
tofu apply
```

بعد از `apply`، خروجی `public_ip` را ببین و:

```bash
# ۵) .env واقعی را بفرست (مقادیر Heroku قبلی یا مقادیر جدید)
scp .env ubuntu@<public_ip>:/var/www/fm-blog/.env

# ۶) دامنه را روی این IP بگذار (رکورد A در DNS)

# ۷) روی سرور: ری‌استارت اپ + SSL
ssh ubuntu@<public_ip>
systemctl restart fm-blog
certbot --nginx -d your-domain.com -d www.your-domain.com
```

> نکته: cloud-init یک `.env` پیش‌فرض با secretهای تولیدشده می‌سازد تا اپ در
> اولین بوت build شود؛ **حتماً** بعد از آن `.env` واقعی (با `NEXTAUTH_URL`،
> `CRON_SECRET`، `RESEND_API_KEY`، `AUTH_*` و `S3_*`) را جایگزین کن.

## بکاپ (قانون 3-2-1)

بکاپ واقعی Postgres هر شب ۰۳:۳۰ به‌صورت خودکار اجرا می‌شود
(`scripts/backup-db.mjs` در ریپو). متغیرهای S3 را در `.env` سرور تنظیم کن:

```bash
# مقصد ۱ — داخل گوزونگا (Object Storage — ۱۰۰GB رایگان)
S3_ENDPOINT=https://s3.<region>.gozunga.com
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_BACKUP_BUCKET=fm-blog-backups        # باکت خصوصی — از پورتال بساز

# مقصد ۲ — خارج از پلتفرم (مثلاً Backblaze B2) — حتی اگر اکانت گوزونگا حذف شود دیتا می‌ماند
BACKUP_S3_SECONDARY_ENDPOINT=https://s3.us-west-004.backblazeb2.com
BACKUP_S3_SECONDARY_ACCESS_KEY=...
BACKUP_S3_SECONDARY_SECRET_KEY=...
BACKUP_S3_SECONDARY_BUCKET=fm-blog-backups
```

ساخت باکت از پورتال یا با aws CLI:

```bash
aws --endpoint-url https://s3.<region>.gozunga.com s3 mb s3://fm-blog-backups
```

بازیابی دستی:

```bash
cd /var/www/fm-blog
node scripts/restore-db.mjs --list
node scripts/restore-db.mjs --file pg_2026-08-09_....dump --drop-first
```

## Disaster Recovery

سناریوی «سرور حذف شد»:

```bash
source my-project.openrc
tofu apply        # volume دیتابیس زنده است → دیتا سر جایش است
```

سناریوی «همه‌چیز از بین رفت» (اکانت هم حذف شد):

```bash
# ۱) سرور جدید: همین ریپو را clone کن و tofu apply بزن
# ۲) باکت بکاپ مقصد دوم (خارج از گوزونگا) هنوز هست
# ۳) .env را با credentials بکاپ پر کن و restore کن:
node scripts/restore-db.mjs --list
node scripts/restore-db.mjs --file <newest> --drop-first
# ۴) JSON backup اپ هم از S3_BACKUP_BUCKET بازیابی‌شدنی است (lib/backup.ts)
```

## ساختار

```
deploy/gozunga/
├── versions.tf                # پین نسخهٔ provider
├── variables.tf               # متغیرها (flavor، حجم دیتابیس، …)
├── main.tf                    # instance + volume + security groups
├── outputs.tf                 # public_ip و …
├── example-openrc             # قالب credentials (OpenStack)
├── terraform.tfvars.example   # قالب متغیرها
└── cloud-init/
    └── nextjs-postgres.yaml   # bootstrap اولین بوت
```

## نکات امنیتی

- `*.openrc` و `terraform.tfvars` را در git نگذار (به `.gitignore` اضافه کن).
- مقدار `ssh_allowed_cidr` را به IP خودت محدود کن.
- تغییر `AUTH_SECRET` همهٔ نشست‌ها را invalid می‌کند — بعد از مهاجرت کاربران دوباره login می‌کنند.
