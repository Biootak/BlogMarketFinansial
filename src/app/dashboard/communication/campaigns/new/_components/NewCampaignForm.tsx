'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Megaphone, Save, Send, X } from 'lucide-react';
import { HubHeader, FilterPills, type FilterPillItem } from '@/components/Dashboard/PlatformHub';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/Dashboard/primitives';
import { PersianDatePicker } from '@/components/ui/PersianDatePicker';
import s from './NewCampaign.module.css';

type Channel = 'inapp' | 'email' | 'push' | 'sms';
type Audience = 'all' | 'role' | 'segment';

const CHANNELS: { id: Channel; label: string; tone: 'emerald' | 'indigo' | 'amber' | 'violet'; hint: string }[] = [
  { id: 'inapp', label: 'In-app', tone: 'violet', hint: 'نوتیفیکیشن درون‌برنامه' },
  { id: 'push', label: 'Push', tone: 'emerald', hint: 'نوتیفیکیشن مرورگر' },
  { id: 'email', label: 'Email', tone: 'indigo', hint: 'ایمیل — نیاز به موضوع' },
  { id: 'sms', label: 'SMS', tone: 'amber', hint: 'پیامک — هزینه‌بر' },
];

const AUDIENCE: { id: Audience; label: string; description: string }[] = [
  { id: 'all', label: 'همه کاربران', description: 'ارسال به همه کاربران فعال' },
  { id: 'role', label: 'بر اساس نقش', description: 'مثلاً فقط مدیران یا صرافان' },
  { id: 'segment', label: 'سگمنت سفارشی', description: 'سگمنت تعریف‌شده در بخش مخاطبان' },
];

const toPersianDigits = (n: number | string) =>
  String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);

interface NewCampaignFormProps {
  initialAudience?: string | null;
  /** Used in error/success messages — default 'اعلان'. */
  entityLabel?: string;
  /** When true, the form is creating a Campaign (email/sms/push) — single channel, subject required for email. */
  campaignMode?: boolean;
  /** Optional target id (campaign id) for the edit flow. */
  editId?: string;
}

export function NewCampaignForm({
  initialAudience,
  entityLabel = 'اعلان',
  campaignMode = false,
  editId,
}: NewCampaignFormProps = {}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const [subject, setSubject] = useState('');
  const [channels, setChannels] = useState<Channel[]>(
    campaignMode ? ['email'] : ['inapp'],
  );
  const [audience, setAudience] = useState<Audience>(
    initialAudience?.startsWith('role:')
      ? 'role'
      : initialAudience === 'segment'
        ? 'segment'
        : 'all',
  );
  const [audienceFilter, setAudienceFilter] = useState<string>(
    initialAudience?.startsWith('role:') ? initialAudience.slice('role:'.length) : '',
  );
  const [date, setDate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const toggleChannel = (id: Channel) => {
    if (campaignMode) {
      // campaign: single channel selection
      setChannels([id]);
      return;
    }
    setChannels((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const channelPills: FilterPillItem[] = CHANNELS.map((c) => ({
    id: c.id,
    label: c.label,
    tone: c.tone,
  }));
  const audiencePills: FilterPillItem[] = AUDIENCE.map((a) => ({
    id: a.id,
    label: a.label,
  }));

  const submit = (mode: 'draft' | 'publish') => {
    setError(null);
    setOk(null);
    if (!name.trim()) {
      setError(`عنوان ${entityLabel} الزامی است`);
      return;
    }
    if (!body.trim()) {
      setError(`متن ${entityLabel} الزامی است`);
      return;
    }
    if (channels.length === 0) {
      setError('حداقل یک کانال انتخاب کنید');
      return;
    }
    if (campaignMode && channels[0] === 'email' && !subject.trim()) {
      setError('برای کمپین ایمیلی، موضوع الزامی است');
      return;
    }
    if (audience === 'role' && !audienceFilter.trim()) {
      setError('نقش مخاطب (مثلاً ADMIN) را وارد کنید');
      return;
    }

    startTransition(async () => {
      try {
        const url = campaignMode
          ? '/api/communication/campaigns'
          : '/api/communication/announcements';
        const payload = campaignMode
          ? {
              name,
              channel: channels[0],
              subject: subject.trim() || null,
              body,
              audience,
              audienceFilter: audienceFilter.trim() || null,
              scheduledAt: date ? date.toISOString() : null,
              status: mode === 'publish' ? 'sending' : 'draft',
            }
          : {
              title: name,
              body,
              channels,
              audience,
              audienceFilter: audienceFilter.trim() || null,
              scheduledAt: date ? date.toISOString() : null,
              status: mode === 'publish' ? 'published' : 'draft',
            };
        const method = editId ? 'PATCH' : 'POST';
        const finalUrl = editId
          ? `${url}/${editId}`
          : url;
        const res = await fetch(finalUrl, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: { message?: string };
          };
          setError(data?.error?.message ?? 'خطا در ذخیره‌سازی');
          return;
        }
        setOk(
          mode === 'publish'
            ? `${entityLabel} منتشر شد`
            : `${entityLabel} ذخیره شد`,
        );
        const targetHref = campaignMode
          ? '/dashboard/communication/campaigns'
          : '/dashboard/communication/announcements';
        setTimeout(() => router.push(targetHref), 600);
      } catch {
        setError('خطای شبکه');
      }
    });
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit('draft');
  };

  const bodyLimit = campaignMode ? 10_000 : 2_000;
  const selectedChannelInfo = CHANNELS.find((c) => c.id === channels[0]);

  return (
    <div dir="rtl" className={s.page}>
      <HubHeader
        backHref={campaignMode ? '/dashboard/communication/campaigns' : '/dashboard/communication/announcements'}
        backLabel="بازگشت"
        title={editId ? `ویرایش ${entityLabel}` : `${entityLabel} جدید`}
        subtitle={
          campaignMode
            ? 'یک کمپین ایمیلی، پیامکی یا Push بسازید. می‌توانید بعداً آن را زمان‌بندی یا ارسال کنید.'
            : 'یک اعلان تازه بسازید. می‌توانید بعداً آن را زمان‌بندی یا منتشر کنید.'
        }
        icon={Megaphone}
        actions={
          <Button variant="outline" size="sm" type="button" onClick={() => router.back()}>
            <X size={14} aria-hidden />
            انصراف
          </Button>
        }
      />
      <form className={s.form} onSubmit={onSubmit} noValidate>
        <section className={s.card}>
          <h2 className={s.cardTitle}>محتوا</h2>
          <div className={s.fields}>
            <FormField id="name" label={`عنوان ${entityLabel}`} required>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  campaignMode
                    ? 'مثلاً: خبرنامه هفتگی بازار'
                    : 'مثلاً: به‌روزرسانی نرخ‌های ارزی'
                }
                maxLength={120}
                required
              />
            </FormField>
            {campaignMode ? (
              <FormField id="subject" label="موضوع ایمیل" required={channels[0] === 'email'}>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="موضوع ایمیل…"
                  maxLength={150}
                />
              </FormField>
            ) : null}
            <FormField id="body" label={`متن ${entityLabel}`} required>
              <Textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={campaignMode ? 'متن کامل کمپین…' : 'متن کامل پیام…'}
                className={s.textarea}
                rows={6}
                maxLength={bodyLimit}
                required
              />
              <div className={s.counter}>
                {toPersianDigits(body.length)} / {toPersianDigits(bodyLimit)}
              </div>
            </FormField>
          </div>
        </section>

        <section className={s.card}>
          <h2 className={s.cardTitle}>
            {campaignMode ? 'کانال ارسال' : 'کانال و مخاطب'}
          </h2>
          <div className={s.fields}>
            <div>
              <label className={s.label}>
                {campaignMode ? 'کانال (یکی انتخاب کنید)' : 'کانال‌های ارسال (می‌توانید چندتا انتخاب کنید)'}
              </label>
              <FilterPills
                items={channelPills}
                active={campaignMode ? (channels[0] ?? 'email') : 'all'}
                onChange={(id) => toggleChannel(id as Channel)}
                ariaLabel="انتخاب کانال"
                variant="stacked"
              />
              {!campaignMode && channels.length > 0 ? (
                <p className={s.hint}>
                  {toPersianDigits(channels.length)} کانال انتخاب شده:{' '}
                  {channels.map((c) => CHANNELS.find((x) => x.id === c)?.label).join(' · ')}
                </p>
              ) : null}
              {campaignMode && selectedChannelInfo ? (
                <p className={s.hint}>{selectedChannelInfo.hint}</p>
              ) : null}
            </div>
            {!campaignMode ? (
              <div>
                <label className={s.label}>مخاطب</label>
                <FilterPills
                  items={audiencePills}
                  active={audience}
                  onChange={(id) => setAudience(id as Audience)}
                  ariaLabel="انتخاب مخاطب"
                  variant="stacked"
                />
                <p className={s.hint}>
                  {AUDIENCE.find((a) => a.id === audience)?.description}
                </p>
                {audience === 'role' ? (
                  <div className={s.fieldsInner}>
                    <FormField id="audienceFilter" label="نقش مخاطب" required>
                      <Input
                        id="audienceFilter"
                        value={audienceFilter}
                        onChange={(e) => setAudienceFilter(e.target.value.toUpperCase())}
                        placeholder="مثلاً ADMIN یا MERCHANT"
                        maxLength={40}
                      />
                    </FormField>
                  </div>
                ) : null}
                {audience === 'segment' ? (
                  <div className={s.fieldsInner}>
                    <FormField id="audienceFilter" label="شناسه سگمنت" required>
                      <Input
                        id="audienceFilter"
                        value={audienceFilter}
                        onChange={(e) => setAudienceFilter(e.target.value)}
                        placeholder="مثلاً segment:vip-customers"
                        maxLength={60}
                      />
                    </FormField>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>

        <section className={s.card}>
          <h2 className={s.cardTitle}>زمان‌بندی</h2>
          <div className={s.fields}>
            <div>
              <label className={s.label}>
                <Calendar size={14} aria-hidden />
                زمان انتشار (اختیاری)
              </label>
              <PersianDatePicker
                value={date}
                onChange={(d) => setDate(d)}
                placeholder="انتخاب تاریخ و زمان…"
              />
              {date ? (
                <p className={s.dateHint}>
                  {entityLabel} در {date.toLocaleString('fa-IR')} منتشر خواهد شد
                </p>
              ) : null}
            </div>
          </div>
        </section>

        {error ? <div className={s.error}>{error}</div> : null}
        {ok ? <div className={s.ok}>{ok}</div> : null}

        <div className={s.actions}>
          <Button variant="outline" type="button" onClick={() => router.back()}>
            انصراف
          </Button>
          <Button type="submit" variant="outline" disabled={pending}>
            <Save size={14} aria-hidden />
            {pending ? 'در حال ذخیره…' : 'ذخیره پیش‌نویس'}
          </Button>
          <Button
            type="button"
            disabled={pending}
            onClick={() => submit('publish')}
          >
            <Send size={14} aria-hidden />
            {pending ? 'در حال ارسال…' : campaignMode ? 'ارسال کمپین' : 'انتشار فوری'}
          </Button>
        </div>
      </form>
    </div>
  );
}

