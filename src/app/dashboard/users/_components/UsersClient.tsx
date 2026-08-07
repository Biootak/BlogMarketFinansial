'use client';

/**
 * UsersClient — 2026 Million-dollar User Management
 *
 * ویژگی‌ها:
 * - URL-based filtering & pagination (مثل audit-log — بدون useEffect fetch)
 * - KPI strip: total / active / pending / banned
 * - Search با debounce + router.push
 * - Create / Edit در Sheet (نه modal جدید — از Sheet استفاده می‌شود)
 * - Confirm delete dialog
 * - Avatar initials fallback
 * - spring micro-interactions روی row‌ها
 * - همه ۵ حالت: loading / empty / error / success / disabled
 */

import { createUser, deleteUser, updateUser } from '@/actions/userActions';
import { ConfirmDialog, PageHeader, SearchInput } from '@/components/Dashboard/primitives';
import cm from '@/components/Dashboard/primitives/CenterModal.module.css';
import SubmitButton from '@/components/SubmitButton';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogOverlay,
  DialogPortal,
  DialogTitle as SheetTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import type { Role, UserWithProfile } from '@/types/types';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import {
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineEnvelope,
  HiOutlineEye,
  HiOutlineLockClosed,
  HiOutlineNoSymbol,
  HiOutlinePencil,
  HiOutlinePhone,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineUser,
  HiOutlineUserGroup,
  HiOutlineUsers,
  HiOutlineXMark,
} from 'react-icons/hi2';
import s from './UsersClient.module.css';

// ─── Types ──────────────────────────────────────────────────────────────────

type FormData = {
  name: string;
  email: string;
  phoneNumber: string;
  company: string;
  role: Role;
  status: string;
  password: string;
};

interface Props {
  users: UserWithProfile[];
  totalCount: number;
  currentPage: number;
  currentSearch: string;
  currentStatus: string;
  currentRole: string;
  currentUserRole: string;
  currentUserId: string;
}

// ─── Module-level Intl singleton — created once at module load
const _faNum = new Intl.NumberFormat('fa-IR');

// ─── Constants ──────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  USER: 'کاربر',
  AUTHOR: 'نویسنده',
  ADMIN: 'مدیر',
  OWNER: 'مالک',
  SUPERADMIN: 'سوپرادمین',
};

const STATUS_LABELS: Record<string, string> = {
  Active: 'فعال',
  Pending: 'در انتظار',
  Banned: 'مسدود',
  Rejected: 'رد شده',
};

const PAGE_SIZE = 12;

// ─── Helpers ────────────────────────────────────────────────────────────────

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function canManageUser(currentRole: string, currentId: string, target: UserWithProfile): boolean {
  if (target.id === currentId) return false;
  if (currentRole === 'OWNER' || currentRole === 'SUPERADMIN') return true;
  if (currentRole === 'ADMIN') {
    return target.role !== 'OWNER' && target.role !== 'ADMIN' && target.role !== 'SUPERADMIN';
  }
  return false;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function UsersClient({
  users,
  totalCount,
  currentPage,
  currentSearch,
  currentStatus,
  currentRole,
  currentUserRole,
  currentUserId,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithProfile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserWithProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Search debounce
  const [searchInput, setSearchInput] = useState(currentSearch);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<FormData>({
    defaultValues: {
      name: '',
      email: '',
      phoneNumber: '',
      company: '',
      role: 'USER',
      status: 'Active',
      password: '',
    },
  });

  // ── URL navigation ──────────────────────────────────────────────────────

  const navigate = useCallback(
    (params: Record<string, string>) => {
      const sp = new URLSearchParams();
      if (currentSearch) sp.set('q', currentSearch);
      if (currentStatus !== 'all') sp.set('status', currentStatus);
      if (currentRole !== 'all') sp.set('role', currentRole);
      if (currentPage > 1) sp.set('page', String(currentPage));
      for (const [k, v] of Object.entries(params)) {
        if (v && v !== 'all' && v !== '') sp.set(k, v);
        else sp.delete(k);
      }
      // Reset page on filter change
      if (params.q !== undefined || params.status !== undefined || params.role !== undefined) {
        sp.delete('page');
      }
      startTransition(() => {
        router.push(`${pathname}?${sp.toString()}`);
      });
    },
    [router, pathname, currentSearch, currentStatus, currentRole, currentPage],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      searchTimerRef.current = setTimeout(() => {
        navigate({ q: value });
      }, 350);
    },
    [navigate],
  );

  // Cleanup
  useEffect(
    () => () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    },
    [],
  );

  // ── CRUD ────────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingUser(null);
    form.reset({
      name: '',
      email: '',
      phoneNumber: '',
      company: '',
      role: 'USER',
      status: 'Active',
      password: '',
    });
    setSheetOpen(true);
  };

  const openEdit = (user: UserWithProfile) => {
    if (!canManageUser(currentUserRole, currentUserId, user)) {
      toast({ title: 'خطا', description: 'دسترسی کافی ندارید', variant: 'destructive' });
      return;
    }
    setEditingUser(user);
    form.reset({
      name: user.name ?? '',
      email: user.email,
      role: (user.role as Role) ?? 'USER',
      status: user.status ?? 'Active',
      phoneNumber: user.phoneNumber ?? '',
      company: user.profile?.company ?? '',
      password: '',
    });
    setSheetOpen(true);
  };

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    const result = editingUser
      ? await updateUser(editingUser.id, { ...data, password: undefined })
      : await createUser(data);

    if (result.success) {
      toast({ title: 'موفقیت', description: result.message, variant: 'success' });
      setSheetOpen(false);
      router.refresh();
    } else {
      toast({ title: 'خطا', description: result.message, variant: 'destructive' });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const result = await deleteUser(deleteTarget.id);
    setIsDeleting(false);
    if (result.success) {
      setDeleteTarget(null);
      toast({ title: 'موفقیت', description: result.message, variant: 'success' });
      router.refresh();
    } else {
      toast({ title: 'خطا', description: result.message, variant: 'destructive' });
    }
  };

  // ── Stats ────────────────────────────────────────────────────────────────

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={s.page}>
      <PageHeader
        variant="compact"
        breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: 'کاربران' }]}
        eyebrow="مدیریت"
        title="کاربران"
        description={`${_faNum.format(totalCount)} کاربر در سیستم`}
        icon="users"
        accent="indigo"
        actions={
          <button type="button" className={s.addBtn} onClick={openCreate}>
            <HiOutlinePlus className="size-4" aria-hidden />
            افزودن کاربر
          </button>
        }
      />

      {/* ── KPI Strip ── */}
      <div className={s.kpiStrip}>
        {[
          { icon: HiOutlineUsers, label: 'کل کاربران', value: totalCount, cls: '' },
          {
            icon: HiOutlineCheckCircle,
            label: 'فعال',
            value: users.filter((u) => u.status === 'Active').length,
            cls: s.kpiGreen,
          },
          {
            icon: HiOutlineClock,
            label: 'در انتظار',
            value: users.filter((u) => u.status === 'Pending').length,
            cls: s.kpiAmber,
          },
          {
            icon: HiOutlineNoSymbol,
            label: 'مسدود',
            value: users.filter((u) => u.status === 'Banned').length,
            cls: s.kpiRed,
          },
        ].map(({ icon: Icon, label, value, cls }, i) => (
          <div key={label} className={s.kpiItem} style={{ animationDelay: `${i * 50}ms` }}>
            <span className={`${s.kpiIcon} ${cls}`} aria-hidden>
              <Icon className="size-4" />
            </span>
            <span className={`${s.kpiVal} ${cls}`}>{_faNum.format(value)}</span>
            <span className={s.kpiLabel}>{label}</span>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className={s.filterBar}>
        <SearchInput
          value={searchInput}
          onChange={handleSearchChange}
          placeholder="جستجو بر اساس نام یا ایمیل…"
          ariaLabel="جستجوی کاربر"
        />

        <select
          className={s.filterSelect}
          value={currentStatus}
          onChange={(e) => navigate({ status: e.target.value })}
          aria-label="فیلتر وضعیت"
        >
          <option value="all">همه وضعیت‌ها</option>
          <option value="Active">فعال</option>
          <option value="Pending">در انتظار</option>
          <option value="Banned">مسدود</option>
          <option value="Rejected">رد شده</option>
        </select>

        <select
          className={s.filterSelect}
          value={currentRole}
          onChange={(e) => navigate({ role: e.target.value })}
          aria-label="فیلتر نقش"
        >
          <option value="all">همه نقش‌ها</option>
          <option value="USER">کاربر</option>
          <option value="AUTHOR">نویسنده</option>
          <option value="ADMIN">مدیر</option>
          {currentUserRole === 'OWNER' && <option value="OWNER">مالک</option>}
        </select>
      </div>

      {/* ── Table ── */}
      <div className={s.tableWrap}>
        {users.length === 0 ? (
          <div className={s.empty}>
            <HiOutlineUsers className={s.emptyIco} aria-hidden />
            <p className={s.emptyTitle}>کاربری یافت نشد</p>
            <p className={s.emptySub}>
              {currentSearch ? `جستجوی «${currentSearch}» نتیجه‌ای نداشت` : 'هنوز کاربری ثبت نشده'}
            </p>
          </div>
        ) : (
          <div className={s.tableScroll}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>کاربر</th>
                  <th>نقش</th>
                  <th>وضعیت</th>
                  <th>تاریخ عضویت</th>
                  <th aria-label="عملیات" />
                </tr>
              </thead>
              <tbody>
                {users.map((user, idx) => {
                  const manageable = canManageUser(currentUserRole, currentUserId, user);
                  const statusClass =
                    user.status === 'Active'
                      ? s.statusActive
                      : user.status === 'Banned'
                        ? s.statusBanned
                        : user.status === 'Pending'
                          ? s.statusPending
                          : s.statusDefault;
                  const roleClass =
                    user.role === 'OWNER' || user.role === 'SUPERADMIN'
                      ? s.roleOwner
                      : user.role === 'ADMIN'
                        ? s.roleAdmin
                        : user.role === 'AUTHOR'
                          ? s.roleAuthor
                          : s.roleUser;

                  return (
                    <tr key={user.id} className={s.row} style={{ animationDelay: `${idx * 30}ms` }}>
                      <td>
                        <div className={s.userCell}>
                          <div className={s.avatar} aria-hidden>
                            {user.profile?.avatar || user.image ? (
                              <Image
                                src={user.profile?.avatar ?? user.image ?? ''}
                                alt={user.name ?? ''}
                                fill
                                sizes="36px"
                                className={s.avatarImg}
                              />
                            ) : (
                              <span className={s.avatarInitials}>{getInitials(user.name)}</span>
                            )}
                          </div>
                          <div className={s.userInfo}>
                            <span className={s.userName}>{user.name ?? '—'}</span>
                            <span className={s.userEmail} dir="ltr">
                              {user.email}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`${s.badge} ${roleClass}`}>
                          {ROLE_LABELS[user.role ?? ''] ?? user.role}
                        </span>
                      </td>
                      <td>
                        <span className={`${s.badge} ${statusClass}`}>
                          {STATUS_LABELS[user.status ?? ''] ?? user.status}
                        </span>
                      </td>
                      <td className={s.dateCell}>—</td>
                      <td>
                        <div className={s.actions}>
                          <Link
                            href={`/dashboard/users/${user.id}`}
                            className={s.editBtn}
                            aria-label={`مشاهده ${user.name}`}
                          >
                            <HiOutlineEye className="size-3.5" aria-hidden />
                            <span className={s.btnLabel}>مشاهده</span>
                          </Link>
                          <button
                            type="button"
                            className={s.editBtn}
                            onClick={() => openEdit(user)}
                            disabled={!manageable || isPending}
                            aria-label={`ویرایش ${user.name}`}
                          >
                            <HiOutlinePencil className="size-3.5" aria-hidden />
                            <span className={s.btnLabel}>ویرایش</span>
                          </button>
                          <button
                            type="button"
                            className={s.deleteBtn}
                            onClick={() => setDeleteTarget(user)}
                            disabled={!manageable || isPending}
                            aria-label={`حذف ${user.name}`}
                          >
                            <HiOutlineTrash className="size-3.5" aria-hidden />
                            <span className={s.btnLabel}>حذف</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className={s.tableFoot}>
          <span className={s.footCount}>
            {_faNum.format(users.length)} از {_faNum.format(totalCount)} کاربر
          </span>
          {totalPages > 1 && (
            <nav className={s.pagination} aria-label="صفحه‌بندی">
              <button
                type="button"
                className={s.pageBtn}
                disabled={currentPage <= 1 || isPending}
                onClick={() => navigate({ page: String(currentPage - 1) })}
              >
                قبلی
              </button>
              <span className={s.pageInfo}>
                {_faNum.format(currentPage)} / {_faNum.format(totalPages)}
              </span>
              <button
                type="button"
                className={s.pageBtn}
                disabled={currentPage >= totalPages || isPending}
                onClick={() => navigate({ page: String(currentPage + 1) })}
              >
                بعدی
              </button>
            </nav>
          )}
        </div>
      </div>

      {/* ── Create / Edit Modal ── */}
      <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
        <DialogPortal>
          <DialogOverlay className={cm.overlay} />
          <DialogPrimitive.Content
            dir="rtl"
            className={cm.panel}
            aria-label={editingUser ? 'ویرایش کاربر' : 'افزودن کاربر'}
          >
            <div className={cm.header}>
              <div className={s.sheetIcon} aria-hidden>
                {editingUser ? (
                  <HiOutlinePencil className="size-4" />
                ) : (
                  <HiOutlinePlus className="size-4" />
                )}
              </div>
              <div>
                <SheetTitle className={s.sheetTitle}>
                  {editingUser ? 'ویرایش کاربر' : 'افزودن کاربر جدید'}
                </SheetTitle>
                <p className={s.sheetSub}>
                  {editingUser
                    ? 'تغییر نقش، وضعیت یا اطلاعات حساب'
                    : 'اطلاعات حساب، نقش و دسترسی‌ها'}
                </p>
              </div>
              <DialogClose className={cm.close} aria-label="بستن">
                <HiOutlineXMark className="size-4" aria-hidden />
              </DialogClose>
            </div>

            <div className={cm.body}>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className={s.form}>
                  <div className={s.formGrid}>
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={s.label}>
                            <HiOutlineUser className="size-4" aria-hidden /> نام
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="نام کاربر" {...field} className={s.input} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={s.label}>
                            <HiOutlineEnvelope className="size-4" aria-hidden /> ایمیل
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="ایمیل"
                              type="email"
                              {...field}
                              className={s.input}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {!editingUser && (
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={s.label}>
                            <HiOutlineLockClosed className="size-4" aria-hidden /> رمز عبور
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="رمز عبور"
                              type="password"
                              {...field}
                              className={s.input}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <div className={s.formGrid}>
                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={s.label}>
                            <HiOutlinePhone className="size-4" aria-hidden /> شماره تلفن
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="شماره تلفن" {...field} className={s.input} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={s.label}>
                            <HiOutlineUserGroup className="size-4" aria-hidden /> نقش
                          </FormLabel>
                          <Select dir="rtl" onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className={s.input}>
                                <SelectValue placeholder="انتخاب نقش" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="USER">کاربر</SelectItem>
                              <SelectItem value="AUTHOR">نویسنده</SelectItem>
                              {(currentUserRole === 'OWNER' ||
                                currentUserRole === 'SUPERADMIN') && (
                                <>
                                  <SelectItem value="ADMIN">مدیر</SelectItem>
                                  <SelectItem value="OWNER">مالک</SelectItem>
                                </>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={s.label}>
                          <HiOutlineCheckCircle className="size-4" aria-hidden /> وضعیت
                        </FormLabel>
                        <Select dir="rtl" onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className={s.input}>
                              <SelectValue placeholder="انتخاب وضعیت" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Active">فعال</SelectItem>
                            <SelectItem value="Pending">در انتظار</SelectItem>
                            <SelectItem value="Banned">مسدود</SelectItem>
                            <SelectItem value="Rejected">رد شده</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className={s.formFooter}>
                    <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>
                      انصراف
                    </Button>
                    <SubmitButton isSubmitting={form.formState.isSubmitting} />
                  </div>
                </form>
              </Form>
            </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>

      {/* ── Confirm Delete ── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="حذف کاربر"
        description={`آیا مطمئن هستید که می‌خواهید کاربر «${deleteTarget?.name ?? ''}» را حذف کنید؟ این عملیات برگشت‌پذیر نیست.`}
        confirmLabel="بله، حذف کن"
        cancelLabel="انصراف"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        loading={isDeleting}
      />
    </div>
  );
}
