'use server';

import {
  cancelJob as _cancelJob,
  enqueueJob as _enqueueJob,
  retryJob as _retryJob,
} from '@/lib/jobs';
import { requireAdmin } from '@/lib/require-auth';
import { revalidateTag } from '@/lib/revalidate';
import { z } from 'zod';

/* ─────────────────────────────────────────────────────────────
 * cancelJob / retryJob — wrappers سراسری قبلی (سازگار با UI فعلی)
 * ───────────────────────────────────────────────────────────── */

export async function cancelJob(id: string): Promise<{ success: boolean; message?: string }> {
  return _cancelJob(id);
}

export async function retryJob(id: string): Promise<{ success: boolean; message?: string }> {
  return _retryJob(id);
}

/* ─────────────────────────────────────────────────────────────
 * enqueueJobAction — استفاده در /dashboard/jobs/new
 * ───────────────────────────────────────────────────────────── */

const enqueueSchema = z.object({
  type: z
    .string()
    .trim()
    .min(2, 'نوع job باید حداقل ۲ کاراکتر باشد')
    .max(120, 'نوع job نباید بیشتر از ۱۲۰ کاراکتر باشد')
    .regex(/^[a-z0-9._-]+$/i, 'فقط حروف انگلیسی، عدد، نقطه و خط تیره مجاز است'),
  queue: z
    .string()
    .trim()
    .min(1, 'نام صف الزامی است')
    .max(60)
    .regex(/^[a-z0-9._-]+$/i, 'نام صف فقط حروف انگلیسی، عدد و نقطه'),
  priority: z.coerce.number().int().min(-100).max(100).default(0),
  maxAttempts: z.coerce.number().int().min(1).max(20).default(3),
  scheduledAt: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  payloadJson: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});

export type EnqueueActionResult =
  | { success: true; id: string }
  | { success: false; error: string; field?: string };

export async function enqueueJobAction(
  _prev: EnqueueActionResult | null,
  formData: FormData,
): Promise<EnqueueActionResult> {
  const guard = await requireAdmin();
  if (!guard.success) return { success: false, error: guard.message };

  const parsed = enqueueSchema.safeParse({
    type: formData.get('type')?.toString() ?? '',
    queue: formData.get('queue')?.toString() ?? '',
    priority: formData.get('priority')?.toString() ?? '0',
    maxAttempts: formData.get('maxAttempts')?.toString() ?? '3',
    scheduledAt: formData.get('scheduledAt')?.toString() ?? '',
    payloadJson: formData.get('payloadJson')?.toString() ?? '',
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      success: false,
      error: first?.message ?? 'ورودی نامعتبر است',
      field: first?.path[0]?.toString(),
    };
  }

  // اعتبارسنجی payload JSON
  let payload: unknown = undefined;
  if (parsed.data.payloadJson) {
    try {
      payload = JSON.parse(parsed.data.payloadJson);
    } catch {
      return {
        success: false,
        error: 'فرمت JSON نامعتبر است',
        field: 'payloadJson',
      };
    }
    if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
      return {
        success: false,
        error: 'payload باید یک object معتبر باشد (نه آرایه و نه null)',
        field: 'payloadJson',
      };
    }
  }

  // scheduledAt → Date
  let scheduledAt: Date | null = null;
  if (parsed.data.scheduledAt) {
    const d = new Date(parsed.data.scheduledAt);
    if (!Number.isFinite(d.getTime())) {
      return {
        success: false,
        error: 'تاریخ زمان‌بندی نامعتبر است',
        field: 'scheduledAt',
      };
    }
    scheduledAt = d;
  }

  const result = await _enqueueJob({
    type: parsed.data.type,
    queue: parsed.data.queue,
    priority: parsed.data.priority,
    maxAttempts: parsed.data.maxAttempts,
    scheduledAt,
    payload,
    triggeredBy: 'admin-form',
  });

  if (!result.success || !result.id) {
    return { success: false, error: result.message ?? 'خطا در ساخت job' };
  }

  revalidateTag('jobs');
  revalidateTag('background-job');
  return { success: true, id: result.id };
}
