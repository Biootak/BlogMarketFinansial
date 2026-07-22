// نقش‌های قابل ویرایش در ماتریس مجوزها (SUPERADMIN همیشه همه — read-only)
export const EDITABLE_ROLES = ['CUSTOMER', 'MERCHANT', 'EXCHANGE', 'SUPPORT', 'ADMIN'] as const;

export type EditableRole = (typeof EDITABLE_ROLES)[number];
