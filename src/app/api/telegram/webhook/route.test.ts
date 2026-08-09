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
  answerTelegramCallback: vi.fn(),
  editTelegramMessage: vi.fn(),
  getPortalUrl: vi.fn(() => 'https://financialmarket.page'),
}));

vi.mock('@/lib/telegram', () => telegramMock);

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

  it('اگر توکن expired → پیام خطا ارسال می‌شود', async () => {
    telegramMock.isTelegramWebhookSecretValid.mockReturnValue(true);
    telegramMock.consumeTelegramLinkToken.mockResolvedValue({ ok: false, reason: 'expired' });

    await POST(makeRequest({ message: { chat: { id: 9 }, text: '/start link_old' } }));

    const [, text] = telegramMock.sendTelegramMessage.mock.calls[0];
    expect(text).toContain('منقضی');
  });
});
