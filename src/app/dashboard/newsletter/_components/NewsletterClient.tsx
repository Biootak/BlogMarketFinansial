'use client';

/**
 * NewsletterClient — خبرنامه (redesigned 2026)
 *
 * New architecture: PageHero → KPI strip → InsightLayout with a framed
 * DataPanel (tabs + search + paginated table) and a growth rail (14-day
 * sparkline, active-rate progress, latest signups). All broadcast,
 * template and subscriber logic is unchanged. Pager icons are RTL-correct
 * (previous → right chevron, next → left chevron).
 */

import {
  type NewsletterRow,
  deleteSubscribers,
  sendNewsletterBroadcast,
  setSubscriberActive,
} from '@/actions/newsletter-actions';
import {
  type Column,
  ConfirmDialog,
  DataPanel,
  DataTable,
  ExportButton,
  InsightCard,
  InsightLayout,
  InsightPanel,
  KpiCard,
  MillionDollarEmpty,
  PageHero,
  SearchInput,
  StatGrid,
  TableToolbar,
  TrendSparkline,
} from '@/components/Dashboard/primitives';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import {
  BarChart3,
  Check,
  ChevronLeft,
  ChevronRight,
  Mail,
  Send,
  Settings,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useMemo, useState, useTransition } from 'react';
import s from './NewsletterClient.module.css';

const fa = new Intl.NumberFormat('fa-IR');

type Tab = 'all' | 'active' | 'inactive';

const TEMPLATES = [
  {
    name: 'اطلاع‌رسانی عمومی',
    subject: 'خبرنامه این هفته — مالی مارکت',
    body: 'سلام،\n\nاطلاعات جدید این هفته را با شما به اشتراک می‌گذاریم:\n\n• به‌روزرسانی نرخ‌ها\n• تغییرات جدید پلتفرم\n\nبا تشکر،\ntیم مالی مارکت',
  },
  {
    name: 'تخفیف ویژه',
    subject: 'تخفیف ویژه برای شما!',
    body: 'سلام،\n\nیک تخفیف ویژه برای شما در نظر گرفتیم!\n\nجزئیات:\n\n• مدت زمان:\n• شرایط:\n\nاز این فرصت استفاده کنید.\n\nبا تشکر،\ntیم مالی مارکت',
  },
  {
    name: 'به‌روزرسانی پلتفرم',
    subject: 'به‌روزرسانی جدید — مالی مارکت',
    body: 'سلام،\n\nپلتفرم مالی مارکت به‌روزرسانی شد:\n\n• ویژگی‌های جدید:\n• بهبودها:\n• رفع باگ‌ها:\n\nاز نسخه جدید لذت ببرید.\n\nبا تشکر،\ntیم مالی مارکت',
  },
];

interface Props {
  initial: {
    rows: NewsletterRow[];
    total: number;
    active: number;
    inactive: number;
  } | null;
}

export default function NewsletterClient({ initial }: Props) {
  const { toast } = useToast();
  const [, startTransition] = useTransition();

  const [items, setItems] = useState<NewsletterRow[]>(initial?.rows ?? []);
  const [total, setTotal] = useState(initial?.total ?? 0);
  const [activeCount, setActiveCount] = useState(initial?.active ?? 0);
  const [inactiveCount, setInactiveCount] = useState(initial?.inactive ?? 0);
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<NewsletterRow | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [pageSize, setPageSize] = useState(25);

  const displayed = useMemo(() => {
    let filtered = items;
    if (tab === 'active') filtered = items.filter((i) => i.isActive);
    if (tab === 'inactive') filtered = items.filter((i) => !i.isActive);
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter((i) => i.email.toLowerCase().includes(q));
    }
    return filtered;
  }, [items, tab, search]);

  const totalPages = Math.ceil(displayed.length / pageSize);
  const [page, setPage] = useState(0);
  const pagedRows = useMemo(() => {
    const start = page * pageSize;
    return displayed.slice(start, start + pageSize);
  }, [displayed, page, pageSize]);

  const linkedCount = useMemo(() => items.filter((i) => i.linkedUser).length, [items]);

  const growthSeries = useMemo(() => {
    const days = 14;
    const now = Date.now();
    const dayMs = 86400000;
    const series: number[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const threshold = new Date(now - i * dayMs);
      series.push(items.filter((item) => item.createdAt >= threshold).length);
    }
    return series;
  }, [items]);

  const lastWeekGrowth = useMemo(() => {
    const weekMs = 7 * 86400000;
    return items.filter((item) => item.createdAt >= new Date(Date.now() - weekMs)).length;
  }, [items]);

  const activeRate = useMemo(() => {
    if (total <= 0) return 0;
    return Math.round((activeCount / total) * 100);
  }, [activeCount, total]);

  const recentSignups = useMemo(
    () => [...items].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 3),
    [items],
  );

  const handleToggle = useCallback(
    (row: NewsletterRow) => {
      startTransition(async () => {
        const next = !row.isActive;
        setItems((prev) =>
          prev.map((item) => (item.id === row.id ? { ...item, isActive: next } : item)),
        );
        setActiveCount((a) => Math.max(0, a + (next ? 1 : -1)));
        setInactiveCount((i) => Math.max(0, i + (next ? -1 : 1)));
        const result = await setSubscriberActive(row.id, next);
        if (!result.success) {
          toast({ title: result.message ?? 'خطا', variant: 'destructive' });
          // بازگشت به وضعیت قبل
          setItems((prev) =>
            prev.map((item) => (item.id === row.id ? { ...item, isActive: row.isActive } : item)),
          );
          setActiveCount((a) => Math.max(0, a + (next ? -1 : 1)));
          setInactiveCount((i) => Math.max(0, i + (next ? 1 : -1)));
        }
      });
    },
    [toast],
  );

  const handleBulkToggle = useCallback(
    (activate: boolean) => {
      startTransition(async () => {
        const keys = selectedKeys;
        const affected = items.filter((i) => keys.includes(i.id) && i.isActive !== activate).length;
        setItems((prev) =>
          prev.map((item) => (keys.includes(item.id) ? { ...item, isActive: activate } : item)),
        );
        setActiveCount((a) => Math.max(0, a + (activate ? affected : -affected)));
        setInactiveCount((i) => Math.max(0, i + (activate ? -affected : affected)));
        setSelectedKeys([]);
        let failed = false;
        for (const id of keys) {
          const result = await setSubscriberActive(id, activate);
          if (!result.success) failed = true;
        }
        if (failed) toast({ title: 'برخی تغییرات اعمال نشد', variant: 'destructive' });
      });
    },
    [selectedKeys, items, toast],
  );

  const handleDelete = useCallback(
    (id: string) => {
      startTransition(async () => {
        const item = items.find((i) => i.id === id);
        setItems((prev) => prev.filter((item2) => item2.id !== id));
        setTotal((t) => Math.max(0, t - 1));
        if (item?.isActive) setActiveCount((a) => Math.max(0, a - 1));
        else if (item) setInactiveCount((i) => Math.max(0, i - 1));
        const result = await deleteSubscribers([id]);
        if (!result.success && item) {
          toast({ title: result.message ?? 'خطا', variant: 'destructive' });
          // بازیابی ردیف حذف‌شده
          setItems((prev) => [...prev, item]);
          setTotal((t) => t + 1);
          if (item.isActive) setActiveCount((a) => a + 1);
          else setInactiveCount((i) => i + 1);
        }
      });
    },
    [items, toast],
  );

  const confirmDelete = useCallback(() => {
    if (deleteTarget) {
      handleDelete(deleteTarget.id);
      setDeleteTarget(null);
    } else if (bulkDeleteOpen) {
      startTransition(async () => {
        const keys = selectedKeys;
        const affectedActive = items.filter((i) => keys.includes(i.id) && i.isActive).length;
        const affectedInactive = keys.length - affectedActive;
        setItems((prev) => prev.filter((item) => !keys.includes(item.id)));
        setTotal((t) => Math.max(0, t - keys.length));
        setActiveCount((a) => Math.max(0, a - affectedActive));
        setInactiveCount((i) => Math.max(0, i - affectedInactive));
        setSelectedKeys([]);
        setBulkDeleteOpen(false);
        const result = await deleteSubscribers(keys);
        if (!result.success) {
          toast({ title: result.message ?? 'خطا', variant: 'destructive' });
        }
      });
    }
  }, [deleteTarget, bulkDeleteOpen, selectedKeys, items, handleDelete, toast]);

  const handleBroadcast = useCallback(() => {
    startTransition(async () => {
      const result = await sendNewsletterBroadcast({ subject, body });
      if (result.success) {
        toast({ title: 'خبرنامه ارسال شد' });
        setComposerOpen(false);
        setSubject('');
        setBody('');
      } else {
        toast({ title: result.message ?? 'خطا', variant: 'destructive' });
      }
    });
  }, [subject, body, toast]);

  const applyTemplate = useCallback((t: (typeof TEMPLATES)[number]) => {
    setSubject(t.subject);
    setBody(t.body);
  }, []);

  const exportData = useMemo(
    () =>
      displayed.map((row) => ({
        email: row.email,
        status: row.isActive ? 'فعال' : 'غیرفعال',
        linked: row.linkedUser ? 'بله' : 'خیر',
        registered: row.time,
      })),
    [displayed],
  );

  const exportColumns = [
    { key: 'email', header: 'ایمیل' },
    { key: 'status', header: 'وضعیت' },
    { key: 'linked', header: 'حساب کاربری' },
    { key: 'registered', header: 'تاریخ عضویت' },
  ];

  const columns: Column<NewsletterRow>[] = useMemo(
    () => [
      {
        key: 'email',
        header: 'ایمیل',
        render: (r) => (
          <div className={s.emailCell}>
            <span className={r.isActive ? s.dotOn : s.dotOff} />
            <span className={s.email}>{r.email}</span>
            {r.linkedUser && <span className={s.linkedBadge}>حساب کاربری</span>}
          </div>
        ),
      },
      {
        key: 'status',
        header: 'وضعیت',
        render: (r) => (
          <span className={`${s.pill} ${r.isActive ? s.pillOn : s.pillOff}`}>
            {r.isActive ? 'فعال' : 'غیرفعال'}
          </span>
        ),
      },
      {
        key: 'time',
        header: 'تاریخ عضویت',
        collapse: true,
        render: (r) => <span className={s.time}>{r.time}</span>,
      },
      {
        key: 'actions',
        header: '',
        render: (r) => (
          <div className={s.rowActions}>
            <button
              type="button"
              className={`${s.iconBtn} ${r.isActive ? s.iconAmber : s.iconGreen}`}
              onClick={() => handleToggle(r)}
              title={r.isActive ? 'غیرفعال' : 'فعال'}
            >
              {r.isActive ? <X size={14} /> : <Check size={14} />}
            </button>
            <button
              type="button"
              className={`${s.iconBtn} ${s.iconDanger}`}
              onClick={() => setDeleteTarget(r)}
              title="حذف"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ),
      },
    ],
    [handleToggle],
  );

  return (
    <div className={s.root}>
      <PageHero
        breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: 'خبرنامه' }]}
        eyebrow="بازاریابی"
        title="خبرنامه"
        description="مدیریت مشترکین و ارسال خبرنامه"
        actions={
          <Button size="sm" onClick={() => setComposerOpen(true)} className={s.sendBtn}>
            <Send size={14} className="rtl:-scale-x-100" />
            <span className={s.btnLabel}>ارسال خبرنامه</span>
          </Button>
        }
      />

      <StatGrid>
        <KpiCard
          label="کل مشترکین"
          value={total}
          icon={Users}
          spark={growthSeries.length > 1 ? <TrendSparkline data={growthSeries} /> : undefined}
        />
        <KpiCard label="فعال" value={activeCount} icon={Check} />
        <KpiCard label="غیرفعال" value={inactiveCount} icon={X} />
        <KpiCard label="حساب کاربری" value={linkedCount} icon={Sparkles} />
      </StatGrid>

      {selectedKeys.length > 0 && (
        <div className={s.bulkBar}>
          <span className={s.bulkCount}>{fa.format(selectedKeys.length)} مورد انتخاب شده</span>
          <div className={s.bulkActions}>
            <Button size="sm" onClick={() => handleBulkToggle(true)}>
              <Check size={14} />
              <span className={s.btnLabel}>فعال</span>
            </Button>
            <Button size="sm" variant="secondary" onClick={() => handleBulkToggle(false)}>
              <X size={14} />
              <span className={s.btnLabel}>غیرفعال</span>
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setBulkDeleteOpen(true)}>
              <Trash2 size={14} />
              <span className={s.btnLabel}>حذف</span>
            </Button>
          </div>
        </div>
      )}

      <InsightLayout
        main={
          <DataPanel
            title="مشترکین"
            icon={<Users size={14} strokeWidth={1.75} />}
            count={fa.format(displayed.length)}
            footer={
              <div className={s.foot}>
                {totalPages > 1 && (
                  <div className={s.pager}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      <ChevronRight size={14} />
                      قبلی
                    </Button>
                    <span className={s.pageInfo}>
                      {fa.format(page + 1)} از {fa.format(totalPages)}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                    >
                      بعدی
                      <ChevronLeft size={14} />
                    </Button>
                    <Select
                      value={String(pageSize)}
                      onValueChange={(v) => {
                        setPageSize(Number(v));
                        setPage(0);
                      }}
                    >
                      <SelectTrigger className={s.pageSizeSelect}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">۱۰</SelectItem>
                        <SelectItem value="25">۲۵</SelectItem>
                        <SelectItem value="50">۵۰</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <span className={s.footCount}>
                  {fa.format(displayed.length)} از {fa.format(total)} مشترک
                </span>
              </div>
            }
          >
            <TableToolbar
              filters={
                <div className={s.tabs}>
                  {(
                    [
                      { key: 'all', label: 'همه', count: total },
                      { key: 'active', label: 'فعال', count: activeCount },
                      { key: 'inactive', label: 'غیرفعال', count: inactiveCount },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      className={t.key === tab ? `${s.tab} ${s.tabActive}` : s.tab}
                      onClick={() => setTab(t.key)}
                    >
                      {t.label}
                      <span className={s.tabBadge}>{fa.format(t.count)}</span>
                    </button>
                  ))}
                </div>
              }
              search={
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="جستجو در ایمیل‌ها..."
                />
              }
              actions={
                displayed.length > 0 ? (
                  <ExportButton
                    data={exportData}
                    columns={exportColumns}
                    filename="newsletter-export"
                    label="خروجی"
                  />
                ) : undefined
              }
            />

            <DataTable
              columns={columns}
              rows={pagedRows}
              rowKey={(row) => row.id}
              selectable
              selectedKeys={selectedKeys}
              onSelectionChange={setSelectedKeys}
              empty={
                <MillionDollarEmpty
                  variant="inbox"
                  eyebrow="خبرنامه"
                  title={search ? 'مشترکی یافت نشد' : 'هنوز مشترکی نیست'}
                  description={
                    search
                      ? 'جستجوی خود را تغییر دهید'
                      : 'وقتی کاربران عضو خبرنامه شوند، اینجا نمایش داده می‌شود'
                  }
                  tone="primary"
                />
              }
            />
          </DataPanel>
        }
        aside={
          <InsightPanel>
            <InsightCard title="رشد ۱۴ روزه">
              {growthSeries.length > 1 ? (
                <div className={s.growthBlock}>
                  <TrendSparkline data={growthSeries} height={48} width={220} />
                  <div className={s.growthMeta}>
                    <span className={s.growthValue}>+{fa.format(lastWeekGrowth)}</span>
                    <span className={s.growthLabel}>عضویت جدید در ۷ روز گذشته</span>
                  </div>
                </div>
              ) : (
                <p className={s.insightEmpty}>هنوز داده‌ای نیست</p>
              )}
            </InsightCard>

            <InsightCard title="نرخ فعال">
              <div className={s.rateBlock}>
                <div className={s.rateValue}>{fa.format(activeRate)}٪</div>
                <div className={s.rateTrack}>
                  <div className={s.rateFill} style={{ width: `${activeRate}%` }} />
                </div>
                <div className={s.rateMeta}>
                  <span>{fa.format(activeCount)} فعال</span>
                  <span>از {fa.format(total)} کل</span>
                </div>
              </div>
            </InsightCard>

            <InsightCard title="آخرین عضویت‌ها">
              {recentSignups.length > 0 ? (
                <ul className={s.signupList}>
                  {recentSignups.map((item) => (
                    <li key={item.id} className={s.signupRow}>
                      <span className={s.signupIcon}>
                        <Mail size={13} />
                      </span>
                      <div className={s.signupMeta}>
                        <span className={s.signupEmail}>{item.email}</span>
                        <span className={s.signupTime}>{item.time}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={s.insightEmpty}>هنوز عضویتی ثبت نشده است</p>
              )}
            </InsightCard>

            <InsightCard title="دسترسی سریع">
              <div className={s.quickLinks}>
                <Link href="/dashboard/settings" className={s.quickLink}>
                  <Settings size={14} />
                  تنظیمات ایمیل
                </Link>
                <Link href="/dashboard/analytics" className={s.quickLink}>
                  <BarChart3 size={14} />
                  آمار
                </Link>
              </div>
            </InsightCard>
          </InsightPanel>
        }
      />

      {/* Broadcast Composer */}
      <Dialog
        open={composerOpen}
        onOpenChange={(open) => {
          if (!open) {
            setComposerOpen(false);
            setSubject('');
            setBody('');
          }
        }}
      >
        <DialogContent className={s.composerSheet}>
          <DialogHeader>
            <DialogTitle className={s.composerTitle}>
              <span className={s.composerIcon}>
                <Send size={18} className="rtl:-scale-x-100" />
              </span>
              ارسال خبرنامه
            </DialogTitle>
          </DialogHeader>

          <div className={s.templateBar}>
            <span className={s.templateLabel}>قالب‌ها:</span>
            <div className={s.templateList}>
              {TEMPLATES.map((t) => (
                <button
                  key={t.name}
                  type="button"
                  className={s.templateChip}
                  onClick={() => applyTemplate(t)}
                >
                  <Sparkles size={12} />
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          <div className={s.form}>
            <label className={s.fieldLabel} htmlFor="nl-subject">
              موضوع
              <Input
                id="nl-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="موضوع خبرنامه..."
                className={s.fieldInput}
              />
            </label>
            <label className={s.fieldLabel} htmlFor="nl-body">
              متن
              <Textarea
                id="nl-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="متن خبرنامه..."
                rows={8}
                className={s.fieldTextarea}
              />
            </label>
          </div>

          <div className={s.composerFooter}>
            <Button size="sm" variant="secondary" onClick={() => setComposerOpen(false)}>
              انصراف
            </Button>
            <Button size="sm" onClick={handleBroadcast} disabled={!subject.trim() || !body.trim()}>
              <Send size={14} className="rtl:-scale-x-100" />
              <span>ارسال به {fa.format(activeCount)} مشترک فعال</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget || bulkDeleteOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setBulkDeleteOpen(false);
          }
        }}
        title="حذف مشترکین"
        description={`${fa.format(deleteTarget ? 1 : selectedKeys.length)} مشترک حذف می‌شود. این عمل قابل بازگشت نیست.`}
        confirmLabel="حذف شود"
        onConfirm={confirmDelete}
        variant="danger"
      />
    </div>
  );
}
