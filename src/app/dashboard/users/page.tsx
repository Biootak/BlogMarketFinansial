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

import Loading from '@/components/Loading';



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

  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

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



  useEffect(() => {

    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 500);

    return () => clearTimeout(timer);

  }, [searchTerm]);



  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>

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

        toast({

          title: 'خطا',

          description: result.message,

          variant: 'destructive',

        });

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



  const onSubmit = async (data: FormData) => {

    const result = editingUser

      ? await updateUser(editingUser.id, { ...data, password: undefined })

      : await createUser(data);



    if (result.success) {

      fetchUsers(1, debouncedSearchTerm);

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

      role: user.role as Role,

      status: user.status as string,

    });

    setIsEditDialogOpen(true);

  };

  const handleDelete = async (id: string) => {

    if (window.confirm('آیا مطمئن هستید که می‌خواهید این کاربر را حذف کنید؟')) {

      const result = await deleteUser(id);

      if (result.success) {

        fetchUsers(1, debouncedSearchTerm);

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



  return (

    <div className="container mx-auto p-4 sm:p-6 lg:p-8 rtl">

      <h1 className="text-2xl sm:text-xl font-bold mb-4 sm:mb-6 lg:mb-8 text-right text-primary-700 dark:text-primary-300">

        مدیریت کاربران

      </h1>



      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 lg:mb-8 space-y-4 sm:space-y-0">

        <Dialog>

          <DialogTrigger asChild>

            <ButtonPrimary

              aria-label="افزودن کاربر جدید"

              className="w-full sm:w-auto bg-gradient-to-l from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white font-medium py-2 px-4 sm:px-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group"

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

          <DialogContent className="rtl sm:max-w-[425px] md:max-w-[600px] lg:max-w-[800px] xl:max-w-[1000px] h-auto max-h-[90vh] bg-white dark:bg-neutral-800 rounded-lg overflow-hidden shadow-xl">

            <DialogHeader className="p-4 sm:p-6 pb-2">

              <DialogTitle className="text-xl sm:text-2xl font-bold text-primary-700 dark:text-primary-300">

                افزودن کاربر جدید

              </DialogTitle>

            </DialogHeader>

            <div className="overflow-y-auto max-h-[calc(90vh-100px)] scrollbar-custom">

              <div className="p-4 sm:p-6 pt-2">

                <UserForm form={form} onSubmit={onSubmit} />

              </div>

            </div>

          </DialogContent>

        </Dialog>



        <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2 sm:space-x-reverse mt-4 sm:mt-0">

          <Select dir="rtl" value={statusFilter} onValueChange={setStatusFilter}>

            <SelectTrigger className="w-full sm:w-[180px]">

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

            <SelectTrigger className="w-full sm:w-[180px]">

              <SelectValue placeholder="نقش" />

            </SelectTrigger>

            <SelectContent>

              <SelectItem value="All">همه</SelectItem>

              <SelectItem value="USER">کاربر عادی</SelectItem>

              <SelectItem value="AUTHOR">نویسنده</SelectItem>

              <SelectItem value="ADMIN">مدیر</SelectItem>

            </SelectContent>

          </Select>



          <div className="w-full sm:w-auto relative mt-4 sm:mt-0">

            <Input

              type="text"

              placeholder="جستجوی کاربر..."

              value={searchTerm}

              onChange={(e) => setSearchTerm(e.target.value)}

              className="w-full sm:w-64 pl-10 pr-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-700 focus:border-primary-500 dark:focus:border-primary-400"

            />

            <HiMagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />

          </div>

        </div>

      </div>



      {isLoading && page === 1 ? (

        <Loading />

      ) : (

        <div className="overflow-x-auto">

          <Table className="w-full bg-white dark:bg-neutral-800 shadow-md rounded-lg overflow-hidden">

            <TableHeader>

              <TableRow className="bg-neutral-100 dark:bg-neutral-700">

                <TableHead className="text-right py-3 px-4 sm:py-4 sm:px-6 text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300">

                  نام

                </TableHead>



                <TableHead className="text-right py-3 px-4 sm:py-4 sm:px-6 text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300">

                  نقش

                </TableHead>

                <TableHead className="text-right py-3 px-4 sm:py-4 sm:px-6 text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300 hidden md:table-cell">

                  وضعیت

                </TableHead>

                <TableHead className="text-right py-3 px-4 sm:py-4 sm:px-6 text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300">

                  عملیات

                </TableHead>

              </TableRow>

            </TableHeader>

            <TableBody>

              {users.map((user) => (

                <TableRow

                  key={user.id}

                  className="border-b border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-750 transition-colors duration-150"

                >

                  <TableCell className="py-3 px-4 sm:py-4 sm:px-6">

                    <div className="flex items-center rounded-full">

                      <Image

                        src={

                          user.profile?.avatar ||

                          user.image ||

                          `https://avatar.vercel.sh/${encodeURIComponent(user.name || '')}?size=80`

                        }

                        alt={user.name || ''}

                        width={40}

                        height={40}

                        className="rounded-full ml-3"

                      />

                      <div>

                        <p className="font-semibold text-xs sm:text-sm">{user.name}</p>

                        <p className="text-xs text-gray-500">{user.email}</p>

                      </div>

                    </div>

                  </TableCell>



                  <TableCell className="text-right py-3 px-4 sm:py-4 sm:px-6 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">

                    {user.role === 'USER'

                      ? 'کاربر عادی'

                      : user.role === 'AUTHOR'

                        ? 'نویسنده'

                        : 'مدیر'}

                  </TableCell>

                  <TableCell className="text-right py-3 px-4 sm:py-4 sm:px-6 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 hidden md:table-cell">

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

                  <TableCell className="py-3 px-4 sm:py-4 sm:px-6">

                    <div className="flex justify-start space-x-2 space-x-reverse">

                      <Button

                        variant="outline"

                        size="sm"

                        onClick={() => handleEdit(user)}

                        className="text-primary-600 border-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:border-primary-400 dark:hover:bg-primary-900 text-xs sm:text-sm px-2 sm:px-3 py-1"

                      >

                        <HiOutlinePencil className="ml-1 hidden sm:inline" />

                        ویرایش

                      </Button>

                      <Button

                        variant="outline"

                        size="sm"

                        onClick={() => handleDelete(user.id)}

                        className="text-red-600 border-red-600 hover:bg-red-50 dark:text-red-400 dark:border-red-400 dark:hover:bg-red-900 text-xs sm:text-sm px-2 sm:px-3 py-1"

                      >

                        <HiOutlineTrash className="ml-1 hidden sm:inline" />

                        حذف

                      </Button>

                    </div>

                  </TableCell>

                </TableRow>

              ))}

            </TableBody>

          </Table>

          {isLoading && page > 1 && <LoadingMore message="در حال دریافت کاربران بیشتر..." />}

          <div ref={infiniteScrollRef} style={{ height: '1px' }} />

        </div>

      )}



      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>

        <DialogContent className="rtl sm:max-w-[425px] md:max-w-[600px] lg:max-w-[800px] xl:max-w-[1000px] h-auto max-h-[90vh] bg-white dark:bg-neutral-800 rounded-lg overflow-hidden shadow-xl">

          <DialogHeader className="p-4 sm:p-6 pb-2">

            <DialogTitle className="text-xl sm:text-2xl font-bold text-primary-700 dark:text-primary-300">

              ویرایش کاربر

            </DialogTitle>

          </DialogHeader>

          <div className="overflow-y-auto max-h-[calc(90vh-100px)] scrollbar-custom">

            <div className="p-4 sm:p-6 pt-2">

              <UserForm form={form} onSubmit={onSubmit} />

            </div>

          </div>

        </DialogContent>

      </Dialog>

    </div>

  );

}



function UserForm({ form, onSubmit }: UserFormProps) {

  return (

    <Form {...form}>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

        <FormField

          control={form.control}

          name="name"

          render={({ field }) => (

            <FormItem>

              <FormLabel className="text-sm font-medium text-neutral-700 dark:text-neutral-300">

                نام

              </FormLabel>

              <FormControl>

                <Input placeholder="نام کاربر" {...field} className="text-sm" />

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

              <FormLabel className="text-sm font-medium text-neutral-700 dark:text-neutral-300">

                ایمیل

              </FormLabel>

              <FormControl>

                <Input placeholder="ایمیل کاربر" {...field} type="email" className="text-sm" />

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

              <FormLabel className="text-sm font-medium text-neutral-700 dark:text-neutral-300">

                رمز عبور

              </FormLabel>

              <FormControl>

                <Input

                  placeholder="رمز عبور کاربر"

                  type="password"

                  {...field}

                  className="text-sm"

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

              <FormLabel className="text-sm font-medium text-neutral-700 dark:text-neutral-300">

                شماره تلفن

              </FormLabel>

              <FormControl>

                <Input placeholder="شماره تلفن کاربر" {...field} className="text-sm" />

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

              <FormLabel className="text-sm font-medium text-neutral-700 dark:text-neutral-300">

                نقش

              </FormLabel>

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

              <FormLabel className="text-sm font-medium text-neutral-700 dark:text-neutral-300">

                وضعیت

              </FormLabel>

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

