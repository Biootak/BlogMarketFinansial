'use client';

/**
 * UserEditForm — فرم ویرایش کاربر (C2-fix).
 * updateUser server action را با validation سمت سرور صدا می‌زند.
 */

import { updateUser } from '@/actions/userActions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Role } from '@prisma/client';
import { Loader2, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import s from './UserEditForm.module.css';

const ROLE_OPTIONS: Array<{ value: Role; label: string }> = [
  { value: Role.USER, label: 'کاربر' },
  { value: Role.AUTHOR, label: 'نویسنده' },
  { value: Role.SUPPORT, label: 'پشتیبانی' },
  { value: Role.ADMIN, label: 'مدیر' },
  { value: Role.OWNER, label: 'مالک' },
];

const STATUS_OPTIONS = ['Active', 'Banned', 'Suspended', 'Pending'];

interface Props {
  userId: string;
  initialName: string;
  initialEmail: string;
  initialPhone: string;
  initialRole: Role;
  initialStatus: string;
}

export function UserEditForm({
  userId,
  initialName,
  initialEmail,
  initialPhone,
  initialRole,
  initialStatus,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);
  const [role, setRole] = useState<Role>(initialRole);
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      setError('نام باید حداقل ۲ حرف باشد');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('ایمیل معتبر وارد کنید');
      return;
    }

    startTransition(async () => {
      const res = await updateUser(userId, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phoneNumber: phone.trim() || undefined,
        role,
        status,
      });
      if (!res.success) {
        setError(res.message);
        return;
      }
      toast({ title: 'ذخیره شد', description: 'اطلاعات کاربر با موفقیت به‌روزرسانی شد.' });
      router.push(`/dashboard/users/${userId}`);
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className={s.form} aria-label="ویرایش کاربر">
      <div className={s.grid}>
        <div className={s.field}>
          <label className={s.label} htmlFor="ue-name">
            نام
          </label>
          <Input
            id="ue-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="نام کامل"
            aria-invalid={Boolean(error)}
          />
        </div>

        <div className={s.field}>
          <label className={s.label} htmlFor="ue-email">
            ایمیل
          </label>
          <Input
            id="ue-email"
            type="email"
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@email.com"
            autoComplete="off"
            aria-invalid={Boolean(error)}
          />
        </div>

        <div className={s.field}>
          <label className={s.label} htmlFor="ue-phone">
            شماره تماس
          </label>
          <Input
            id="ue-phone"
            type="tel"
            dir="ltr"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+93 ..."
          />
        </div>

        <div className={s.field}>
          <label className={s.label} htmlFor="ue-role">
            نقش
          </label>
          <Select value={role} onValueChange={(v) => setRole(v as Role)}>
            <SelectTrigger id="ue-role" className={s.select}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className={s.field}>
          <label className={s.label} htmlFor="ue-status">
            وضعیت
          </label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="ue-status" className={s.select}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((st) => (
                <SelectItem key={st} value={st}>
                  {st}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}

      <div className={s.actions}>
        <Button
          type="submit"
          disabled={pending}
          className={s.save}
          aria-busy={pending || undefined}
        >
          {pending ? (
            <Loader2 size={14} className={s.spinner} aria-hidden />
          ) : (
            <Save size={14} aria-hidden />
          )}
          {pending ? 'در حال ذخیره…' : 'ذخیره تغییرات'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={pending}>
          انصراف
        </Button>
      </div>
    </form>
  );
}
