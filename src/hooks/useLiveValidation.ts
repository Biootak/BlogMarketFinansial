'use client';

/**
 * useLiveValidation — validation زندهٔ فرم‌ها (validate-as-you-type)
 * -----------------------------------------------------------------------------
 * UX: کاربر از «شکست» خوشش نمی‌آید — خطا باید همان لحظه‌ای که فیلد پر می‌شود
 * دیده شود، نه فقط بعد از submit.
 *
 * رفتار:
 *  - `setField(name, value)`: مقدار را ذخیره می‌کند و فیلد را touched می‌کند
 *    → خطای آن فیلد بلافاصله (live) نمایش داده می‌شود.
 *  - با تایپ بیشتر، خطا همان لحظه پاک می‌شود (بدون نیاز به submit).
 *  - `handleSubmit(onValid)`: اگر همه چیز معتبر باشد `onValid` صدا زده می‌شود؛
 *    وگرنه همهٔ فیلدها touched می‌شوند تا خطاها نمایش داده شوند — هیچ submit
 *    ناموفقی از جنس validation وجود ندارد.
 *  - خطاهای server-side (مثل تکراری بودن) از طریق `setServerError` نمایش داده
 *    می‌شوند و با اولین تغییر فیلد پاک می‌شوند.
 */

import { useCallback, useMemo, useState } from 'react';
import type { z } from 'zod';

export function useLiveValidation<S extends z.ZodTypeAny>(schema: S, initial: z.input<S>) {
  const [values, setValues] = useState<z.input<S>>(initial);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  // همهٔ خطاهای schema برای مقدار فعلی (زنده)
  const allErrors = useMemo(() => {
    const result = schema.safeParse(values);
    if (result.success) return {} as Record<string, string>;
    const errs: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? 'form');
      if (!errs[key]) errs[key] = issue.message;
    }
    return errs;
  }, [schema, values]);

  // فقط خطاهای فیلدهایی که کاربر با آن‌ها تعامل داشته است
  const visibleErrors = useMemo(() => {
    const out: Record<string, string> = {};
    for (const [key, msg] of Object.entries(allErrors)) {
      if (touched[key]) out[key] = msg;
    }
    return out;
  }, [allErrors, touched]);

  const isValid = useMemo(() => Object.keys(allErrors).length === 0, [allErrors]);

  const setField = useCallback((name: string, value: unknown) => {
    setValues((prev) => ({ ...(prev as object), [name]: value }) as z.input<S>);
    // به محض شروع تایپ، فیلد touched می‌شود → خطا live
    setTouched((prev) => ({ ...prev, [name]: true }));
    setServerError(null);
  }, []);

  const touchAll = useCallback(() => {
    setTouched((prev) => {
      const all: Record<string, boolean> = { ...prev };
      for (const key of Object.keys(values as object)) all[key] = true;
      return all;
    });
  }, [values]);

  const reset = useCallback(
    (next?: z.input<S>) => {
      setValues(next ?? initial);
      setTouched({});
      setServerError(null);
    },
    [initial],
  );

  const handleSubmit =
    (onValid: (v: z.infer<S>) => void) => (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      touchAll();
      setServerError(null);
      if (isValid) onValid(values as z.infer<S>);
    };

  return {
    values,
    setField,
    errors: visibleErrors,
    allErrors,
    touched,
    isValid,
    serverError,
    setServerError,
    handleSubmit,
    reset,
    touchAll,
  };
}
