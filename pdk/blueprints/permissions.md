# Blueprint — مدیریت مجوزها (Permissions)

**نقش:** ADMIN / SUPERADMIN  
**وظیفه اول:** «بدانم هر نقش چه کاری می‌تواند انجام دهد و این را تغییر دهم.»  
**مسیر:** `/dashboard/permissions`  
**مدل‌های DB:** `Permission`, `RolePermission`, `ExchangeStaff`

---

## Layout

```
┌─────────────────────────────────────────────┐
│ مجوزها         [+ افزودن مجوز]              │
├─────────────┬───────────────────────────────┤
│ تب: نقش‌های  │  جدول: KEY | توضیح | نقش‌ها  │
│ سیستم       │  [checkbox ماتریس]             │
│ تب: کارمند  │  [ذخیره تغییرات]               │
│ صرافی       │                               │
└─────────────┴───────────────────────────────┘
```

## بخش‌ها

### ۱. ماتریس نقش‌های سیستم
- جدول: ردیف = `Permission.key` | ستون = `Role` enum
- هر سلول: checkbox که نشان‌دهنده وجود `RolePermission` است
- نقش‌های قابل ویرایش: `CUSTOMER`, `MERCHANT`, `EXCHANGE`, `SUPPORT`, `ADMIN`
- نقش‌های read-only: `SUPERADMIN` (همه دسترسی‌ها)، `USER`/`AUTHOR` (ثابت)
- ذخیره batch: ثبت/حذف چند `RolePermission` در یک عملیات

### ۲. مجوزهای کارمند صرافی
- جدول `ExchangeStaff.permissions[]` برای هر صرافی
- فیلتر بر اساس Exchange
- نقش‌ها: `OWNER|MANAGER|STAFF|VIEWER`
- هر نقش template پیش‌فرض مجوزها دارد که قابل override است

### ۳. مدیریت کلیدهای مجوز (ADMIN فقط)
- لیست همه `Permission` با `key` و `description`
- افزودن مجوز جدید (با key استاندارد: `resource:action`)
- حذف مجوز بلااستفاده (بررسی referential integrity)

---

## Scenarios

| سناریو | اقدام |
|--------|-------|
| admin می‌خواهد SUPPORT به wallet دسترسی read بدهد | checkbox `wallet:read` برای SUPPORT → ✓ |
| صراف owner می‌خواهد staff نتواند quote تأیید کند | در تب کارمند صرافی، `quote:approve` را از STAFF بردار |
| مجوز جدید `report:export` اضافه شود | فرم افزودن → key: `report:export` → assign به ADMIN |
| بررسی دسترسی فعلی یک کاربر | از صفحه `/dashboard/users/[id]` — not here |

---

## States

- **Loading:** skeleton ماتریس
- **Unsaved changes:** نوار هشدار + دکمه «ذخیره / لغو»
- **Conflict:** «این مجوز در حال استفاده است» هنگام حذف
- **Success:** toast «تغییرات ذخیره شد»

---

## امنیت

- فقط `ADMIN` و `SUPERADMIN` دسترسی دارند — `requirePermission('permissions:manage')`
- هر تغییر در `AuditLog` ثبت می‌شود (before/after hash)
- تغییر دسته‌ای: idempotent + rollback در صورت خطا

---

## چک‌لیست طراحی

- [ ] ماتریس خوانا با تراکم مناسب (نه شلوغ)؟
- [ ] تغییرات unsaved واضح است؟
- [ ] عملیات destructive تأیید می‌خواهد؟
- [ ] RTL/فارسی برچسب‌ها درست است؟
