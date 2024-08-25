'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, type UseFormReturn, type SubmitHandler } from 'react-hook-form';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiMagnifyingGlass } from 'react-icons/hi2';
import Image from 'next/image';
import { getUsers, createUser, updateUser, deleteUser } from '@/actions/userActions';
import type { Role, UserWithProfile } from '@/types/types';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/components/ui/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import ButtonPrimary from '@/components/Button/ButtonPrimary';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import SubmitButton from '@/components/SubmitButton';
import LoadingMore from '@/components/LoadingMore';

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

export default function UsersPage() {
  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('All');
  const [editingUser, setEditingUser] = useState<UserWithProfile | null>(null);
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

  const fetchUsers = async (pageNumber: number) => {
    setIsLoading(true);
    const result = await getUsers({
      limit: 10,
      page: pageNumber,
      search: searchTerm,
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
      toast({
        title: 'خطا',
        description: result.message,
        variant: 'destructive',
      });
    }
    setIsLoading(false);
  };

  const memoizedFetchUsers = useCallback(fetchUsers, []);

  useEffect(() => {
    memoizedFetchUsers(1);
  }, [memoizedFetchUsers]);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isLoading) {
      setPage((prev) => prev + 1);
      memoizedFetchUsers(page + 1);
    }
  }, [hasNextPage, isLoading, page, memoizedFetchUsers]);

  const infiniteScrollRef = useInfiniteScroll(loadMore, hasNextPage, isLoading);

  const onSubmit = async (data: FormData) => {
    const result = editingUser
      ? await updateUser(editingUser.id, { ...data, password: undefined })
      : await createUser(data);

    if (result.success) {
      fetchUsers(1);
      form.reset();
      setEditingUser(null);
      setIsEditDialogOpen(false);
      toast({
        title: 'موفقیت',
        description: result.message,
        variant: 'success',
      });
    } else {
      toast({
        title: 'خطا',
        description: result.message,
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (user: UserWithProfile) => {
    setEditingUser(user);
    form.reset({
      name: user.name || '',
      email: user.email,
      phoneNumber: user.phoneNumber || '',
      role: user.role,
      status: user.status,
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('آیا مطمئن هستید که می‌خواهید این کاربر را حذف کنید؟')) {
      const result = await deleteUser(id);
      if (result.success) {
        fetchUsers(1);
        toast({
          title: 'موفقیت',
          description: result.message,
          variant: 'success',
        });
      } else {
        toast({
          title: 'خطا',
          description: result.message,
          variant: 'destructive',
        });
      }
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phoneNumber?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="container mx-auto p-8 rtl">
      <h1 className="text-3xl font-bold mb-8 text-right text-primary-700 dark:text-primary-300">
        مدیریت کاربران
      </h1>

      <div className="flex justify-between items-center mb-8">
        <Dialog>
          <DialogTrigger asChild>
            <ButtonPrimary
              aria-label="افزودن کاربر جدید"
              className="bg-gradient-to-l from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white font-medium py-2 px-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group"
            >
              <HiOutlinePlus
                className="inline-block ml-2 h-5 w-5 group-hover:rotate-90 transition-transform duration-300"
                aria-hidden="true"
              />
              <span className="group-hover:mr-2 transition-all duration-300">
                افزودن کاربر جدید
              </span>
            </ButtonPrimary>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>افزودن کاربر جدید</DialogTitle>
            </DialogHeader>
            <UserForm form={form} onSubmit={onSubmit} />
          </DialogContent>
        </Dialog>

        <div className="flex items-center space-x-4 space-x-reverse">
          <Select dir="rtl" value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="وضعیت" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">همه</SelectItem>
              <SelectItem value="Active">فعال</SelectItem>
              <SelectItem value="Pending">در انتظار</SelectItem>
              <SelectItem value="Banned">مسدود شده</SelectItem>
              <SelectItem value="Rejected">رد شده</SelectItem>
            </SelectContent>
          </Select>

          <Select dir="rtl" value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="نقش" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">همه</SelectItem>
              <SelectItem value="USER">کاربر عادی</SelectItem>
              <SelectItem value="AUTHOR">نویسنده</SelectItem>
              <SelectItem value="ADMIN">مدیر</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative">
            <Input
              type="text"
              placeholder="جستجو..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10 pl-4 py-2 w-64"
            />
            <HiMagnifyingGlass className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
        </div>
      </div>

      {isLoading && page === 1 ? (
        <p className="text-center text-xl text-gray-600">در حال بارگذاری...</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">نام</TableHead>
                <TableHead className="text-right">شماره تلفن</TableHead>
                <TableHead className="text-right">نقش</TableHead>
                <TableHead className="text-right">وضعیت</TableHead>
                <TableHead className="text-right">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center">
                      <Image
                        src={
                          user.image ||
                          `https://avatar.vercel.sh/${encodeURIComponent(user.name || '')}?size=80`
                        }
                        alt={user.name || ''}
                        width={40}
                        height={40}
                        className="rounded-full ml-3"
                      />
                      <div>
                        <p className="font-semibold">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{user.phoneNumber}</TableCell>
                  <TableCell>
                    {user.role === 'USER'
                      ? 'کاربر عادی'
                      : user.role === 'AUTHOR'
                        ? 'نویسنده'
                        : 'مدیر'}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        user.status === 'Active'
                          ? 'bg-green-100 text-green-800'
                          : user.status === 'Pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : user.status === 'Banned'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {user.status === 'Active'
                        ? 'فعال'
                        : user.status === 'Pending'
                          ? 'در انتظار'
                          : user.status === 'Banned'
                            ? 'مسدود شده'
                            : 'رد شده'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2 space-x-reverse">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(user)}>
                        <HiOutlinePencil className="ml-1" />
                        ویرایش
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(user.id)}
                        className="text-red-600 border-red-600 hover:bg-red-50"
                      >
                        <HiOutlineTrash className="ml-1" />
                        حذف
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {isLoading && page > 1 && <LoadingMore message="در حال دریافت کاربر بیشتر..." />}
          <div ref={infiniteScrollRef} style={{ height: '1px' }} />
        </div>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ویرایش کاربر</DialogTitle>
          </DialogHeader>
          <UserForm form={form} onSubmit={onSubmit} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UserForm({ form, onSubmit }: UserFormProps) {
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
        style={{ direction: 'rtl' }}
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>نام</FormLabel>
              <FormControl>
                <Input {...field} />
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
              <FormLabel>ایمیل</FormLabel>
              <FormControl>
                <Input {...field} type="email" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>رمز عبور</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
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
              <FormLabel>شماره تلفن</FormLabel>
              <FormControl>
                <Input {...field} />
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
              <FormLabel>نقش</FormLabel>
              <Select dir="rtl" onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="انتخاب نقش" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="USER">کاربر عادی</SelectItem>
                  <SelectItem value="AUTHOR">نویسنده</SelectItem>
                  <SelectItem value="ADMIN">مدیر</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>وضعیت</FormLabel>
              <Select dir="rtl" onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
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
        <SubmitButton isSubmitting={form.formState.isSubmitting} />
      </form>
    </Form>
  );
}
