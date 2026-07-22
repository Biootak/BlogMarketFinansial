'use client';

/**
 * HeaderAdsClient — UI مدیریت تبلیغ هدر
 *
 *  - الگوبرداری از /dashboard/advertisements (همان DashboardTableWrapper)
 *  - بدون نیاز به image (اختیاری)
 *  - دیالوگ ساده create/edit
 *  - toggle سریع از جدول
 *
 *  ۲۰۲۶-۰۶-۱۴: هماهنگ با کامپوننت‌های shared داشبورد
 */

import {
  createHeaderAd,
  deleteHeaderAd,
  toggleHeaderAd,
  updateHeaderAd,
} from '@/actions/headerAdActions';
import {
  ActionButton,
  DashboardPageHeader,
  DashboardTable,
  DashboardTableBody,
  DashboardTableCell,
  DashboardTableContainer,
  DashboardTableHead,
  DashboardTableHeader,
  DashboardTableRow,
  EmptyState,
  PrimaryActionButton,
  StatusBadge,
} from '@/components/Dashboard/shared/DashboardTableWrapper';
import SubmitButton from '@/components/SubmitButton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  HiOutlinePencil,
  HiOutlinePlus,
  HiOutlineSparkles,
  HiOutlineTrash,
  HiOutlineXMark,
} from 'react-icons/hi2';

type Theme = 'PRIMARY' | 'ACCENT' | 'NEUTRAL' | 'DARK' | 'GRADIENT';
type Variant = 'TEXT' | 'IMAGE' | 'MIXED';

export interface HeaderAdData {
  id: string;
  text: string;
  subtext?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  imageUrl?: string | null;
  href?: string | null;
  variant: Variant;
  theme: Theme;
  isActive: boolean;
  priority: number;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

const themeLabels: Record<Theme, string> = {
  PRIMARY: 'Primary',
  ACCENT: 'Accent',
  NEUTRAL: 'Neutral',
  DARK: 'Dark',
  GRADIENT: 'Gradient',
};

const variantLabels: Record<Variant, string> = {
  TEXT: 'متنی',
  IMAGE: 'تصویری',
  MIXED: 'ترکیبی',
};

const themeBadge: Record<Theme, string> = {
  PRIMARY: 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300',
  ACCENT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  NEUTRAL: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
  DARK: 'bg-neutral-900 text-white',
  GRADIENT: 'bg-gradient-to-l from-primary-500 to-purple-500 text-white',
};

export default function HeaderAdsClient({
  initialAds,
  className,
  onRefresh,
}: {
  initialAds: HeaderAdData[];
  className?: string;
  onRefresh?: () => void | Promise<void>;
}) {
  const [editing, setEditing] = useState<HeaderAdData | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const refresh = async () => {
    if (onRefresh) {
      await onRefresh();
    } else {
      router.refresh();
    }
  };

  const handleSubmit = async (formData: FormData) => {
    const payload = {
      text: String(formData.get('text') ?? '').trim(),
      subtext: (formData.get('subtext') as string) || null,
      ctaLabel: (formData.get('ctaLabel') as string) || null,
      ctaHref: (formData.get('ctaHref') as string) || null,
      imageUrl: (formData.get('imageUrl') as string) || null,
      href: (formData.get('href') as string) || null,
      variant: (formData.get('variant') as Variant) || 'TEXT',
      theme: (formData.get('theme') as Theme) || 'PRIMARY',
      isActive: formData.get('isActive') === 'on',
      priority: Number(formData.get('priority') ?? 0),
    };

    if (!payload.text) {
      toast({ title: 'خطا', description: 'متن تبلیغ الزامی است.', variant: 'destructive' });
      return;
    }

    startTransition(async () => {
      const result = editing
        ? await updateHeaderAd(editing.id, payload)
        : await createHeaderAd(payload);

      if (result.success) {
        toast({ title: 'موفقیت', description: result.message, variant: 'success' });
        setIsOpen(false);
        setEditing(null);
        await refresh();
      } else {
        toast({ title: 'خطا', description: result.message, variant: 'destructive' });
      }
    });
  };

  const handleToggle = async (id: string) => {
    const result = await toggleHeaderAd(id);
    if (result.success) {
      toast({ title: 'موفقیت', description: result.message, variant: 'success' });
      await refresh();
    } else {
      toast({ title: 'خطا', description: result.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('آیا از حذف این تبلیغ مطمئن هستید؟')) return;
    const result = await deleteHeaderAd(id);
    if (result.success) {
      toast({ title: 'موفقیت', description: result.message, variant: 'success' });
      await refresh();
    } else {
      toast({ title: 'خطا', description: result.message, variant: 'destructive' });
    }
  };

  const openCreate = () => {
    setEditing(null);
    setIsOpen(true);
  };

  const openEdit = (ad: HeaderAdData) => {
    setEditing(ad);
    setIsOpen(true);
  };

  return (
    <div className={cn('min-h-[50vh]', className)} dir="rtl">
      <DashboardPageHeader
        title="تبلیغ بالای هدر"
        description="نوار باریک تبلیغ که در بالای سایت نمایش داده می‌شود. فقط یک تبلیغ فعال در لحظه."
      >
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <PrimaryActionButton onClick={openCreate}>
              <HiOutlinePlus className="h-4 w-4" />
              <span>تبلیغ جدید</span>
            </PrimaryActionButton>
          </DialogTrigger>
          <DialogContent
            className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl border-neutral-200/60 bg-white/95 p-0 shadow-2xl backdrop-blur-xl dark:border-neutral-700/50 dark:bg-neutral-800/95"
            dir="rtl"
          >
            <DialogHeader className="border-b border-neutral-200/60 bg-gradient-to-l from-neutral-50 to-white px-6 py-5 dark:border-neutral-700/50 dark:from-neutral-800 dark:to-neutral-800">
              <DialogTitle className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
                {editing ? 'ویرایش تبلیغ هدر' : 'افزودن تبلیغ هدر جدید'}
              </DialogTitle>
            </DialogHeader>
            <div className="max-h-[calc(90vh-120px)] overflow-y-auto p-6">
              <form action={handleSubmit} className="space-y-4">
                <Field label="متن اصلی *" name="text" defaultValue={editing?.text} required />
                <Field label="زیرنویس" name="subtext" defaultValue={editing?.subtext ?? ''} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="متن دکمه (CTA)"
                    name="ctaLabel"
                    defaultValue={editing?.ctaLabel ?? ''}
                    placeholder="بیشتر بدانید"
                  />
                  <Field
                    label="لینک دکمه"
                    name="ctaHref"
                    defaultValue={editing?.ctaHref ?? ''}
                    placeholder="/landing"
                    dir="ltr"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="آدرس تصویر (اختیاری)"
                    name="imageUrl"
                    defaultValue={editing?.imageUrl ?? ''}
                    placeholder="/uploads/ads/logo.png"
                    dir="ltr"
                  />
                  <Field
                    label="لینک کل بنر (اختیاری)"
                    name="href"
                    defaultValue={editing?.href ?? ''}
                    placeholder="/promo"
                    dir="ltr"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <SelectField
                    label="Variant"
                    name="variant"
                    defaultValue={editing?.variant ?? 'TEXT'}
                    options={Object.entries(variantLabels).map(([k, v]) => ({
                      value: k,
                      label: v,
                    }))}
                  />
                  <SelectField
                    label="Theme"
                    name="theme"
                    defaultValue={editing?.theme ?? 'PRIMARY'}
                    options={Object.entries(themeLabels).map(([k, v]) => ({ value: k, label: v }))}
                  />
                  <Field
                    label="اولویت"
                    name="priority"
                    type="number"
                    defaultValue={editing?.priority ?? 0}
                  />
                </div>
                <label className="flex items-center gap-3 rounded-xl border border-neutral-200/60 bg-white/50 p-4 dark:border-neutral-700/50 dark:bg-neutral-800/50">
                  <input
                    type="checkbox"
                    name="isActive"
                    defaultChecked={editing?.isActive ?? false}
                    className="h-5 w-5 rounded-md border-neutral-300 focus:ring-2 focus:ring-offset-2 [accent-color:var(--at-accent)]"
                  />
                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    فعال باشد (فقط یک تبلیغ می‌تواند فعال باشد)
                  </span>
                </label>
                <div className="pt-2">
                  <SubmitButton isSubmitting={isPending} />
                </div>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      </DashboardPageHeader>

      {initialAds.length === 0 ? (
        <DashboardTableContainer>
          <EmptyState
            title="تبلیغی برای هدر ساخته نشده"
            description="با زدن دکمه «تبلیغ جدید» اولین نوار تبلیغ را ایجاد کنید."
            icon={<HiOutlineSparkles className="h-8 w-8 text-neutral-400" />}
          />
        </DashboardTableContainer>
      ) : (
        <DashboardTableContainer>
          <DashboardTable>
            <DashboardTableHeader>
              <tr>
                <DashboardTableHead>پیش‌نمایش</DashboardTableHead>
                <DashboardTableHead>متن</DashboardTableHead>
                <DashboardTableHead>Theme</DashboardTableHead>
                <DashboardTableHead>Variant</DashboardTableHead>
                <DashboardTableHead>فعال</DashboardTableHead>
                <DashboardTableHead>عملیات</DashboardTableHead>
              </tr>
            </DashboardTableHeader>
            <DashboardTableBody>
              {initialAds.map((ad) => (
                <DashboardTableRow key={ad.id}>
                  <DashboardTableCell>
                    <div
                      className={`
                        max-w-[260px] truncate
                        rounded-md px-2.5 py-1
                        text-[11px] font-medium
                        ${themeBadge[ad.theme]}
                      `}
                    >
                      {ad.text}
                    </div>
                  </DashboardTableCell>
                  <DashboardTableCell>
                    <div className="space-y-0.5">
                      <div className="font-medium text-neutral-900 dark:text-neutral-100">
                        {ad.text}
                      </div>
                      {ad.subtext && (
                        <div className="text-xs text-neutral-500 dark:text-neutral-400">
                          {ad.subtext}
                        </div>
                      )}
                    </div>
                  </DashboardTableCell>
                  <DashboardTableCell>
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${themeBadge[ad.theme]}`}
                    >
                      {themeLabels[ad.theme]}
                    </span>
                  </DashboardTableCell>
                  <DashboardTableCell>
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">
                      {variantLabels[ad.variant]}
                    </span>
                  </DashboardTableCell>
                  <DashboardTableCell>
                    <Switch
                      checked={ad.isActive}
                      onCheckedChange={() => handleToggle(ad.id)}
                      aria-label="تغییر وضعیت فعال"
                    />
                  </DashboardTableCell>
                  <DashboardTableCell>
                    <div className="flex items-center gap-2">
                      <ActionButton variant="edit" onClick={() => openEdit(ad)}>
                        <HiOutlinePencil className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">ویرایش</span>
                      </ActionButton>
                      <ActionButton variant="delete" onClick={() => handleDelete(ad.id)}>
                        <HiOutlineTrash className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">حذف</span>
                      </ActionButton>
                    </div>
                  </DashboardTableCell>
                </DashboardTableRow>
              ))}
            </DashboardTableBody>
          </DashboardTable>
        </DashboardTableContainer>
      )}
    </div>
  );
}

function Field({
  label,
  name,
  type = 'text',
  defaultValue,
  placeholder,
  required,
  dir,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number;
  placeholder?: string;
  required?: boolean;
  dir?: 'rtl' | 'ltr';
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
      >
        {label}
      </label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue as string | number | undefined}
        placeholder={placeholder}
        required={required}
        dir={dir}
        className="h-11 rounded-xl border-neutral-200/60 bg-white/80 dark:border-neutral-700/60 dark:bg-neutral-800/80"
      />
    </div>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
      >
        {label}
      </label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        className="h-11 w-full rounded-xl border border-neutral-200/60 bg-white/80 px-3 text-sm transition-colors focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-neutral-700/60 dark:bg-neutral-800/80"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
