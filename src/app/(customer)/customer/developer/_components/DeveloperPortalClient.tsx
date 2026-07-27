'use client';

import { PageHeader, Section } from '@/components/Dashboard/primitives';
import { Code2, Key, Link as LinkIcon, ShieldCheck, Terminal, Zap, History } from 'lucide-react';
import { motion } from '@/lib/motion-shim';

export default function DeveloperPortalClient() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-6"
    >
      <PageHeader
        title="پنل توسعه‌دهندگان"
        description="ابزارهای اتصال پلتفرم به وب‌سایت شما"
        breadcrumb={[{ label: 'پورتال مشتری' }, { label: 'توسعه‌دهندگان' }]}
        icon="settings"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section title="کلیدهای API" icon={<Key className="size-5" />}>
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border p-10 text-center transition-colors hover:border-primary/50">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/5 text-primary">
              <Key size={24} />
            </div>
            <p className="mb-6 text-sm text-muted-foreground">
              شما هنوز کلید API فعالی ندارید. برای شروع اتصال سیستمی، یک کلید جدید بسازید.
            </p>
            <button className="rounded-xl bg-primary px-8 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/10 transition-all hover:scale-[1.02] active:scale-[0.98]">
              ایجاد کلید جدید
            </button>
          </div>
        </Section>

        <Section title="تنظیمات وب‌هوک" icon={<LinkIcon className="size-5" />}>
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border p-10 text-center transition-colors hover:border-primary/50">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/5 text-primary">
              <LinkIcon size={24} />
            </div>
            <p className="mb-6 text-sm text-muted-foreground">
              آدرس بازگشتی برای دریافت اعلانات خودکار تراکنش‌ها را در این بخش تنظیم کنید.
            </p>
            <button className="rounded-xl bg-muted px-8 py-3 text-sm font-bold text-foreground transition-all hover:bg-muted/80 hover:scale-[1.02] active:scale-[0.98]">
              افزودن Endpoint
            </button>
          </div>
        </Section>
      </div>

      <Section title="مستندات فنی" icon={<Code2 className="size-5" />}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: 'شروع کار', desc: 'نحوه اتصال و اولین درخواست', icon: Zap },
            { title: 'پرداخت آنلاین', desc: 'ایجاد درگاه پرداخت ارزی', icon: ShieldCheck },
            { title: 'لیست تراکنش‌ها', desc: 'دریافت سوابق مالی مرچنت', icon: History },
            { title: 'وب‌هوک‌ها', desc: 'مدیریت رویدادهای سیستمی', icon: LinkIcon },
          ].map((doc) => (
            <div
              key={doc.title}
              className="group flex flex-col gap-3 rounded-2xl border border-border bg-background p-6 transition-all hover:border-primary/30 hover:bg-muted/5 hover:shadow-xl hover:shadow-primary/5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/5 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <doc.icon size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold">{doc.title}</h4>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{doc.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </motion.div>
  );
}
