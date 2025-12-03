'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, type UseFormReturn, type SubmitHandler } from 'react-hook-form';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineUsers } from 'react-icons/hi2';
import Image from 'next/image';
import { getUsers, createUser, updateUser, deleteUser } from '@/actions/userActions';
import type { Role, UserWithProfile } from '@/types/types';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SubmitButton from '@/components/SubmitButton';
import LoadingMore from '@/components/LoadingMore';
import Loading from '@/components/Loading';
import { useSession } from 'next-auth/react';
import {
  DashboardPageHeader,
  DashboardSearchInput,
  DashboardTableContainer,
  DashboardTable,
  DashboardTableHeader,
  DashboardTableHead,
  DashboardTableBody,
  DashboardTableRow,
  DashboardTableCell,
  StatusBadge,
  ActionButton,
  PrimaryActionButton,
  EmptyState,
  FilterSelect,
} from '@/components/Dashboard/shared/DashboardTableWrapper';

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
  SUPER_ADMIN: 'سوپر ادمین',
};

const statusLabels: Record<string, string> = {
  Active: 'فعال',
  Pending: 'در انتظار',
  Banned: 'مسدود شده',
  Rejected: 'رد شده',
};


const getStatusVariant = (status: string) => {
  switch (status) {
    case 'Active': return 'success';
    case 'Pending': return 'warning';
    case 'Banned': return 'danger';
    case 'Rejected': return 'default';
    default: return 'default';
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
    [toast, statusFilter, roleFilter]
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
    if (currentUserRole === 'SUPER_ADMIN') return true;
    if (currentUserRole === 'ADMIN') {
      return targetUser.role !== 'SUPER_ADMIN' && targetUser.role !== 'ADMIN';
    }
    return false;
  };

  const canChangeRole = (newRole: Role) => {
    if (currentUserRole === 'SUPER_ADMIN') return true;
    if (currentUserRole === 'ADMIN') {
      return ['USER', 'AUTHOR'].includes(newRole);
    }
    return false;
  };

  const handleEdit = (user: UserWithProfile) => {
    if (!canManageUser(user)) {
      toast({ title: 'خطا', description: 'شما دسترسی لازم برای ویرایش این کاربر را ندارید', variant: 'destructive' });
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
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (id: string, userRole?: Role) => {
    if (id === currentUserId) {
      toast({ title: 'خطا', description: 'شما نمی‌توانید حساب خود را حذف کنید', variant: 'destructive' });
      return;
    }
    const role = userRole || 'USER';
    if (!canManageUser({ id, role } as UserWithProfile)) {
      toast({ title: 'خطا', description: 'شما دسترسی لازم برای حذف این کاربر را ندارید', variant: 'destructive' });
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
      toast({ title: 'خطا', description: 'شما دسترسی لازم برای ویرایش این کاربر را ندارید', variant: 'destructive' });
      return;
    }
    if (!canChangeRole(data.role as Role)) {
      toast({ title: 'خطا', description: 'شما دسترسی لازم برای تغییر به این نقش را ندارید', variant: 'destructive' });
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
    ...(currentUserRole === 'SUPER_ADMIN' ? [{ value: 'SUPER_ADMIN', label: 'سوپر ادمین' }] : []),
  ];


  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-primary-50/30 p-4 sm:p-6 lg:p-8 dark:from-neutral-900 dark:via-neutral-900 dark:to-primary-950/20" dir="rtl">
      <DashboardPageHeader title="مدیریت کاربران" description="مشاهده و مدیریت کاربران سیستم">
        <FilterSelect value={statusFilter} onChange={setStatusFilter} options={statusOptions} />
        <FilterSelect value={roleFilter} onChange={setRoleFilter} options={roleOptions} />
        <DashboardSearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="جستجوی کاربر..."
        />
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <PrimaryActionButton onClick={() => { setEditingUser(null); form.reset(); }}>
              <HiOutlinePlus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
              <span>افزودن کاربر</span>
            </PrimaryActionButton>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl border-neutral-200/60 bg-white/95 p-0 shadow-2xl backdrop-blur-xl dark:border-neutral-700/50 dark:bg-neutral-800/95" dir="rtl">
            <DialogHeader className="border-b border-neutral-200/60 bg-gradient-to-l from-neutral-50 to-white px-6 py-5 dark:border-neutral-700/50 dark:from-neutral-800 dark:to-neutral-800">
              <DialogTitle className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
                افزودن کاربر جدید
              </DialogTitle>
            </DialogHeader>
            <div className="max-h-[calc(90vh-120px)] overflow-y-auto p-6">
              <UserForm form={form} onSubmit={onSubmit} />
            </div>
          </DialogContent>
        </Dialog>
      </DashboardPageHeader>

      {isLoading && page === 1 ? (
        <Loading />
      ) : users.length === 0 ? (
        <DashboardTableContainer>
          <EmptyState
            title="کاربری یافت نشد"
            description="هنوز هیچ کاربری در سیستم ثبت نشده است."
            icon={<HiOutlineUsers className="h-8 w-8 text-neutral-400" />}
          />
        </DashboardTableContainer>
      ) : (
        <DashboardTableContainer>
          <DashboardTable>
            <DashboardTableHeader>
              <tr>
                <DashboardTableHead>کاربر</DashboardTableHead>
                <DashboardTableHead>نقش</DashboardTableHead>
                <DashboardTableHead hidden>وضعیت</DashboardTableHead>
                <DashboardTableHead>عملیات</DashboardTableHead>
              </tr>
            </DashboardTableHeader>
            <DashboardTableBody>
              {users.map((user) => (
                <DashboardTableRow key={user.id}>
                  <DashboardTableCell>
                    <div className="flex items-center gap-4">
                      <div className="relative h-11 w-11 overflow-hidden rounded-full ring-2 ring-white shadow-md dark:ring-neutral-700">
                        <Image
                          src={
                            user.profile?.avatar ||
                            user.image ||
                            `https://avatar.vercel.sh/${encodeURIComponent(user.name || '')}?size=80`
                          }
                          alt={user.name || ''}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-neutral-900 dark:text-neutral-100">
                          {user.name}
                        </p>
                        <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </DashboardTableCell>
                  <DashboardTableCell>
                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      {roleLabels[user.role] || user.role}
                    </span>
                  </DashboardTableCell>
                  <DashboardTableCell hidden>
                    <StatusBadge
                      status={statusLabels[user.status] || user.status}
                      variant={getStatusVariant(user.status) as any}
                    />
                  </DashboardTableCell>
                  <DashboardTableCell>
                    <div className="flex items-center gap-2">
                      <ActionButton variant="edit" onClick={() => handleEdit(user)}>
                        <HiOutlinePencil className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">ویرایش</span>
                      </ActionButton>
                      <ActionButton variant="delete" onClick={() => handleDelete(user.id, user.role as Role)}>
                        <HiOutlineTrash className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">حذف</span>
                      </ActionButton>
                    </div>
                  </DashboardTableCell>
                </DashboardTableRow>
              ))}
            </DashboardTableBody>
          </DashboardTable>
          {isLoading && page > 1 && <LoadingMore message="در حال دریافت کاربران بیشتر..." />}
          <div ref={infiniteScrollRef} style={{ height: '1px' }} />
        </DashboardTableContainer>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl border-neutral-200/60 bg-white/95 p-0 shadow-2xl backdrop-blur-xl dark:border-neutral-700/50 dark:bg-neutral-800/95" dir="rtl">
          <DialogHeader className="border-b border-neutral-200/60 bg-gradient-to-l from-neutral-50 to-white px-6 py-5 dark:border-neutral-700/50 dark:from-neutral-800 dark:to-neutral-800">
            <DialogTitle className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
              ویرایش کاربر
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[calc(90vh-120px)] overflow-y-auto p-6">
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-neutral-700 dark:text-neutral-300">نام</FormLabel>
                <FormControl>
                  <Input
                    placeholder="نام کاربر"
                    {...field}
                    className="h-11 rounded-xl border-neutral-200/60 bg-white/80 transition-all duration-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700/60 dark:bg-neutral-800/80"
                  />
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
                <FormLabel className="text-sm font-medium text-neutral-700 dark:text-neutral-300">ایمیل</FormLabel>
                <FormControl>
                  <Input
                    placeholder="ایمیل کاربر"
                    type="email"
                    {...field}
                    className="h-11 rounded-xl border-neutral-200/60 bg-white/80 transition-all duration-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700/60 dark:bg-neutral-800/80"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-neutral-700 dark:text-neutral-300">رمز عبور</FormLabel>
                <FormControl>
                  <Input
                    placeholder="رمز عبور کاربر"
                    type="password"
                    {...field}
                    className="h-11 rounded-xl border-neutral-200/60 bg-white/80 transition-all duration-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700/60 dark:bg-neutral-800/80"
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
                <FormLabel className="text-sm font-medium text-neutral-700 dark:text-neutral-300">شماره تلفن</FormLabel>
                <FormControl>
                  <Input
                    placeholder="شماره تلفن کاربر"
                    {...field}
                    className="h-11 rounded-xl border-neutral-200/60 bg-white/80 transition-all duration-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700/60 dark:bg-neutral-800/80"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-neutral-700 dark:text-neutral-300">نقش</FormLabel>
                <Select dir="rtl" onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-11 rounded-xl border-neutral-200/60 bg-white/80 transition-all duration-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700/60 dark:bg-neutral-800/80">
                      <SelectValue placeholder="انتخاب نقش" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="USER">کاربر عادی</SelectItem>
                    <SelectItem value="AUTHOR">نویسنده</SelectItem>
                    {currentUserRole === 'SUPER_ADMIN' && (
                      <>
                        <SelectItem value="ADMIN">مدیر</SelectItem>
                        <SelectItem value="SUPER_ADMIN">سوپر ادمین</SelectItem>
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
                <FormLabel className="text-sm font-medium text-neutral-700 dark:text-neutral-300">وضعیت</FormLabel>
                <Select dir="rtl" onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-11 rounded-xl border-neutral-200/60 bg-white/80 transition-all duration-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700/60 dark:bg-neutral-800/80">
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

        <div className="pt-4">
          <SubmitButton isSubmitting={form.formState.isSubmitting} />
        </div>
      </form>
    </Form>
  );
}
