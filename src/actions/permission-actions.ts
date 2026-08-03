'use server';

/**
 * permission-actions — CRUD روی Permission + RolePermission
 *
 * - getPermissions: لیست همه مجوزها + وضعیت هر نقش
 * - saveRoleMatrix: ذخیره batch ماتریس نقش×مجوز (atomic)
 * - createPermission: افزودن مجوز جدید (key: resource:action)
 * - deletePermission: حذف مجوز بلااستفاده
 *
 * امنیت: فقط ADMIN/OWNER/SUPERADMIN — AuditLog هر تغییر
 */

import prisma from '@/lib/db';
import { EDITABLE_ROLES } from '@/lib/permissions-constants';
import { requireAdmin } from '@/lib/require-auth';
import { revalidateTag } from '@/lib/revalidate';
import type { FintechActionResult } from '@/types/types';
import { v4 as createId } from 'uuid';
import { z } from 'zod';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PermissionRow = {
  id: string;
  key: string;
  description: string | null;
  createdAt: Date;
};

export type RoleMatrixEntry = {
  permissionId: string;
  permissionKey: string;
  roles: Record<string, boolean>;
};

// ─── READ ─────────────────────────────────────────────────────────────────────

export async function getPermissions(): Promise<
  FintechActionResult<{
    permissions: PermissionRow[];
    matrix: RoleMatrixEntry[];
  }>
> {
  const auth = await requireAdmin();
  if (!auth.success) {
    return { success: false, error: { code: auth.code, message: auth.message } };
  }

  const [permissions, rolePermissions] = await Promise.all([
    prisma.permission.findMany({ orderBy: { key: 'asc' } }),
    prisma.rolePermission.findMany(),
  ]);

  // ساخت ماتریس: برای هر Permission، چه نقش‌هایی فعال هستند
  const matrix: RoleMatrixEntry[] = permissions.map((perm) => {
    const granted = rolePermissions.filter((rp) => rp.permissionId === perm.id);
    const roles: Record<string, boolean> = {};
    for (const role of EDITABLE_ROLES) {
      roles[role] = granted.some((rp) => rp.role === role);
    }
    return {
      permissionId: perm.id,
      permissionKey: perm.key,
      roles,
    };
  });

  return {
    success: true,
    data: {
      permissions: permissions.map((p) => ({
        id: p.id,
        key: p.key,
        description: p.description,
        createdAt: p.createdAt,
      })),
      matrix,
    },
  };
}

// ─── SAVE MATRIX (batch atomic) ───────────────────────────────────────────────

const MatrixSchema = z.array(
  z.object({
    permissionId: z.string().min(1),
    roles: z.record(z.boolean()),
  }),
);

export async function saveRoleMatrix(
  rows: unknown,
): Promise<FintechActionResult<{ updated: number }>> {
  const auth = await requireAdmin();
  if (!auth.success) {
    return { success: false, error: { code: auth.code, message: auth.message } };
  }

  const parsed = MatrixSchema.safeParse(rows);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: 'INVALID_INPUT', message: 'داده ماتریس نامعتبر' },
    };
  }

  let updated = 0;

  await prisma.$transaction(async (tx) => {
    for (const row of parsed.data) {
      for (const roleKey of EDITABLE_ROLES) {
        const shouldHave = row.roles[roleKey] === true;

        const existing = await tx.rolePermission.findFirst({
          where: { permissionId: row.permissionId, role: roleKey },
          select: { id: true },
        });

        if (shouldHave && !existing) {
          await tx.rolePermission.create({
            data: { id: createId(), permissionId: row.permissionId, role: roleKey },
          });
          updated++;
        } else if (!shouldHave && existing) {
          await tx.rolePermission.delete({ where: { id: existing.id } });
          updated++;
        }
      }
    }

    // AuditLog
    await tx.auditLog.create({
      data: {
        id: createId(),
        actorId: auth.user.id,
        actorRole: auth.user.role,
        action: 'PERMISSION_MATRIX_UPDATED',
        entityType: 'RolePermission',
        meta: { rowCount: parsed.data.length, changedCount: updated },
      },
    });
  });

  revalidateTag('permissions');
  return { success: true, data: { updated } };
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

const PermissionCreateSchema = z.object({
  key: z
    .string()
    .min(3)
    .max(80)
    .regex(/^[a-z0-9_:-]+$/, 'کلید مجوز باید به فرمت resource:action باشد'),
  description: z.string().max(200).nullable().optional(),
});

export async function createPermission(raw: unknown): Promise<FintechActionResult<PermissionRow>> {
  const auth = await requireAdmin();
  if (!auth.success) {
    return { success: false, error: { code: auth.code, message: auth.message } };
  }

  const parsed = PermissionCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: 'INVALID_INPUT', message: parsed.error.errors[0]?.message ?? 'داده نامعتبر' },
    };
  }

  const existing = await prisma.permission.findFirst({ where: { key: parsed.data.key } });
  if (existing) {
    return {
      success: false,
      error: { code: 'DUPLICATE_KEY', message: `کلید «${parsed.data.key}» قبلاً ثبت شده` },
    };
  }

  const perm = await prisma.permission.create({
    data: { id: createId(), key: parsed.data.key, description: parsed.data.description ?? null },
  });

  revalidateTag('permissions');
  return {
    success: true,
    data: { id: perm.id, key: perm.key, description: perm.description, createdAt: perm.createdAt },
  };
}

// ─── BULK CREATE ─────────────────────────────────────────────────────────────

const BulkCreateSchema = z
  .array(
    z.object({
      key: z
        .string()
        .min(3)
        .max(80)
        .regex(/^[a-z0-9_:-]+$/, 'کلید مجوز باید به فرمت resource:action باشد'),
      description: z.string().max(200).nullable().optional(),
    }),
  )
  .min(1)
  .max(50);

export async function createPermissions(
  raw: unknown,
): Promise<FintechActionResult<{ created: PermissionRow[]; skipped: string[] }>> {
  const auth = await requireAdmin();
  if (!auth.success) {
    return { success: false, error: { code: auth.code, message: auth.message } };
  }

  const parsed = BulkCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: 'INVALID_INPUT', message: parsed.error.errors[0]?.message ?? 'داده نامعتبر' },
    };
  }

  const keys = parsed.data.map((d) => d.key);
  const existing = await prisma.permission.findMany({
    where: { key: { in: keys } },
    select: { key: true },
  });
  const existingKeys = new Set(existing.map((e) => e.key));

  const toCreate = parsed.data.filter((d) => !existingKeys.has(d.key));
  if (toCreate.length === 0) {
    return {
      success: false,
      error: { code: 'DUPLICATE_KEY', message: 'همه کلیدهای انتخابی قبلاً ثبت شده‌اند' },
    };
  }

  const created = await prisma.$transaction(
    toCreate.map((d) =>
      prisma.permission.create({
        data: { id: createId(), key: d.key, description: d.description ?? null },
      }),
    ),
  );

  await prisma.auditLog.create({
    data: {
      id: createId(),
      actorId: auth.user.id,
      actorRole: auth.user.role,
      action: 'PERMISSION_BULK_CREATED',
      entityType: 'Permission',
      meta: {
        created: created.map((p) => p.key),
        skipped: [...existingKeys].filter((k) => keys.includes(k)),
      },
    },
  });

  revalidateTag('permissions');
  return {
    success: true,
    data: {
      created: created.map((p) => ({
        id: p.id,
        key: p.key,
        description: p.description,
        createdAt: p.createdAt,
      })),
      skipped: [...existingKeys].filter((k) => keys.includes(k)),
    },
  };
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function deletePermission(
  permissionId: string,
): Promise<FintechActionResult<{ id: string }>> {
  const auth = await requireAdmin();
  if (!auth.success) {
    return { success: false, error: { code: auth.code, message: auth.message } };
  }

  const used = await prisma.rolePermission.count({ where: { permissionId } });
  if (used > 0) {
    return {
      success: false,
      error: {
        code: 'IN_USE',
        message: `این مجوز در ${used} نقش استفاده می‌شود. ابتدا از نقش‌ها بردار.`,
      },
    };
  }

  await prisma.permission.delete({ where: { id: permissionId } });
  revalidateTag('permissions');
  return { success: true, data: { id: permissionId } };
}
