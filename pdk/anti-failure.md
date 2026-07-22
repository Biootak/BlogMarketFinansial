# چک‌لیست ضد شکست (Anti-Failure)

> قبل از گفتن «تمام» — بر اساس سطح تسک (Trivial/Standard/Full از AGENTS.md).

---

## همیشه (هر تسک)

- [ ] `npx tsc --noEmit` بدون خطا
- [ ] هیچ `any` / `TODO` / `placeholder` / `console.log` در production
- [ ] API shape: `{success,data}` یا `{success:false,error:{code,msg}}`
- [ ] RTL / logical properties (هیچ `left`/`right` سخت‌کد)
- [ ] Prisma: فقط `@/lib/db` — revalidateTag: فقط `@/lib/revalidate`

---

## اگر کد مالی / endpoint دارد

- [ ] Zod validation روی همه ورودی
- [ ] auth + RBAC بررسی شد (`requirePermission`)
- [ ] rate-limit تنظیم شده
- [ ] idempotencyKey برای عملیات مالی
- [ ] LedgerEntry ایجاد شد (نه بروزرسانی مستقیم balance)
- [ ] `AuditLog` ثبت شد

---

## اگر UI دارد

- [ ] `src/components/ui/*` — بدون کامپوننت تکراری
- [ ] state‌های loading / error / empty / success پیاده شد
- [ ] responsive (موبایل + دسکتاپ) تست شد
- [ ] a11y: focus visible، aria label، کنتراست
- [ ] design-cycle.md طی شد (≥3 جهت) + روبربر Anti-Slop رد شد

---

## سناریوهای خطرناک — چک مضاعف

| سناریو | چک |
|--------|-----|
| تغییر نقش/مجوز کاربر | AuditLog + RBAC middleware |
| تراکنش مالی | idempotencyKey + LedgerEntry + rollback |
| KYC approve/reject | KycVerification.status + Customer.kycLevel + AuditLog |
| فریز حساب | FintechAccount.status + AuditLog |
| migration | additive + rollback plan + بکاپ |
| صفحه با داده صرافی | `exchangeId` filter (tenant isolation) |
| اقدام destructive در UI | تأیید دو مرحله‌ای + toast واضح |
