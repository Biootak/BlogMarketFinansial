/**
 * server-only-stub — alias ویست برای `import 'server-only'`.
 *
 * پکیج `server-only` در محیط‌های غیر React-Server (مثل vitest/node) throw
 * می‌کند. برای تست ماژول‌های server-only (مثل optimize-body-images) این stub
 * خالی در vitest.config.ts به‌جای آن alias می‌شود. هیچ منطقی ندارد — فقط
 * `export {}` تا import به‌عنوان ماژول معتبر باشد.
 */
export {};
