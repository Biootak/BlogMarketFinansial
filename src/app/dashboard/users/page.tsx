'use client';

import { createUser, deleteUser, getUsers, updateUser } from '@/actions/userActions';
import { PageHeader } from '@/components/Dashboard/primitives';
import LoadingMore from '@/components/LoadingMore';
import { UsersTableSkeleton } from '@/components/Skeletons';
import SubmitButton from '@/components/SubmitButton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import type { Role, UserWithProfile } from '@/types/types';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { type SubmitHandler, type UseFormReturn, useForm } from 'react-hook-form';
import {
  HiOutlineCheckCircle,
  HiOutlineEnvelope,
  HiOutlineLockClosed,
  HiOutlinePencil,
  HiOutlinePhone,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineUser,
  HiOutlineUserGroup,
  HiOutlineUsers,
} from 'react-icons/hi2';
import { HiMagnifyingGlass } from 'react-icons/hi2';

type FormData = {
  name: string;
  email: string;
  phoneNumber: string;
  company: string;
  role: Role;
  status: string;
  password: string;
};

type UserFormProps = {
  form: UseFormReturn<FormData>;
  onSubmit: SubmitHandler<FormData>;
};

const roleLabels: Record<string, string> = {
  USER: 'کاربر عادی',
  AUTHOR: 'نویسنده',
  ADMIN: 'مدیر',
  OWNER: 'مالک',
};

const statusLabels: Record<string, string> = {
  Active: 'فعال',
  Pending: 'در انتظار',
  Banned: 'مسدود شده',
  Rejected: 'رد شده',
};

const getAtBadgeVariant = (status?: string | null) => {
  switch (status) {
    case 'Active':
      return 'published' as const;
    case 'Pending':
      return 'pending' as const;
    case 'Banned':
      return 'danger' as const;
    case 'Rejected':
      return 'draft' as const;
    default:
      return 'draft' as const;
  }
};

const getRoleBadgeStyle = (role?: string) => {
  switch (role) {
    case 'OWNER':
      return 'background:var(--at-gold-soft); color:var(--at-gold-fg); border-color:color-mix(in oklch, var(--at-gold) 28%, transparent);';
    case 'ADMIN':
      return 'background:color-mix(in oklch, var(--at-info) 12%, var(--at-bg)); color:var(--at-info); border-color:color-mix(in oklch, var(--at-info) 28%, transparent);';
    case 'AUTHOR':
      return 'background:var(--at-accent-soft); color:var(--at-accent-fg); border-color:color-mix(in oklch, var(--at-accent) 25%, transparent);';
    default:
      return '';
  }
};

export default function UsersPage() {
  const { data: session } = useSession();
  const currentUserRole = session?.user?.role;
  const currentUserId = session?.user?.id;

  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('All');
  const [editingUser, setEditingUser] = useState<UserWithProfile | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);

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

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
    setUsers([]);
    fetchUsers(1, debouncedSearchTerm);
  }, [debouncedSearchTerm, statusFilter, roleFilter]);

  const fetchUsers = useCallback(
    async (pageNumber: number, search: string) => {
      setIsLoading(true);
      const result = await getUsers({
        limit: 10,
        page: pageNumber,
        search: search,
        status: statusFilter !== 'All' ? statusFilter : undefined,
        role: roleFilter !== 'All' ? roleFilter : undefined,
      });
      if (result.success) {
        if (pageNumber === 1) {
          setUsers(result.data?.users ?? []);
        } else {
          setUsers((prev) => [...prev, ...(result.data?.users ?? [])]);
        }
        setHasNextPage((result.data?.users?.length ?? 0) === 10);
      } else {
        toast({ title: 'خطا', description: result.message, variant: 'destructive' });
      }
      setIsLoading(false);
    },
    [toast, statusFilter, roleFilter],
  );

  const loadMore = useCallback(() => {
    if (hasNextPage && !isLoading) {
      setPage((prev) => prev + 1);
      fetchUsers(page + 1, debouncedSearchTerm);
    }
  }, [fetchUsers, hasNextPage, isLoading, page, debouncedSearchTerm]);

  const infiniteScrollRef = useInfiniteScroll(loadMore, hasNextPage, isLoading);

  const canManageUser = (targetUser: UserWithProfile) => {
    if (!currentUserRole || !currentUserId) return false;
    if (currentUserRole === 'OWNER') return true;
    if (currentUserRole === 'ADMIN') {
      return targetUser.role !== 'OWNER' && targetUser.role !== 'ADMIN';
    }
    return false;
  };

  const canChangeRole = (newRole: Role) => {
    if (currentUserRole === 'OWNER') return true;
    if (currentUserRole === 'ADMIN') {
      return ['USER', 'AUTHOR'].includes(newRole);
    }
    return false;
  };

  const handleEdit = (user: UserWithProfile) => {
    if (!canManageUser(user)) {
      toast({
        title: 'خطا',
        description: 'شما دسترسی لازم برای ویرایش این کاربر را ندارید',
        variant: 'destructive',
      });
      return;
    }
    setEditingUser(user);
    form.reset({
      name: user.name || '',
      email: user.email,
      role: user.role as Role,
      status: user.status as string,
      phoneNumber: user?.phoneNumber ?? '',
      company: user.profile?.company || '',
      password: '',
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (id: string, userRole?: Role) => {
    if (id === currentUserId) {
      toast({
        title: 'خطا',
        description: 'شما نمی‌توانید حساب خود را حذف کنید',
        variant: 'destructive',
      });
      return;
    }
    const role = userRole || 'USER';
    if (!canManageUser({ id, role } as UserWithProfile)) {
      toast({
        title: 'خطا',
        description: 'شما دسترسی لازم برای حذف این کاربر را ندارید',
        variant: 'destructive',
      });
      return;
    }
    if (window.confirm('آیا مطمئن هستید که می‌خواهید این کاربر را حذف کنید؟')) {
      const result = await deleteUser(id);
      if (result.success) {
        fetchUsers(1, debouncedSearchTerm);
        toast({ title: 'موفقیت', description: result.message, variant: 'success' });
      } else {
        toast({ title: 'خطا', description: result.message, variant: 'destructive' });
      }
    }
  };

  const onSubmit = async (data: FormData) => {
    if (editingUser && !canManageUser(editingUser)) {
      toast({
        title: 'خطا',
        description: 'شما دسترسی لازم برای ویرایش این کاربر را ندارید',
        variant: 'destructive',
      });
      return;
    }
    if (!canChangeRole(data.role as Role)) {
      toast({
        title: 'خطا',
        description: 'شما دسترسی لازم برای تغییر به این نقش را ندارید',
        variant: 'destructive',
      });
      return;
    }
    const result = editingUser
      ? await updateUser(editingUser.id, { ...data, password: undefined })
      : await createUser(data);

    if (result.success) {
      fetchUsers(1, debouncedSearchTerm);
      form.reset();
      setEditingUser(null);
      setIsDialogOpen(false);
      setIsEditDialogOpen(false);
      toast({ title: 'موفقیت', description: result.message, variant: 'success' });
    } else {
      toast({ title: 'خطا', description: result.message, variant: 'destructive' });
    }
  };

  const statusOptions = [
    { value: 'All', label: 'همه وضعیت‌ها' },
    { value: 'Active', label: 'فعال' },
    { value: 'Pending', label: 'در انتظار' },
    { value: 'Banned', label: 'مسدود شده' },
    { value: 'Rejected', label: 'رد شده' },
  ];

  const roleOptions = [
    { value: 'All', label: 'همه نقش‌ها' },
    { value: 'USER', label: 'کاربر عادی' },
    { value: 'AUTHOR', label: 'نویسنده' },
    { value: 'ADMIN', label: 'مدیر' },
    ...(currentUserRole === 'OWNER' ? [{ value: 'OWNER', label: 'مالک' }] : []),
  ];

  return (
    <div className="at-page" dir="rtl">
      <PageHeader
        breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: 'کاربران' }]}
        eyebrow="تیم"
        title="کاربران"
        description="مدیریت اعضا، نقش‌ها و دسترسی‌ها"
        actions={
          <button
            onClick={() => {
              setEditingUser(null);
              form.reset();
              setIsDialogOpen(true);
            }}
            className="at-btn at-btn--primary"
          >
            <HiOutlinePlus className="size-4" />
            افزودن کاربر
          </button>
        }
      />

      {/* KPI strip — atelier */}
      <div className="at-stats">
        <div className="at-stat">
          <div className="at-stat__ico">
            <HiOutlineUsers className="size-4" />
          </div>
          <div className="at-stat__main">
            <div className="at-stat__value">{users.length}</div>
            <div className="at-stat__label">کاربران این صفحه</div>
          </div>
        </div>
        <div className="at-stat">
          <div className="at-stat__ico at-stat__ico--amber">
            <HiOutlineUserGroup className="size-4" />
          </div>
          <div className="at-stat__main">
            <div className="at-stat__value">
              {users.filter((u) => u.status === 'Pending').length}
            </div>
            <div className="at-stat__label">در انتظار فعال‌سازی</div>
          </div>
        </div>
        <div className="at-stat">
          <div className="at-stat__ico at-stat__ico--blue">
            <HiOutlineCheckCircle className="size-4" />
          </div>
          <div className="at-stat__main">
            <div className="at-stat__value">
              {users.filter((u) => u.status === 'Active').length}
            </div>
            <div className="at-stat__label">فعال</div>
          </div>
        </div>
        <div className="at-stat">
          <div className="at-stat__ico at-stat__ico--rose">
            <HiOutlineTrash className="size-4" />
          </div>
          <div className="at-stat__main">
            <div className="at-stat__value">
              {users.filter((u) => u.status === 'Banned').length}
            </div>
            <div className="at-stat__label">مسدود شده</div>
          </div>
        </div>
      </div>

      {/* Filter bar — atelier */}
      <div className="at-filterbar">
        <div className="at-filterbar__search">
          <input
            type="text"
            placeholder="جستجوی کاربر..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <HiMagnifyingGlass className="at-filterbar__search__ico size-4" />
        </div>
        <select
          className="at-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {statusOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          className="at-select"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          {roleOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* User table */}
      <div className="at-table">
        {isLoading && page === 1 ? (
          <UsersTableSkeleton rows={8} />
        ) : users.length === 0 ? (
          <div className="at-empty">
            <div className="at-empty__ico">
              <HiOutlineUsers className="size-5" />
            </div>
            <div className="at-empty__title">کاربری یافت نشد</div>
            <div className="at-empty__sub">هنوز هیچ کاربری در سیستم ثبت نشده است.</div>
          </div>
        ) : (
          <>
            <div className="at-table__scroll">
              <table>
                <thead>
                  <tr>
                    <th>کاربر</th>
                    <th>نقش</th>
                    <th className="hidden sm:table-cell">وضعیت</th>
                    <th>عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="at-thumb"
                            style={{ borderRadius: '50%', width: '40px', height: '40px' }}
                          >
                            <Image
                              src={
                                user.profile?.avatar ||
                                user.image ||
                                `https://avatar.vercel.sh/${encodeURIComponent(user.name || '')}?size=80`
                              }
                              alt={user.name || ''}
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-[color:var(--at-fg)] text-sm">
                              {user.name}
                            </p>
                            <p
                              className="truncate text-xs text-[color:var(--at-fg-subtle)]"
                              dir="ltr"
                            >
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          className="at-badge"
                          style={{
                            fontSize: '11px',
                            ...Object.fromEntries(
                              getRoleBadgeStyle(user.role ?? '')
                                .split(';')
                                .filter(Boolean)
                                .map((s) => s.split(':').map((x) => x.trim())),
                            ),
                          }}
                        >
                          {roleLabels[user.role ?? ''] || user.role}
                        </span>
                      </td>
                      <td className="hidden sm:table-cell">
                        <span
                          className={`at-badge at-badge--${getAtBadgeVariant(user.status ?? '')}`}
                        >
                          {statusLabels[user.status ?? ''] || user.status || ''}
                        </span>
                      </td>
                      <td>
                        <div className="at-actions">
                          <button
                            onClick={() => handleEdit(user)}
                            className="at-actions__btn at-actions__btn--edit"
                            title="ویرایش"
                          >
                            <HiOutlinePencil className="size-3.5" />
                            <span className="hidden sm:inline">ویرایش</span>
                          </button>
                          <button
                            onClick={() => handleDelete(user.id, user.role as Role)}
                            className="at-actions__btn at-actions__btn--danger"
                            title="حذف"
                          >
                            <HiOutlineTrash className="size-3.5" />
                            <span className="hidden sm:inline">حذف</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {isLoading && page > 1 && <LoadingMore message="در حال دریافت کاربران بیشتر..." />}
            <div className="at-table__foot">
              <span>{users.length} کاربر نمایش داده شده</span>
              {hasNextPage && <span>اسکرول برای بارگذاری بیشتر</span>}
            </div>
            <div ref={infiniteScrollRef} style={{ height: '1px' }} />
          </>
        )}
      </div>

      {/* Dialogs */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent
          className="at-dialog-content max-h-[90vh] w-full max-w-2xl p-0 overflow-hidden"
          dir="rtl"
        >
          <div className="at-dialog-header">
            <div className="at-dialog-title">
              <span className="at-dialog-title__ico">
                <HiOutlinePlus className="size-4" />
              </span>
              <div>
                <div>افزودن کاربر جدید</div>
                <div className="at-dialog-sub">اطلاعات حساب، نقش و دسترسی‌ها</div>
              </div>
            </div>
          </div>
          <div className="at-dialog-body" style={{ padding: '20px 22px' }}>
            <UserForm form={form} onSubmit={onSubmit} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent
          className="at-dialog-content max-h-[90vh] w-full max-w-2xl p-0 overflow-hidden"
          dir="rtl"
        >
          <div className="at-dialog-header">
            <div className="at-dialog-title">
              <span className="at-dialog-title__ico">
                <HiOutlinePencil className="size-4" />
              </span>
              <div>
                <div>ویرایش کاربر</div>
                <div className="at-dialog-sub">تغییر نقش، وضعیت یا اطلاعات حساب</div>
              </div>
            </div>
          </div>
          <div className="at-dialog-body" style={{ padding: '20px 22px' }}>
            <UserForm form={form} onSubmit={onSubmit} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UserForm({ form, onSubmit }: UserFormProps) {
  const { data: session } = useSession();
  const currentUserRole = session?.user?.role;

  const inputClass = 'at-input';
  const selectTriggerClass = 'at-input flex items-center h-auto py-2.5';

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="at-form-stack" dir="rtl">
        <div className="at-form-grid">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <label className="at-field__label">
                  <HiOutlineUser className="at-field__ico at-field__ico--emerald size-4" />
                  نام
                </label>
                <FormControl>
                  <Input placeholder="نام کاربر" {...field} className={inputClass} />
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
                <label className="at-field__label">
                  <HiOutlineEnvelope className="at-field__ico at-field__ico--blue size-4" />
                  ایمیل
                </label>
                <FormControl>
                  <Input placeholder="ایمیل کاربر" type="email" {...field} className={inputClass} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="at-form-grid">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <label className="at-field__label">
                  <HiOutlineLockClosed className="at-field__ico size-4" />
                  رمز عبور
                </label>
                <FormControl>
                  <Input
                    placeholder="رمز عبور کاربر"
                    type="password"
                    {...field}
                    className={inputClass}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <label className="at-field__label">
                  <HiOutlinePhone className="at-field__ico size-4" />
                  شماره تلفن
                </label>
                <FormControl>
                  <Input placeholder="شماره تلفن کاربر" {...field} className={inputClass} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="at-form-grid">
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <label className="at-field__label">
                  <HiOutlineUserGroup className="at-field__ico at-field__ico--emerald size-4" />
                  نقش
                </label>
                <Select dir="rtl" onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className={selectTriggerClass}>
                      <SelectValue placeholder="انتخاب نقش" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="USER">کاربر عادی</SelectItem>
                    <SelectItem value="AUTHOR">نویسنده</SelectItem>
                    {currentUserRole === 'OWNER' && (
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
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <label className="at-field__label">
                  <HiOutlineCheckCircle className="at-field__ico at-field__ico--amber size-4" />
                  وضعیت
                </label>
                <Select dir="rtl" onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className={selectTriggerClass}>
                      <SelectValue placeholder="انتخاب وضعیت" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Active">فعال</SelectItem>
                    <SelectItem value="Pending">در انتظار</SelectItem>
                    <SelectItem value="Banned">مسدود شده</SelectItem>
                    <SelectItem value="Rejected">رد شده</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div
          className="at-dialog-foot"
          style={{ marginInlineStart: '-22px', marginInlineEnd: '-22px', marginBottom: '-20px' }}
        >
          <button type="button" className="at-btn at-btn--ghost" onClick={() => form.reset()}>
            انصراف
          </button>
          <SubmitButton isSubmitting={form.formState.isSubmitting} />
        </div>
      </form>
    </Form>
  );
}
