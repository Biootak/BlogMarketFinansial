'use client';

/**
 * NewsletterClient — خبرنامه (redesigned 2026 premium)
 *
 * Architecture: PageHero → KPI strip (semantic accents) → InsightLayout
 * with framed DataPanel (tabs + search + date filter + paginated table)
 * and growth rail (14-day sparkline, active-rate donut, latest signups).
 *
 * Features: broadcast composer, bulk activate/deactivate/delete,
 * copy email, template library, CSV export, keyboard shortcuts.
 *
 * Pager icons RTL-correct (previous → right chevron, next → left chevron).
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
import type { DateRange } from '@/components/ui/PersianDateRangePicker';
import { PersianDateRangePicker } from '@/components/ui/PersianDateRangePicker';
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
  Copy,
  Mail,
  Send,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
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
  const searchRef = useRef<HTMLInputElement>(null);

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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(!initial);
  const [dateRange, setDateRange] = useState<DateRange | null>(null);

  // Keyboard shortcut: Ctrl+K / Cmd+K to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Simulate initial load skeleton
  useEffect(() => {
    if (loading && initial) {
      const t = setTimeout(() => setLoading(false), 400);
      return () => clearTimeout(t);
    }
  }, [loading, initial]);

  const displayed = useMemo(() => {
    let filtered = items;
    if (tab === 'active') filtered = items.filter((i) => i.isActive);
    if (tab === 'inactive') filtered = items.filter((i) => !i.isActive);
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter((i) => i.email.toLowerCase().includes(q));
    }
    if (dateRange?.from) {
      const from = dateRange.from;
      filtered = filtered.filter((i) => i.createdAt >= from);
    }
    if (dateRange?.to) {
      const toEnd = new Date(dateRange.to);
      toEnd.setHours(23, 59, 59, 999);
      filtered = filtered.filter((i) => i.createdAt <= toEnd);
    }
    return filtered;
  }, [items, tab, search, dateRange]);

  const totalPages = Math.ceil(displayed.length / pageSize);
  const [page, setPage] = useState(0);
  const pagedRows = useMemo(() => {
    const start = page * pageSize;
    return displayed.slice(start, start + pageSize);
  }, [displayed, page, pageSize]);

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

  const copyEmail = useCallback(
    (email: string, id: string) => {
      navigator.clipboard.writeText(email).then(() => {
        setCopiedId(id);
        toast({ title: 'ایمیل کپی شد', duration: 2000 });
        setTimeout(() => setCopiedId(null), 2000);
      });
    },
    [toast],
  );

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
            <button
              type="button"
              className={s.copyBtn}
              onClick={() => copyEmail(r.email, r.id)}
              title="کپی ایمیل"
            >
              {copiedId === r.id ? <Check size={12} /> : <Copy size={12} />}
            </button>
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
    [handleToggle, copyEmail, copiedId],
  );

  // Bulk action buttons
  const bulkActions = useMemo(() => {
    if (selectedKeys.length === 0) return null;
    return (
      <div className={s.bulkBar}>
        <span className={s.bulkCount}>{fa.format(selectedKeys.length)} مشترک انتخاب شده</span>
        <div className={s.bulkBtns}>
          <Button
            size="sm"
            variant="ghost"
            className={s.bulkActivate}
            onClick={() => handleBulkToggle(true)}
          >
            <Check size={13} />
            <span>فعال کردن</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className={s.bulkDeactivate}
            onClick={() => handleBulkToggle(false)}
          >
            <X size={13} />
            <span>غیرفعال کردن</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className={s.bulkDelete}
            onClick={() => setBulkDeleteOpen(true)}
          >
            <Trash2 size={13} />
            <span>حذف</span>
          </Button>
        </div>
      </div>
    );
  }, [selectedKeys, handleBulkToggle]);

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

      <StatGrid cols={3}>
        <KpiCard
          label="کل مشترکین"
          value={total}
          icon={Users}
          trend={lastWeekGrowth > 0 ? 'up' : total > 0 ? 'neutral' : undefined}
          info={`${fa.format(activeCount)} فعال · ${fa.format(inactiveCount)} غیرفعال`}
          spark={
            growthSeries.length > 1 ? (
              <TrendSparkline data={growthSeries} color="var(--ds-accent-emerald)" />
            ) : undefined
          }
        />
        <KpiCard
          label="نرخ فعالیت"
          value={`${fa.format(activeRate)}٪`}
          icon={BarChart3}
          trend={activeRate >= 80 ? 'up' : activeRate < 50 ? 'down' : 'neutral'}
          info="نسبت مشترکین فعال به کل"
        />
        <KpiCard
          label="رشد هفتگی"
          value={lastWeekGrowth}
          icon={Sparkles}
          trend={lastWeekGrowth > 0 ? 'up' : 'neutral'}
          info="مشترکین جدید ۷ روز اخیر"
        />
      </StatGrid>

      <InsightLayout
        main={
          <>
            {bulkActions}
            <DataPanel
              title="مشترکین"
              icon={<Mail size={16} />}
              count={displayed.length}
              actions={
                <Button size="sm" onClick={() => setComposerOpen(true)} className={s.inlineSend}>
                  <Send size={13} className="rtl:-scale-x-100" />
                  <span>ارسال</span>
                </Button>
              }
            >
              <TableToolbar
                search={
                  <SearchInput
                    ref={searchRef}
                    value={search}
                    onChange={setSearch}
                    onClear={() => setSearch('')}
                    placeholder="جستجوی ایمیل... (Ctrl+K)"
                    ariaLabel="جستجوی ایمیل"
                  />
                }
                exportData={
                  exportData.length > 0
                    ? {
                        data: exportData,
                        columns: exportColumns,
                        filename: `newsletter-${new Date().toISOString().slice(0, 10)}`,
                        label: 'خروجی CSV',
                      }
                    : undefined
                }
              >
                <div className={s.filterRow}>
                  <div className={s.tabGroup}>
                    {(
                      [
                        ['all', 'همه'],
                        ['active', 'فعال'],
                        ['inactive', 'غیرفعال'],
                      ] as [Tab, string][]
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        className={`${s.tab} ${tab === key ? s.tabActive : ''}`}
                        onClick={() => {
                          setTab(key);
                          setPage(0);
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <PersianDateRangePicker
                    value={dateRange}
                    onChange={(range) => {
                      setDateRange(range);
                      setPage(0);
                    }}
                    className={s.dateFilter}
                    placeholder="فیلتر تاریخ"
                  />
                </div>
              </TableToolbar>

              {pagedRows.length > 0 ? (
                <DataTable
                  columns={columns}
                  rows={pagedRows}
                  rowKey={(r) => r.id}
                  selectable
                  selectedKeys={selectedKeys}
                  onSelectionChange={setSelectedKeys}
                  ariaLabel="مشترکین خبرنامه"
                />
              ) : (
                <MillionDollarEmpty
                  variant="inbox"
                  title="مشترکی یافت نشد"
                  description="وقتی کاربران ثبت‌نام کنند، اینجا نمایش داده می‌شوند"
                  tone="neutral"
                />
              )}

              {totalPages > 1 && (
                <div className={s.pager}>
                  <span className={s.pagerInfo}>
                    صفحه {page + 1} از {totalPages} — {displayed.length} مورد
                  </span>
                  <div className={s.pagerControls}>
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
                        {[10, 25, 50, 100].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n} در هر صفحه
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button
                      type="button"
                      className={s.pagerBtn}
                      disabled={page === 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                    >
                      <ChevronRight size={14} />
                    </button>
                    <button
                      type="button"
                      className={s.pagerBtn}
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    >
                      <ChevronLeft size={14} />
                    </button>
                  </div>
                </div>
              )}
            </DataPanel>
          </>
        }
        aside={
          <InsightPanel>
            <InsightCard title="رشد ۱۴ روزه" icon={BarChart3}>
              {growthSeries.length > 1 ? (
                <TrendSparkline data={growthSeries} color="var(--ds-accent-emerald)" height={64} />
              ) : (
                <div className={s.noData}>داده‌ای موجود نیست</div>
              )}
            </InsightCard>

            <InsightCard title="وضعیت مشترکین" icon={Users}>
              <div className={s.statusBars}>
                <div className={s.statusRow}>
                  <span className={s.statusLabel}>فعال</span>
                  <div className={s.statusTrack}>
                    <div
                      className={s.statusFill}
                      style={{
                        width: `${activeRate}%`,
                        background: 'var(--ds-accent-emerald)',
                      }}
                    />
                  </div>
                  <span className={s.statusValue}>{fa.format(activeRate)}٪</span>
                </div>
                <div className={s.statusRow}>
                  <span className={s.statusLabel}>غیرفعال</span>
                  <div className={s.statusTrack}>
                    <div
                      className={s.statusFill}
                      style={{
                        width: `${100 - activeRate}%`,
                        background: 'var(--ds-accent-amber)',
                      }}
                    />
                  </div>
                  <span className={s.statusValue}>{fa.format(100 - activeRate)}٪</span>
                </div>
              </div>
            </InsightCard>

            {recentSignups.length > 0 && (
              <InsightCard title="آخرین ثبت‌نام‌ها" icon={Sparkles}>
                <ul className={s.signupList}>
                  {recentSignups.map((u) => (
                    <li key={u.id} className={s.signupItem}>
                      <span className={s.signupEmail}>{u.email}</span>
                      <span className={s.signupTime}>{u.time}</span>
                    </li>
                  ))}
                </ul>
              </InsightCard>
            )}
          </InsightPanel>
        }
      />

      {/* ── Broadcast Composer ── */}
      <Dialog open={composerOpen} onOpenChange={setComposerOpen}>
        <DialogContent className={s.composerDialog}>
          <DialogHeader>
            <DialogTitle className={s.composerTitle}>
              <Send size={16} className="rtl:-scale-x-100" />
              ارسال خبرنامه
            </DialogTitle>
          </DialogHeader>

          <div className={s.templateRow}>
            <span className={s.templateLabel}>قالب‌ها:</span>
            <div className={s.templateGrid}>
              {TEMPLATES.map((t) => (
                <button
                  key={t.name}
                  type="button"
                  className={s.templateBtn}
                  onClick={() => applyTemplate(t)}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          <div className={s.formGroup}>
            <label className={s.formLabel} htmlFor="newsletter-subject">
              موضوع *
            </label>
            <Input
              id="newsletter-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="موضوع خبرنامه..."
              className={s.composerInput}
            />
          </div>

          <div className={s.formGroup}>
            <label className={s.formLabel} htmlFor="newsletter-body">
              متن *
            </label>
            <Textarea
              id="newsletter-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="متن خبرنامه..."
              rows={8}
              className={s.composerTextarea}
            />
            <span className={s.charCount}>{fa.format(body.length)} کاراکتر</span>
          </div>

          <div className={s.composerFooter}>
            <Button variant="outline" onClick={() => setComposerOpen(false)}>
              انصراف
            </Button>
            <Button
              onClick={handleBroadcast}
              disabled={!subject.trim() || !body.trim()}
              className={s.sendNow}
            >
              <Send size={14} className="rtl:-scale-x-100" />
              ارسال به {fa.format(activeCount)} مشترک فعال
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="حذف مشترک"
        description={deleteTarget ? `آیا از حذف ${deleteTarget.email} مطمئن هستید؟` : ''}
        confirmLabel="حذف شود"
        onConfirm={confirmDelete}
        variant="danger"
      />

      {/* ── Bulk Delete Confirm ── */}
      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title="حذف گروهی"
        description={`آیا از حذف ${selectedKeys.length} مشترک مطمئن هستید؟ این عمل قابل بازگشت نیست.`}
        confirmLabel="حذف شود"
        onConfirm={confirmDelete}
        variant="danger"
      />
    </div>
  );
}
