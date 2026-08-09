/**
 * notifications/telegram-user.test.ts — تست‌های واحد
 *
 * پوشش:
 * - کاربر بدون لینک تلگرام → بدون enqueue (سکوت)
 * - کاربر با chatId → enqueue با chatId + متن + markup + dedupeKey
 * - notifyTelegramCustomer → از customerId به userId می‌رسد
 * - خطای DB → fire-and-forget (هرگز throw نمی‌کند)
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  customer: { findUnique: vi.fn() },
}));

vi.mock('@/lib/db', () => ({ default: prismaMock }));

const queueMock = vi.hoisted(() => ({
  enqueueTelegramNotification: vi.fn(),
}));

vi.mock('@/lib/notifications/queue', () => queueMock);

import { notifyTelegramCustomer, notifyTelegramUser } from './telegram-user';

describe('notifyTelegramUser', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    queueMock.enqueueTelegramNotification.mockResolvedValue({ success: true });
  });

  it('بدون لینک تلگرام → هیچ پیامی enqueue نمی‌شود', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ telegramChatId: null });

    await notifyTelegramUser('u1', 'پیام');

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'u1' },
      select: { telegramChatId: true },
    });
    expect(queueMock.enqueueTelegramNotification).not.toHaveBeenCalled();
  });

  it('کاربر لینک شده → پیام در صف ثبت می‌شود (با dedupeKey)', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ telegramChatId: 'chat-99' });

    await notifyTelegramUser(
      'u1',
      '✅ <b>پیام تست</b>',
      {
        inlineKeyboard: [[{ text: 'باز کردن', url: 'https://x.test' }]],
      },
      { dedupeKey: 'kyc-review:u1:r1' },
    );

    expect(queueMock.enqueueTelegramNotification).toHaveBeenCalledWith({
      chatId: 'chat-99',
      text: '✅ <b>پیام تست</b>',
      replyMarkup: { inlineKeyboard: [[{ text: 'باز کردن', url: 'https://x.test' }]] },
      dedupeKey: 'kyc-review:u1:r1',
    });
  });

  it('خطای DB → throw نمی‌کند (fire-and-forget)', async () => {
    prismaMock.user.findUnique.mockRejectedValue(new Error('db down'));

    await expect(notifyTelegramUser('u1', 'پیام')).resolves.toBeUndefined();
    expect(queueMock.enqueueTelegramNotification).not.toHaveBeenCalled();
  });
});

describe('notifyTelegramCustomer', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    queueMock.enqueueTelegramNotification.mockResolvedValue({ success: true });
  });

  it('از customerId به userId می‌رسد و پیام enqueue می‌شود', async () => {
    prismaMock.customer.findUnique.mockResolvedValue({ userId: 'u9' });
    prismaMock.user.findUnique.mockResolvedValue({ telegramChatId: 'chat-7' });

    await notifyTelegramCustomer('c1', '💸 پیام تراکنش');

    expect(prismaMock.customer.findUnique).toHaveBeenCalledWith({
      where: { id: 'c1' },
      select: { userId: true },
    });
    expect(queueMock.enqueueTelegramNotification).toHaveBeenCalledWith({
      chatId: 'chat-7',
      text: '💸 پیام تراکنش',
      replyMarkup: undefined,
      dedupeKey: undefined,
    });
  });

  it('بدون userId → سکوت', async () => {
    prismaMock.customer.findUnique.mockResolvedValue({ userId: null });

    await notifyTelegramCustomer('c1', 'پیام');

    expect(queueMock.enqueueTelegramNotification).not.toHaveBeenCalled();
  });
});
