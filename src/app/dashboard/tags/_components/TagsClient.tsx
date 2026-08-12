'use client';

/**
 * TagsClient — مدیریت برچسب‌ها (redesigned 2026)
 *
 * New architecture: PageHero → KPI strip → InsightLayout with a framed
 * DataPanel (search + table) and a usage rail (top tags bars, usage-share
 * donut). All tag CRUD logic is unchanged. Fixes the broken `tone-*`
 * monogram colors (CSS-module scoping bug — classes now resolved via the
 * module so categorical colors actually render).
 */

import { type TagRow, createTag, deleteTag, getTags, updateTag } from '@/actions/tag-actions';
import {
  BarList,
  type Column,
  ConfirmDialog,
  DataPanel,
  DataTable,
  ExportButton,
  InsightCard,
  type InsightColor,
  InsightLayout,
  InsightPanel,
  KpiCard,
  MillionDollarEmpty,
  PageHero,
  SearchInput,
  SplitBar,
  type SplitBarSegment,
  StatGrid,
  TableToolbar,
} from '@/components/Dashboard/primitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useToast } from '@/components/ui/use-toast';
import {
  Archive,
  FileText,
  Hash,
  Plus,
  Settings,
  Sparkles,
  Tag,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useMemo, useState, useTransition } from 'react';
import s from './TagsClient.module.css';

const fa = new Intl.NumberFormat('fa-IR');

const TAG_TONES: InsightColor[] = ['amber', 'violet', 'cyan', 'emerald', 'rose', 'indigo', 'slate'];

function getTone(index: number): InsightColor {
  return TAG_TONES[index % TAG_TONES.length];
}

interface Props {
  initial: {
    rows: TagRow[];
    total: number;
  } | null;
}

export default function TagsClient({ initial }: Props) {
  const { toast } = useToast();
  const [, startTransition] = useTransition();

  const [items, setItems] = useState<TagRow[]>(initial?.rows ?? []);
  const [total, setTotal] = useState(initial?.total ?? 0);
  const [search, setSearch] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<TagRow | null>(null);
  const [bulkDeleteKeys, setBulkDeleteKeys] = useState<string[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TagRow | null>(null);
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');

  // هماهنگ‌سازی مجدد با سرور پس از شکست عملیات (حذف تکی/گروهی).
  const refresh = useCallback(async () => {
    const result = await getTags();
    if (result.success && result.data) {
      setItems(result.data.rows);
      setTotal(result.data.total);
    }
  }, []);

  const displayed = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (t) => t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q),
    );
  }, [items, search]);

  const totalPosts = useMemo(() => items.reduce((sum, t) => sum + t.postCount, 0), [items]);
  const usedTags = useMemo(() => items.filter((t) => t.postCount > 0).length, [items]);
  const topTag = useMemo(() => {
    return items.reduce((best, t) => (t.postCount > best.postCount ? t : best), items[0] ?? null);
  }, [items]);

  /* ── Insights ── */

  const topTags = useMemo(() => {
    return [...items]
      .sort((a, b) => b.postCount - a.postCount)
      .slice(0, 5)
      .map((t, i) => ({
        label: t.name,
        value: t.postCount,
        color: getTone(i),
        hint: `/${t.slug}`,
      }));
  }, [items]);

  const usageSplit = useMemo<SplitBarSegment[]>(() => {
    const unused = items.filter((t) => t.postCount === 0).length;
    return [
      { label: 'در استفاده', value: usedTags, color: 'emerald' },
      { label: 'بدون استفاده', value: unused, color: 'slate' },
    ];
  }, [items, usedTags]);

  const openCreate = useCallback(() => {
    setEditTarget(null);
    setFormName('');
    setFormSlug('');
    setSheetOpen(true);
  }, []);

  const openEdit = useCallback((tag: TagRow) => {
    setEditTarget(tag);
    setFormName(tag.name);
    setFormSlug(tag.slug);
    setSheetOpen(true);
  }, []);

  const save = useCallback(() => {
    if (!formName.trim()) return;
    startTransition(async () => {
      if (editTarget) {
        const result = await updateTag(editTarget.id, {
          name: formName.trim(),
          slug: formSlug.trim() || undefined,
        });
        if (result.success && result.data) {
          // ردیف برگشتی سرور (با اسلاگ واقعی) جایگزین می‌شود — نه نسخهٔ محلی حدسی.
          const updated = result.data;
          setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
          toast({ title: 'برچسب ویرایش شد' });
          setSheetOpen(false);
        } else {
          toast({ title: result.message ?? 'خطا در ویرایش برچسب', variant: 'destructive' });
        }
      } else {
        const result = await createTag({
          name: formName.trim(),
          slug: formSlug.trim() || undefined,
        });
        if (result.success && result.data) {
          const created = result.data;
          // درج مرتب‌شده بر اساس نام — جدول به‌ترتیب الفبا است.
          setItems((prev) => {
            const next = [...prev];
            const idx = next.findIndex((i) => i.name.localeCompare(created.name) > 0);
            next.splice(idx === -1 ? next.length : idx, 0, created);
            return next;
          });
          setTotal((t) => t + 1);
          toast({ title: 'برچسب ساخته شد' });
          setSheetOpen(false);
        } else {
          toast({ title: result.message ?? 'خطا در ساخت برچسب', variant: 'destructive' });
        }
      }
    });
  }, [editTarget, formName, formSlug, toast]);

  const handleDelete = useCallback(
    (tag: TagRow) => {
      startTransition(async () => {
        setItems((prev) => prev.filter((item) => item.id !== tag.id));
        setTotal((t) => t - 1);
        const result = await deleteTag(tag.id);
        if (!result.success) {
          toast({ title: result.message ?? 'خطا', variant: 'destructive' });
          await refresh(); // بازیابی وضعیت واقعی از سرور
        }
      });
    },
    [toast, refresh],
  );

  const confirmBulkDelete = useCallback(() => {
    startTransition(async () => {
      const keys = bulkDeleteKeys;
      setItems((prev) => prev.filter((item) => !keys.includes(item.id)));
      setTotal((t) => Math.max(0, t - keys.length));
      setSelectedKeys([]);
      setBulkDeleteKeys([]);
      let failed = false;
      for (const id of keys) {
        const result = await deleteTag(id);
        if (!result.success) failed = true;
      }
      if (failed) {
        toast({ title: 'برخی برچسب‌ها حذف نشدند', variant: 'destructive' });
        await refresh();
      } else {
        toast({ title: 'برچسب‌ها حذف شدند' });
      }
    });
  }, [bulkDeleteKeys, toast, refresh]);

  const exportData = useMemo(
    () =>
      items.map((t) => ({
        name: t.name,
        slug: t.slug,
        posts: t.postCount,
      })),
    [items],
  );

  const exportColumns = [
    { key: 'name', header: 'نام' },
    { key: 'slug', header: 'اسلاگ' },
    { key: 'posts', header: 'تعداد مقاله' },
  ];

  const columns: Column<TagRow>[] = useMemo(
    () => [
      {
        key: 'tag',
        header: 'برچسب',
        render: (t) => {
          const tone = getTone(items.indexOf(t));
          return (
            <div className={s.tagCell}>
              <div className={`${s.tagMonogram} ${TONE_CLASS[tone]}`}>
                <Hash size={14} />
              </div>
              <div className={s.tagInfo}>
                <span className={s.tagName}>{t.name}</span>
                <span className={s.tagSlug}>/{t.slug}</span>
              </div>
            </div>
          );
        },
      },
      {
        key: 'posts',
        header: 'مقاله‌ها',
        render: (t) => (
          <div className={s.postsCell}>
            <span className={s.postsCount}>{fa.format(t.postCount)}</span>
            {t.postCount > 0 && <span className={s.postsLabel}>مقاله</span>}
          </div>
        ),
      },
      {
        key: 'actions',
        header: '',
        render: (t) => (
          <div className={s.rowActions}>
            <button type="button" className={s.iconBtn} onClick={() => openEdit(t)} title="ویرایش">
              <Archive size={14} />
            </button>
            <button
              type="button"
              className={`${s.iconBtn} ${s.iconDanger}`}
              onClick={() => setDeleteTarget(t)}
              title="حذف"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ),
      },
    ],
    [openEdit, items],
  );

  return (
    <div className={s.root}>
      <PageHero
        breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: 'برچسب‌ها' }]}
        eyebrow="محتوا"
        title="مدیریت برچسب‌ها"
        description="ساخت، ویرایش و حذف برچسب‌های مقالات"
        actions={
          <Button size="sm" onClick={openCreate} className={s.createBtn}>
            <Plus size={14} />
            <span className={s.btnLabel}>برچسب جدید</span>
          </Button>
        }
      />

      <StatGrid>
        <KpiCard label="کل برچسب‌ها" value={total} icon={Tag} />
        <KpiCard label="در استفاده" value={usedTags} icon={Sparkles} />
        <KpiCard label="مقاله‌های برچسب‌دار" value={totalPosts} icon={Archive} />
        <KpiCard label="پرکاربردترین" value={topTag ? topTag.name : '—'} icon={TrendingUp} />
      </StatGrid>

      {selectedKeys.length > 0 && (
        <div className={s.bulkBar}>
          <span className={s.bulkCount}>{fa.format(selectedKeys.length)} مورد انتخاب شده</span>
          <div className={s.bulkActions}>
            <Button size="sm" variant="destructive" onClick={() => setBulkDeleteKeys(selectedKeys)}>
              <Trash2 size={14} />
              <span className={s.btnLabel}>حذف</span>
            </Button>
          </div>
        </div>
      )}

      <InsightLayout
        main={
          <DataPanel
            title="برچسب‌ها"
            icon={<Hash size={14} strokeWidth={1.75} />}
            count={fa.format(displayed.length)}
            footer={
              <div className={s.foot}>
                <span className={s.footCount}>
                  {fa.format(displayed.length)} از {fa.format(total)} برچسب
                </span>
              </div>
            }
          >
            <TableToolbar
              search={
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="جستجو در برچسب‌ها..."
                />
              }
              actions={
                items.length > 0 ? (
                  <ExportButton
                    data={exportData}
                    columns={exportColumns}
                    filename="tags-export"
                    label="خروجی"
                  />
                ) : undefined
              }
            />

            <DataTable
              columns={columns}
              rows={displayed}
              rowKey={(row) => row.id}
              selectable
              selectedKeys={selectedKeys}
              onSelectionChange={setSelectedKeys}
              empty={
                <MillionDollarEmpty
                  variant="sparkles"
                  eyebrow="مدیریت برچسب‌ها"
                  title={search ? 'برچسبی یافت نشد' : 'هنوز برچسبی نیست'}
                  description={
                    search
                      ? 'جستجوی خود را تغییر دهید'
                      : 'اولین برچسب را بسازید تا مقالات را دسته‌بندی کنید'
                  }
                  tone="amber"
                />
              }
            />
          </DataPanel>
        }
        aside={
          <InsightPanel>
            <InsightCard title="پرکاربردترین برچسب‌ها">
              {topTags.length > 0 ? (
                <BarList data={topTags} showShare />
              ) : (
                <p className={s.insightEmpty}>هنوز برچسبی ساخته نشده است</p>
              )}
            </InsightCard>

            <InsightCard title="سهم استفاده از برچسب‌ها">
              {total > 0 ? (
                <SplitBar data={usageSplit} format={(v) => fa.format(v)} />
              ) : (
                <p className={s.insightEmpty}>هنوز برچسبی ساخته نشده است</p>
              )}
            </InsightCard>

            <InsightCard title="دسترسی سریع">
              <div className={s.quickLinks}>
                <Link href="/dashboard/posts" className={s.quickLink}>
                  <FileText size={14} />
                  مقالات
                </Link>
                <Link href="/dashboard/settings" className={s.quickLink}>
                  <Settings size={14} />
                  تنظیمات
                </Link>
              </div>
            </InsightCard>
          </InsightPanel>
        }
      />

      {/* Create/Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className={s.sheet}>
          <SheetHeader>
            <div className={s.sheetIcon}>
              <Hash size={20} />
            </div>
            <SheetTitle className={s.sheetTitle}>
              {editTarget ? 'ویرایش برچسب' : 'برچسب جدید'}
            </SheetTitle>
            <SheetDescription className={s.sheetSub}>
              {editTarget
                ? 'نام و اسلاگ برچسب را ویرایش کنید'
                : 'نام و اسلاگ برچسب جدید را وارد کنید'}
            </SheetDescription>
          </SheetHeader>

          <div className={s.form}>
            <label className={s.fieldLabel} htmlFor="tag-name">
              نام برچسب
              <Input
                id="tag-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="مثلا: تکنولوژی"
                className={s.fieldInput}
                autoFocus
              />
            </label>
            <label className={s.fieldLabel} htmlFor="tag-slug">
              اسلاگ
              <Input
                id="tag-slug"
                value={formSlug}
                onChange={(e) => setFormSlug(e.target.value)}
                placeholder="مثلا: technology (خالی = خودکار)"
                className={s.fieldInput}
                dir="ltr"
              />
            </label>
          </div>

          <div className={s.sheetFooter}>
            <Button size="sm" variant="secondary" onClick={() => setSheetOpen(false)}>
              انصراف
            </Button>
            <Button size="sm" onClick={save} disabled={!formName.trim()}>
              {editTarget ? 'ذخیره' : 'ساخت'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="حذف برچسب"
        description={
          deleteTarget
            ? `"${deleteTarget.name}" حذف می‌شود. ارتباط با ${fa.format(deleteTarget.postCount)} مقاله قطع می‌شود.`
            : ''
        }
        confirmLabel="حذف شود"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        variant="danger"
      />

      <ConfirmDialog
        open={bulkDeleteKeys.length > 0}
        onOpenChange={(open) => !open && setBulkDeleteKeys([])}
        title="حذف گروهی برچسب‌ها"
        description={`${fa.format(bulkDeleteKeys.length)} برچسب حذف می‌شود. ارتباط با مقالات قطع می‌شود و این عمل قابل بازگشت نیست.`}
        confirmLabel="حذف شود"
        onConfirm={confirmBulkDelete}
        variant="danger"
      />
    </div>
  );
}

/* Resolve a categorical tone to a real scoped class (fixes the old
   plain-string `tone-*` classes that CSS modules never matched). */
const TONE_CLASS: Record<InsightColor, string> = {
  amber: s.toneAmber,
  violet: s.toneViolet,
  cyan: s.toneCyan,
  emerald: s.toneEmerald,
  rose: s.toneRose,
  indigo: s.toneIndigo,
  slate: s.toneSlate,
};
