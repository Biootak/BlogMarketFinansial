# بخش ۷ — قراردادهای API

## ۷.۱ شکل یکپارچه
```jsonc
// موفق
{ "success": true, "data": { ... } }
// خطا
{ "success": false, "error": { "code": "VALIDATION", "message": "..." } }
```

## ۷.۲ نسخه‌بندی و مسیر
- نسخه‌بندی: `/api/v1/...`.
- Route Handlers در `app/api/v1/.../route.ts`.
- Server Actions برای فرم‌های داخلی (بدون نسخه در URL).

## ۷.۳ کدهای خطای استاندارد
| code | معنی | وضعیت HTTP |
|------|------|------------|
| VALIDATION | ورودی نامعتبر | 400 |
| UNAUTHENTICATED | نیاز به ورود | 401 |
| FORBIDDEN | دسترسی ندارد | 403 |
| NOT_FOUND | یافت نشد | 404 |
| RATE_LIMITED | محدودیت نرخ | 429 |
| CONFLICT | تداخل (idempotency/تراکنش) | 409 |
| INTERNAL | خطای داخلی | 500 |

## ۷.۴ Idempotency
- header `Idempotency-Key` برای عملیات مالی.
- مقدار در Redis با نتیجه کش شود (TTL معقول).
- درخواست تکراری → بازگشت نتیجه قبلی (نه تراکنش دوبل).

## ۷.۵ Rate limit
- سه لایه: IP، کاربر، endpoint حساس.
- پاسخ ۴۲۹ + `Retry-After`.
- اعمال در endpointهای: ورود، انتقال، تغییر تنظیمات، webhook.

## ۷.۶ اعتبارسنجی و مستندسازی
- همه ورودی با Zod.
- مستندسازی OpenAPI (اجباری پس از MVP).
- هیچ داده حساس در پاسخ خطا/لاگ (masking).
- pagination یکپارچه: `?cursor=` یا `?page=&size=`.

## ۷.۷ نمونه endpoint (انتقال)
```
POST /api/v1/transfers
Headers: Authorization, Idempotency-Key
Body: { toAccountId, amount, currency, note? }
Response 200: { success:true, data:{ id, status, fee, createdAt } }
Response 409: { success:false, error:{ code:"CONFLICT", message:"duplicate" } }
```
