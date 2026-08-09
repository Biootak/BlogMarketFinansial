/**
 * POST /api/telegram/webhook — تست‌های واحد
 *
 * پوشش:
 * - رد درخواست بدون secret معتبر → 401
 * - JSON نامعتبر → 400
 * - /start link_<token>: token درست از index[1] گرفته می‌شود
 * - پیام‌های دیگر نادیده گرفته می‌شوند
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mock ها ─────────────────────────────────────────────────────────────────

const telegramMock = vi.hoisted(() => ({
  isTelegramWebhookSecretValid: vi.fn(),
  consumeTelegramLinkToken: vi.fn(),
  sendTelegramMessage: vi.fn(),
  sendTelegramChatAction: vi.fn(),
  answerTelegramCallback: vi.fn(),
  editTelegramMessage: vi.fn(),
  getPortalUrl: vi.fn(() => 'https://financialmarket.page'),
  formatTelegramPhone: vi.fn(() => '+98 916 520 0952'),
}));

vi.mock('@/lib/telegram', () => telegramMock);

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
  },
}));

vi.mock('@/lib/db', () => ({ default: prismaMock }));

const phoneKycMock = vi.hoisted(() => ({
  autoVerifyPhoneFromTelegram: vi.fn(),
}));

vi.mock('@/lib/phone-kyc', () => phoneKycMock);

import { POST } from './route';

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: unknown, secret?: string): Request {
  return new Request('http://localhost/api/telegram/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { 'x-telegram-bot-api-secret-token': secret } : {}),
    },
    body: JSON.stringify(body),
  });
}

/** زنجیره‌های asyncِ after() را قبل از assert تخلیه می‌کند */
async function flushAsync(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
}

// ─── تست‌ها ───────────────────────────────────────────────────────────────────

describe('POST /api/telegram/webhook', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    telegramMock.sendTelegramMessage.mockResolvedValue({ success: true });
  });

  it('بدون secret معتبر → 401', async () => {
    telegramMock.isTelegramWebhookSecretValid.mockReturnValue(false);
    const res = await POST(makeRequest({ message: {} }));
    expect(res.status).toBe(401);
  });

  it('JSON نامعتبر → 400', async () => {
    telegramMock.isTelegramWebhookSecretValid.mockReturnValue(true);
    const req = new Request('http://localhost/api/telegram/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('پیام بدون /start link_ → نادیده گرفته می‌شود، 200', async () => {
    telegramMock.isTelegramWebhookSecretValid.mockReturnValue(true);
    const res = await POST(makeRequest({ message: { chat: { id: 1 }, text: 'سلام' } }));
    expect(res.status).toBe(200);
    expect(telegramMock.consumeTelegramLinkToken).not.toHaveBeenCalled();
  });

  it('/start link_<token>: توکن از index[1] خوانده می‌شود (باگ رگرسیون)', async () => {
    telegramMock.isTelegramWebhookSecretValid.mockReturnValue(true);
    telegramMock.consumeTelegramLinkToken.mockResolvedValue({ ok: true });

    const res = await POST(
      makeRequest({ message: { chat: { id: 42 }, text: '/start link_abc123' } }),
    );

    expect(res.status).toBe(200);
    // مهم‌ترین assert: توکن باید link_abc123 باشد، نه '/start'
    expect(telegramMock.consumeTelegramLinkToken).toHaveBeenCalledWith(
      'link_abc123',
      '42',
      undefined,
    );
  });

  it('اگر consumeToken موفق → پیام موفقیت ارسال می‌شود', async () => {
    telegramMock.isTelegramWebhookSecretValid.mockReturnValue(true);
    telegramMock.consumeTelegramLinkToken.mockResolvedValue({ ok: true });

    await POST(makeRequest({ message: { chat: { id: 9 }, text: '/start link_xyz' } }));

    const [chatId, text] = telegramMock.sendTelegramMessage.mock.calls[0];
    expect(chatId).toBe('9');
    expect(text).toContain('موفقیت');
  });

  it('اگر توکن expired → پیام خطا + دکمهٔ پورتال ارسال می‌شود', async () => {
    telegramMock.isTelegramWebhookSecretValid.mockReturnValue(true);
    telegramMock.consumeTelegramLinkToken.mockResolvedValue({ ok: false, reason: 'expired' });

    await POST(makeRequest({ message: { chat: { id: 9 }, text: '/start link_old' } }));

    const [, text, markup] = telegramMock.sendTelegramMessage.mock.calls[0];
    expect(text).toContain('منقضی');
    // طراحی اسکرین ۷: خطای لینک همراه دکمهٔ باز کردن پورتال است
    expect(markup).toEqual({
      inlineKeyboard: [[{ text: '🌐 باز کردن پورتال', url: 'https://financialmarket.page' }]],
    });
  });

  it('callback status → پیام وضعیت با نوار پیشرفت ویرایش می‌شود', async () => {
    telegramMock.isTelegramWebhookSecretValid.mockReturnValue(true);
    prismaMock.user.findUnique.mockResolvedValue({
      email: 'ali@mail.com',
      pendingPhone: null,
      Customer: { kycLevel: 'LEVEL_1', kycStatus: 'APPROVED', phone: null },
    });

    await POST(
      makeRequest({
        callback_query: {
          id: 'cb1',
          data: 'status',
          message: { chat: { id: 7 }, message_id: 55 },
        },
      }),
    );

    await flushAsync();
    expect(telegramMock.answerTelegramCallback).toHaveBeenCalledWith('cb1');
    const [chat, messageId, text, markup] = telegramMock.editTelegramMessage.mock.calls[0];
    expect(chat).toBe('7');
    expect(messageId).toBe(55);
    // طراحی اسکرین ۴: سطح ۱ → ۱ از ۳ قدم + مرحلهٔ بعد
    expect(text).toContain('سطح امنیت: <b>سطح ۱</b>');
    expect(text).toContain('▰▱▱');
    expect(text).toContain('۳۳٪');
    expect(text).toContain('مرحلهٔ بعد: مدرک و سلفی (سطح ۲)');
    expect(markup.inlineKeyboard[1][0]).toMatchObject({ text: '🔄 بروزرسانی' });
  });

  it('callback refresh → «بروزرسانی» دوباره وضعیت را می‌خواند', async () => {
    telegramMock.isTelegramWebhookSecretValid.mockReturnValue(true);
    prismaMock.user.findUnique.mockResolvedValue({
      email: 'ali@mail.com',
      pendingPhone: null,
      Customer: { kycLevel: 'NONE', kycStatus: 'NOT_STARTED', phone: null },
    });

    await POST(
      makeRequest({
        callback_query: {
          id: 'cb2',
          data: 'refresh',
          message: { chat: { id: 7 }, message_id: 55 },
        },
      }),
    );

    await flushAsync();
    expect(telegramMock.answerTelegramCallback).toHaveBeenCalledWith('cb2', 'به‌روزرسانی شد ✅');
    const [, , text] = telegramMock.editTelegramMessage.mock.calls[0];
    expect(text).toContain('▱▱▱');
    expect(text).toContain('مرحلهٔ بعد: تأیید شماره موبایل (سطح ۱)');
  });

  it('شماره یکی نیست → typing + پیام خطا + دکمهٔ پورتال', async () => {
    telegramMock.isTelegramWebhookSecretValid.mockReturnValue(true);
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u1',
      pendingPhone: '+989165200952',
      telegramUserId: '111',
      Customer: { id: 'c1', exchangeId: 'e1', kycLevel: 'NONE', status: 'ACTIVE' },
    });
    phoneKycMock.autoVerifyPhoneFromTelegram.mockResolvedValue({
      ok: false,
      reason: 'mismatch',
    });

    await POST(
      makeRequest({
        message: {
          chat: { id: 3 },
          contact: { phone_number: '+989111111111', user_id: 111 },
        },
      }),
    );

    // طراحی اسکرین ۳: نشانگر typing قبل از نتیجه
    await flushAsync();
    expect(telegramMock.sendTelegramChatAction).toHaveBeenCalledWith('3', 'typing');
    const [, text, markup] = telegramMock.sendTelegramMessage.mock.calls[0];
    expect(text).toContain('تأیید نشد');
    expect(text).toContain('یکی نیست');
    expect(markup).toEqual({
      inlineKeyboard: [[{ text: '🌐 باز کردن پورتال', url: 'https://financialmarket.page' }]],
    });
  });

  it('تأیید موفق → شمارهٔ خوانا + دکمهٔ ادامه احراز هویت', async () => {
    telegramMock.isTelegramWebhookSecretValid.mockReturnValue(true);
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u1',
      pendingPhone: '+989165200952',
      telegramUserId: '111',
      Customer: { id: 'c1', exchangeId: 'e1', kycLevel: 'NONE', status: 'ACTIVE' },
    });
    phoneKycMock.autoVerifyPhoneFromTelegram.mockResolvedValue({ ok: true });

    await POST(
      makeRequest({
        message: {
          chat: { id: 3 },
          contact: { phone_number: '+989165200952', user_id: 111 },
        },
      }),
    );

    await flushAsync();
    const [, text, markup] = telegramMock.sendTelegramMessage.mock.calls[0];
    expect(text).toContain('هویت شما تأیید شد');
    expect(text).toContain('<code>+98 916 520 0952</code>');
    expect(markup.inlineKeyboard[0][0]).toMatchObject({ text: '🚀 ادامه احراز هویت' });
  });

  it('حساب مسدود → بدون دکمه (طراحی اسکرین ۸)', async () => {
    telegramMock.isTelegramWebhookSecretValid.mockReturnValue(true);
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u1',
      pendingPhone: '+989165200952',
      telegramUserId: '111',
      Customer: { id: 'c1', exchangeId: 'e1', kycLevel: 'NONE', status: 'FROZEN' },
    });
    phoneKycMock.autoVerifyPhoneFromTelegram.mockResolvedValue({
      ok: false,
      reason: 'account-blocked',
    });

    await POST(
      makeRequest({
        message: {
          chat: { id: 3 },
          contact: { phone_number: '+989165200952', user_id: 111 },
        },
      }),
    );

    await flushAsync();
    const [, text, markup] = telegramMock.sendTelegramMessage.mock.calls[0];
    expect(text).toContain('مسدود');
    expect(markup).toBeUndefined();
  });
});
