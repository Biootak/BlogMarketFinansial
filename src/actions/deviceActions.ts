'use server';

/**
 * deviceActions.ts — Server Actions برای مدیریت دستگاه‌های کاربر
 */

import prisma from '@/lib/db';
import { requireUser } from '@/lib/require-auth';
import type { FintechActionResult } from '@/types/types';
import { v4 as createId } from 'uuid';

export type DeviceRow = {
  id: string;
  fingerprint: string;
  userAgent: string | null;
  ip: string | null;
  status: string;
  lastSeenAt: string;
  createdAt: string;
};

export async function getMyDevices(): Promise<FintechActionResult<DeviceRow[]>> {
  const auth = await requireUser();
  if (!auth.success) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'وارد شوید' } };
  }

  const devices = await prisma.device.findMany({
    where: { userId: auth.user.id },
    select: {
      id: true,
      fingerprint: true,
      userAgent: true,
      ip: true,
      status: true,
      lastSeenAt: true,
      createdAt: true,
    },
    orderBy: { lastSeenAt: 'desc' },
  });

  return {
    success: true,
    data: devices.map((d) => ({
      id: d.id,
      fingerprint: d.fingerprint,
      userAgent: d.userAgent,
      ip: d.ip,
      status: d.status,
      lastSeenAt: d.lastSeenAt.toISOString(),
      createdAt: d.createdAt.toISOString(),
    })),
  };
}

export async function revokeDevice(deviceId: string): Promise<FintechActionResult<void>> {
  const auth = await requireUser();
  if (!auth.success) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'وارد شوید' } };
  }

  // ownership check — فقط دستگاه خودش
  const device = await prisma.device.findFirst({
    where: { id: deviceId, userId: auth.user.id },
    select: { id: true },
  });

  if (!device) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'دستگاه یافت نشد' } };
  }

  await prisma.device.update({
    where: { id: deviceId },
    data: { status: 'REVOKED' },
  });

  // Audit Log
  await prisma.auditLog.create({
    data: {
      id: createId(),
      exchangeId: null,
      actorId: auth.user.id,
      actorRole: 'USER',
      action: 'DEVICE_REVOKED',
      entityType: 'Device',
      entityId: deviceId,
    },
  });

  return { success: true, data: undefined };
}

export async function trustDevice(deviceId: string): Promise<FintechActionResult<void>> {
  const auth = await requireUser();
  if (!auth.success) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'وارد شوید' } };
  }

  const device = await prisma.device.findFirst({
    where: { id: deviceId, userId: auth.user.id },
    select: { id: true },
  });

  if (!device) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'دستگاه یافت نشد' } };
  }

  await prisma.device.update({
    where: { id: deviceId },
    data: { status: 'TRUSTED' },
  });

  return { success: true, data: undefined };
}

export type SecurityLog = {
  id: string;
  action: string;
  ip: string | null;
  createdAt: string;
};

export async function getSecurityAuditLogs(): Promise<FintechActionResult<SecurityLog[]>> {
  const auth = await requireUser();
  if (!auth.success) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'وارد شوید' } };
  }

  const logs = await prisma.auditLog.findMany({
    where: {
      actorId: auth.user.id,
      action: {
        in: [
          'DEVICE_REVOKED',
          'DEVICE_TRUSTED',
          'ALL_OTHER_DEVICES_REVOKED',
          'USER_SIGNIN',
          'USER_SIGNOUT',
        ],
      },
    },
    select: {
      id: true,
      action: true,
      ip: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  return {
    success: true,
    data: logs.map((l) => ({
      id: l.id,
      action: l.action,
      ip: l.ip,
      createdAt: l.createdAt.toISOString(),
    })),
  };
}

export async function revokeAllOtherDevices(
  currentDeviceId: string,
): Promise<FintechActionResult<void>> {
  const auth = await requireUser();
  if (!auth.success) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'وارد شوید' } };
  }

  await prisma.device.updateMany({
    where: {
      userId: auth.user.id,
      id: { not: currentDeviceId },
      status: { not: 'REVOKED' },
    },
    data: { status: 'REVOKED' },
  });

  await prisma.auditLog.create({
    data: {
      id: createId(),
      exchangeId: null,
      actorId: auth.user.id,
      actorRole: 'USER',
      action: 'ALL_OTHER_DEVICES_REVOKED',
      entityType: 'Device',
    },
  });

  return { success: true, data: undefined };
}
