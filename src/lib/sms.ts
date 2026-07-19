/**
 * SMS provider — minimal Twilio wrapper.
 *
 * در production از Twilio استفاده می‌کند (TWILIO_ACCOUNT_SID، TWILIO_AUTH_TOKEN، TWILIO_FROM_NUMBER).
 * در development اگر env ست نشده باشد، کد رو در console لاگ می‌کند.
 */

export interface SmsSendResult {
  success: boolean;
  /** فقط در dev mode پر می‌شود */
  devCode?: string;
}

/**
 * ارسال پیامک.
 * هرگز throw نمی‌کند — خطاها درون result برگردانده می‌شوند.
 */
export async function sendSms(to: string, body: string): Promise<SmsSendResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_FROM_NUMBER?.trim();

  // ── Dev fallback ──────────────────────────────────────────────────────── //
  if (!sid || !token || !from) {
    if (process.env.NODE_ENV !== 'production') {
      // استخراج کد از body — devCode بازگردانده می‌شود تا caller بتواند نمایش دهد
      const codeMatch = body.match(/\b(\d{6})\b/);
      const devCode = codeMatch?.[1];
      return { success: true, devCode };
    }
    // در production بدون env → fail واضح
    return { success: false };
  }

  // ── Twilio REST ───────────────────────────────────────────────────────── //
  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    const params = new URLSearchParams({ To: to, From: from, Body: body });
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    if (!res.ok) {
      return { success: false };
    }
    return { success: true };
  } catch {
    return { success: false };
  }
}
