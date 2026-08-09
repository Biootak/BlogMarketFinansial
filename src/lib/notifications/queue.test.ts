/**
 * notifications/queue.test.ts — تست‌های واحد صف اعلان تلگرام
 *
 * پوشش:
 * - enqueue: ساخت رکورد + dedupe با P2002 (deduped)
 * - processTelegramQueue: claim اتمیک + ارسال موفق → sent + پاک‌شدن dedupeKey
 * - خطای شبکه → retry با backoff نمایی
 * - خطای دائمی (USER_BLOCKED / NOT_CONFIGURED) → dead
 * - اتمام maxAttempts → dead
 * - آزادسازی claimهای گیر کرده (استیل) → pending
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  telegramNotification: {
    create: vi.fn(),
    updateMany: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  $queryRaw: vi.fn(),
  $transaction: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ default: prismaMock }));

const telegramMock = vi.hoisted(() => ({
  sendTelegramMessage: vi.fn(),
}));

vi.mock('@/lib/telegram', () => telegramMock);

import { enqueueTelegramNotification, processTelegramQueue } from './queue';

const now = new Date();

function makeItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'n1',
    chatId: 'chat-1',
    text: 'پیام',
    replyMarkup: null,
    attempts: 0,
    maxAttempts: 5,
    ...overrides,
  };
}

describe('enqueueTelegramNotification', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prismaMock.telegramNotification.create.mockResolvedValue({ id: 'n1' });
    prismaMock.telegramNotification.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prismaMock));
    prismaMock.$queryRaw.mockResolvedValue([]);
    telegramMock.sendTelegramMessage.mockResolvedValue({ success: true });
  });

  it('رکورد pending می‌سازد و id برمی‌گرداند', async () => {
    const res = await enqueueTelegramNotification({
      chatId: 'chat-1',
      text: 'سلام',
      dedupeKey: 'deal-created:d1',
    });

    expect(res).toEqual({ success: true, id: 'n1' });
    expect(prismaMock.telegramNotification.create).toHaveBeenCalledWith({
      data: {
        chatId: 'chat-1',
        text: 'سلام',
        replyMarkup: undefined,
        dedupeKey: 'deal-created:d1',
        maxAttempts: 5,
      },
      select: { id: true },
    });
  });

  it('P2002 (همان رویداد در صف است) → deduped', async () => {
    prismaMock.telegramNotification.create.mockRejectedValue({ code: 'P2002' });

    const res = await enqueueTelegramNotification({
      chatId: 'chat-1',
      text: 'سلام',
      dedupeKey: 'kyc-review:u1:r1',
    });

    expect(res).toEqual({ success: false, deduped: true });
  });

  it('خطای دیگر هنگام enqueue → success:false بدون throw', async () => {
    prismaMock.telegramNotification.create.mockRejectedValue(new Error('db down'));

    await expect(enqueueTelegramNotification({ chatId: 'chat-1', text: 'سلام' })).resolves.toEqual({
      success: false,
    });
  });
});

describe('processTelegramQueue', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prismaMock.telegramNotification.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prismaMock));
    prismaMock.$queryRaw.mockResolvedValue([{ id: 'n1' }]);
    prismaMock.telegramNotification.findMany.mockResolvedValue([makeItem()]);
    prismaMock.telegramNotification.update.mockResolvedValue({});
    telegramMock.sendTelegramMessage.mockResolvedValue({ success: true });
  });

  it('claim اتمیک + ارسال موفق → sent و dedupeKey پاک می‌شود', async () => {
    const res = await processTelegramQueue();

    expect(res).toEqual({ processed: 1, failed: 0 });
    expect(prismaMock.$queryRaw).toHaveBeenCalled();
    expect(prismaMock.telegramNotification.update).toHaveBeenCalledWith({
      where: { id: 'n1' },
      data: { status: 'sent', sentAt: expect.any(Date), lastError: null, dedupeKey: null },
    });
    expect(telegramMock.sendTelegramMessage).toHaveBeenCalledWith('chat-1', 'پیام', null);
  });

  it('هیچ مورد موعدی نیست → بدون کار', async () => {
    prismaMock.$queryRaw.mockResolvedValue([]);

    const res = await processTelegramQueue();

    expect(res).toEqual({ processed: 0, failed: 0 });
    expect(telegramMock.sendTelegramMessage).not.toHaveBeenCalled();
  });

  it('خطای شبکه → retry با backoff نمایی (۳۰ ثانیه)', async () => {
    telegramMock.sendTelegramMessage.mockResolvedValue({
      success: false,
      errorCode: 'NETWORK_ERROR',
    });
    vi.spyOn(Date, 'now').mockReturnValue(now.getTime());

    const res = await processTelegramQueue();

    expect(res).toEqual({ processed: 0, failed: 1 });
    expect(prismaMock.telegramNotification.update).toHaveBeenCalledWith({
      where: { id: 'n1' },
      data: {
        status: 'retry',
        attempts: 1,
        nextAttemptAt: new Date(now.getTime() + 30_000),
        lastError: 'NETWORK_ERROR',
      },
    });
    vi.restoreAllMocks();
  });

  it('USER_BLOCKED → خطای دائمی → dead', async () => {
    telegramMock.sendTelegramMessage.mockResolvedValue({
      success: false,
      errorCode: 'USER_BLOCKED',
    });

    await processTelegramQueue();

    expect(prismaMock.telegramNotification.update).toHaveBeenCalledWith({
      where: { id: 'n1' },
      data: { status: 'dead', lastError: 'USER_BLOCKED', dedupeKey: null },
    });
  });

  it('اتمام maxAttempts → dead', async () => {
    prismaMock.telegramNotification.findMany.mockResolvedValue([
      makeItem({ attempts: 4, maxAttempts: 5 }),
    ]);
    telegramMock.sendTelegramMessage.mockResolvedValue({
      success: false,
      errorCode: 'TG_ERROR',
    });

    await processTelegramQueue();

    expect(prismaMock.telegramNotification.update).toHaveBeenCalledWith({
      where: { id: 'n1' },
      data: { status: 'dead', lastError: 'TG_ERROR', dedupeKey: null },
    });
  });

  it('claimهای گیر کردهٔ قدیمی → آزاد می‌شوند (pending)', async () => {
    await processTelegramQueue();

    expect(prismaMock.telegramNotification.updateMany).toHaveBeenCalledWith({
      where: {
        status: 'processing',
        updatedAt: { lt: expect.any(Date) },
      },
      data: { status: 'pending' },
    });
  });
});
