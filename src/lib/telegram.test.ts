/**
 * telegram.ts — تست‌های واحد
 *
 * mock پرستیما + fetch + env. پوشش:
 * - sendTelegramMessage: بدون توکن / شبکه / 403 / success
 * - consumeTelegramLinkToken: not-found / used / expired / chat-linked (P2002) / success
 * - isTelegramWebhookSecretValid: fail-closed
 * - getTelegramLinkUrl: بدون username → خالی
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  telegramLinkToken: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  user: {
    update: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ default: prismaMock }));

import {
  consumeTelegramLinkToken,
  createTelegramLinkToken,
  getTelegramBotUsername,
  getTelegramLinkUrl,
  isTelegramWebhookSecretValid,
  sendTelegramMessage,
} from '@/lib/telegram';

const ORIGINAL_ENV = process.env;

describe('sendTelegramMessage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...ORIGINAL_ENV };
    process.env.TELEGRAM_BOT_TOKEN = undefined;
    global.fetch = vi.fn();
  });

  it('بدون TELEGRAM_BOT_TOKEN → NOT_CONFIGURED (بدون fetch)', async () => {
    const res = await sendTelegramMessage('123', 'کد');
    expect(res).toEqual({ success: false, errorCode: 'NOT_CONFIGURED' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('fetch throw → NETWORK_ERROR', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'tok';
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('net down'));
    const res = await sendTelegramMessage('123', 'کد');
    expect(res).toEqual({ success: false, errorCode: 'NETWORK_ERROR' });
  });

  it('HTTP 403 → USER_BLOCKED', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'tok';
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: vi.fn().mockResolvedValue({ description: 'bot was blocked' }),
    } as unknown as Response);
    const res = await sendTelegramMessage('123', 'کد');
    expect(res).toEqual({ success: false, errorCode: 'USER_BLOCKED' });
  });

  it('HTTP 400 → TG_ERROR', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'tok';
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: vi.fn().mockResolvedValue({ description: 'bad request' }),
    } as unknown as Response);
    const res = await sendTelegramMessage('123', 'کد');
    expect(res).toEqual({ success: false, errorCode: 'TG_ERROR' });
  });

  it('success → payload صحیح ارسال می‌شود', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'tok';
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ ok: true }),
    } as unknown as Response);
    const res = await sendTelegramMessage('chat-1', 'کد شما: 123456');
    expect(res).toEqual({ success: true });
    const [url, init] = vi.mocked(global.fetch).mock.calls[0];
    expect(String(url)).toContain('/bottok/sendMessage');
    expect(JSON.parse(String(init?.body))).toMatchObject({
      chat_id: 'chat-1',
      text: 'کد شما: 123456',
      parse_mode: 'HTML',
    });
  });
});

describe('createTelegramLinkToken', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('توکن با پیشوند link_ می‌سازد و در DB ثبت می‌کند', async () => {
    prismaMock.telegramLinkToken.create.mockResolvedValue({ id: 'x' });
    const token = await createTelegramLinkToken('user-1');
    expect(token).toMatch(/^link_[0-9a-f]{36}$/);
    expect(prismaMock.telegramLinkToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        token,
        userId: 'user-1',
        used: false,
      }),
    });
  });
});

describe('consumeTelegramLinkToken', () => {
  const future = new Date(Date.now() + 60_000);
  const past = new Date(Date.now() - 60_000);

  beforeEach(() => {
    vi.restoreAllMocks();
    prismaMock.$transaction.mockImplementation((txns: unknown[]) =>
      Promise.all(txns as Promise<unknown>[]),
    );
  });

  it('توکن بدون پیشوند link_ → not-found', async () => {
    const res = await consumeTelegramLinkToken('abc', 'chat-1');
    expect(res).toEqual({ ok: false, reason: 'not-found' });
    expect(prismaMock.telegramLinkToken.findUnique).not.toHaveBeenCalled();
  });

  it('رکورد پیدا نشد → not-found', async () => {
    prismaMock.telegramLinkToken.findUnique.mockResolvedValue(null);
    const res = await consumeTelegramLinkToken('link_aa', 'chat-1');
    expect(res).toEqual({ ok: false, reason: 'not-found' });
  });

  it('توکن استفاده‌شده → used', async () => {
    prismaMock.telegramLinkToken.findUnique.mockResolvedValue({
      id: 't1',
      used: true,
      expiresAt: future,
    });
    const res = await consumeTelegramLinkToken('link_aa', 'chat-1');
    expect(res).toEqual({ ok: false, reason: 'used' });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('توکن منقضی → expired', async () => {
    prismaMock.telegramLinkToken.findUnique.mockResolvedValue({
      id: 't1',
      used: false,
      expiresAt: past,
    });
    const res = await consumeTelegramLinkToken('link_aa', 'chat-1');
    expect(res).toEqual({ ok: false, reason: 'expired' });
  });

  it('success: burn + ست chatId', async () => {
    prismaMock.telegramLinkToken.findUnique.mockResolvedValue({
      id: 't1',
      token: 'link_aa',
      userId: 'user-1',
      used: false,
      expiresAt: future,
    });
    prismaMock.telegramLinkToken.update.mockResolvedValue({});
    prismaMock.user.update.mockResolvedValue({});
    const res = await consumeTelegramLinkToken('link_aa', 'chat-99');
    expect(res).toEqual({ ok: true });
    expect(prismaMock.telegramLinkToken.update).toHaveBeenCalledWith({
      where: { id: 't1' },
      data: { used: true },
    });
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { telegramChatId: 'chat-99' },
    });
  });

  it('P2002 (chat قبلاً وصل است) → chat-linked', async () => {
    prismaMock.telegramLinkToken.findUnique.mockResolvedValue({
      id: 't1',
      used: false,
      expiresAt: future,
    });
    prismaMock.$transaction.mockRejectedValueOnce({ code: 'P2002' });
    const res = await consumeTelegramLinkToken('link_aa', 'chat-99');
    expect(res).toEqual({ ok: false, reason: 'chat-linked' });
  });

  it('خطای دیگر → db-error', async () => {
    prismaMock.telegramLinkToken.findUnique.mockRejectedValue(new Error('boom'));
    const res = await consumeTelegramLinkToken('link_aa', 'chat-1');
    expect(res).toEqual({ ok: false, reason: 'db-error' });
  });
});

describe('isTelegramWebhookSecretValid', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...ORIGINAL_ENV };
    process.env.TELEGRAM_WEBHOOK_SECRET = undefined;
  });

  it('بدون env → همیشه false (fail-closed)', () => {
    expect(isTelegramWebhookSecretValid('x')).toBe(false);
  });

  it('secret درست → true', () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = 's3cr3t';
    expect(isTelegramWebhookSecretValid('s3cr3t')).toBe(true);
  });

  it('secret نادرست → false', () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = 's3cr3t';
    expect(isTelegramWebhookSecretValid('wrong')).toBe(false);
  });

  it('secret خالی/null → false', () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = 's3cr3t';
    expect(isTelegramWebhookSecretValid('')).toBe(false);
    expect(isTelegramWebhookSecretValid(null)).toBe(false);
  });
});

describe('getTelegramLinkUrl / getTelegramBotUsername', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...ORIGINAL_ENV };
    process.env.TELEGRAM_BOT_USERNAME = undefined;
  });

  it('بدون username → رشته خالی', () => {
    expect(getTelegramBotUsername()).toBe('');
    expect(getTelegramLinkUrl('link_aa')).toBe('');
  });

  it('با username → deep-link صحیح', () => {
    process.env.TELEGRAM_BOT_USERNAME = 'afn_otp_bot';
    expect(getTelegramBotUsername()).toBe('afn_otp_bot');
    expect(getTelegramLinkUrl('link_aa')).toBe('https://t.me/afn_otp_bot?start=link_aa');
  });
});
