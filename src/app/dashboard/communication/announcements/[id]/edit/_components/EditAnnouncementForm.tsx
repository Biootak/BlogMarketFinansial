'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Save, Send } from 'lucide-react';
import { HubHeader } from '@/components/Dashboard/PlatformHub';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/Dashboard/primitives';
import { PersianDatePicker } from '@/components/ui/PersianDatePicker';
import s from './EditAnnouncementForm.module.css';

type Status = 'draft' | 'scheduled' | 'published' | 'archived';
type Channel = 'inapp' | 'email' | 'push' | 'sms';
type Audience = 'all' | 'role' | 'segment';

const CHANNELS: { id: Channel; label: string }[] = [
  { id: 'inapp', label: 'In-app' },
  { id: 'push', label: 'Push' },
  { id: 'email', label: 'Email' },
  { id: 'sms', label: 'SMS' },
];

const AUDIENCE: { id: Audience; label: string }[] = [
  { id: 'all', label: 'همه کاربران' },
  { id: 'role', label: 'بر اساس نقش' },
  { id: 'segment', label: 'سگمنت سفارشی' },
];

interface Props {
  announcement: {
    id: string;
    title: string;
    body: string;
    channels: Channel[];
    audience: Audience;
    audienceFilter: string | null;
    status: Status;
    scheduledAt: string | null;
    publishedAt: string | null;
    expiresAt: string | null;
  };
}

export function EditAnnouncementForm({ announcement }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(announcement.title);
  const [body, setBody] = useState(announcement.body);
  const [channels, setChannels] = useState<Channel[]>(announcement.channels);
  const [audience, setAudience] = useState<Audience>(announcement.audience);
  const [audienceFilter, setAudienceFilter] = useState<string>(
    announcement.audienceFilter ?? '',
  );
  const [scheduledAt, setScheduledAt] = useState<Date | null>(
    announcement.scheduledAt ? new Date(announcement.scheduledAt) : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const toggleChannel = (id: Channel) => {
    setChannels((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  const submit = (mode: 'draft' | 'publish') => {
    setError(null);
    setOk(null);
    if (!title.trim()) return setError('عنوان اعلان الزامی است');
    if (!body.trim()) return setError('متن اعلان الزامی است');
    if (channels.length === 0) return setError('حداقل یک کانال انتخاب کنید');
    if (audience === 'role' && !audienceFilter.trim()) {
      return setError('نقش مخاطب را وارد کنید');
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/communication/announcements/${announcement.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            body: body.trim(),
            channels,
            audience,
            audienceFilter: audienceFilter.trim() || null,
            scheduledAt: scheduledAt ? scheduledAt.toISOString() : null,
            status: mode === 'publish' ? 'published' : undefined,
          }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: { message?: string };
          };
          setError(data?.error?.message ?? 'خطا در ذخیره‌سازی');
          return;
        }
        setOk(mode === 'publish' ? 'اعلان منتشر شد' : 'تغییرات ذخیره شد');
        setTimeout(() => router.push(`/dashboard/communication/announcements/${announcement.id}`), 600);
      } catch {
        setError('خطای شبکه');
      }
    });
  };

  return (
    <div dir="rtl" className={s.page}>
      <HubHeader
        backHref={`/dashboard/communication/announcements/${announcement.id}`}
        backLabel="بازگشت به جزئیات"
        title="ویرایش اعلان"
        subtitle="محتوا، کانال‌ها و مخاطب اعلان را ویرایش کنید."
        icon={ArrowRight}
        actions={
          <Button variant="outline" size="sm" type="button" onClick={() => router.back()}>
            انصراف
          </Button>
        }
      />
      <form
        className={s.form}
        onSubmit={(e) => {
          e.preventDefault();
          submit('draft');
        }}
        noValidate
      >
        <section className={s.card}>
          <h2 className={s.cardTitle}>محتوا</h2>
          <div className={s.fields}>
            <FormField id="title" label="عنوان" required>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                required
              />
            </FormField>
            <FormField id="body" label="متن اعلان" required>
              <Textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                maxLength={5000}
                required
              />
            </FormField>
          </div>
        </section>

        <section className={s.card}>
          <h2 className={s.cardTitle}>کانال و مخاطب</h2>
          <div className={s.fields}>
            <div>
              <label className={s.label}>کانال‌ها</label>
              <div className={s.channelGrid}>
                {CHANNELS.map((c) => {
                  const active = channels.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className={s.channelBtn}
                      data-active={active}
                      onClick={() => toggleChannel(c.id)}
                      aria-pressed={active}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className={s.label}>مخاطب</label>
              <div className={s.channelGrid}>
                {AUDIENCE.map((a) => {
                  const active = audience === a.id;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      className={s.channelBtn}
                      data-active={active}
                      onClick={() => setAudience(a.id)}
                      aria-pressed={active}
                    >
                      {a.label}
                    </button>
                  );
                })}
              </div>
              {audience !== 'all' ? (
                <FormField
                  id="audienceFilter"
                  label={audience === 'role' ? 'نقش مخاطب' : 'شناسه سگمنت'}
                  required
                >
                  <Input
                    id="audienceFilter"
                    value={audienceFilter}
                    onChange={(e) =>
                      setAudienceFilter(
                        audience === 'role' ? e.target.value.toUpperCase() : e.target.value,
                      )
                    }
                    placeholder={
                      audience === 'role' ? 'مثلاً ADMIN' : 'مثلاً segment:vip-customers'
                    }
                    maxLength={60}
                  />
                </FormField>
              ) : null}
            </div>
          </div>
        </section>

        <section className={s.card}>
          <h2 className={s.cardTitle}>زمان‌بندی</h2>
          <FormField id="scheduledAt" label="زمان انتشار (اختیاری)">
            <PersianDatePicker
              value={scheduledAt}
              onChange={(d) => setScheduledAt(d)}
              placeholder="انتخاب تاریخ و زمان…"
            />
          </FormField>
        </section>

        {error ? <div className={s.error}>{error}</div> : null}
        {ok ? <div className={s.ok}>{ok}</div> : null}

        <div className={s.actions}>
          <Button variant="outline" type="button" onClick={() => router.back()}>
            انصراف
          </Button>
          <Button type="submit" variant="outline" disabled={pending}>
            <Save size={14} aria-hidden />
            {pending ? 'در حال ذخیره…' : 'ذخیره تغییرات'}
          </Button>
          {announcement.status !== 'published' && announcement.status !== 'archived' ? (
            <Button type="button" disabled={pending} onClick={() => submit('publish')}>
              <Send size={14} aria-hidden />
              {pending ? 'در حال انتشار…' : 'انتشار فوری'}
            </Button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
