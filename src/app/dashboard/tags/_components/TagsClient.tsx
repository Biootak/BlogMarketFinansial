'use client';

/**
 * TagsClient — مدیریت برچسب‌ها (redesigned 2026 premium)
 *
 * Architecture: PageHero (icon) → KPI strip → Filter chips → InsightLayout
 * with framed DataPanel (search + filter + sort + paginated table) and
 * sticky insight rail (donut distribution, top tags bars, usage split,
 * quick links).
 *
 * Premium upgrades (2026):
 * - Client-side pagination (12/page) — the old page rendered ALL tags in one
 *   table (133+ rows), hammering DOM on mobile with per-row stagger.
 * - Hash-based deterministic tone (not index-based O(n²))
 * - Filter chips: all / used / unused
 * - Sort toggle: name / popularity
 * - Relative date column
 * - Slug preview uses the SAME pure `generateSlug` as the server (was a
 *   divergent naive transliterator → preview ≠ what got persisted)
 * - Empty state with CTA
 * - Donut chart for tag distribution
 * - Keyboard shortcut: Enter to save in sheet
 * - Cross-page selection + «select all N results» / clear (Gmail pattern)
 * - Merge two tags (bulk bar) — server-side atomic transaction
 * - Copy-slug on click; drill-down to public archive by tag
 * - Premium mobile density (compact rows, 32px touch targets)
 */

import {
  type TagRow,
  createTag,
  deleteTag,
  getTags,
  mergeTags,
  updateTag,
} from '@/actions/tag-actions';
import {
  BarList,
  type Column,
  ConfirmDialog,
  DataPanel,
  DataTable,
  Donut,
  type DonutSegment,
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
  useTableDensity,
} from '@/components/Dashboard/primitives';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { generateSlug } from '@/lib/slug';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  Archive,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  FileText,
  Filter,
  GitMerge,
  Hash,
  Layers,
  Pencil,
  Plus,
  Settings,
  Sparkles,
  Tag,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react';
import Link from 'next/link';
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import s from './TagsClient.module.css';

const fa = new Intl.NumberFormat('fa-IR');

/** Rows per page — keeps the DOM light and the table scannable on all screens. */
const PAGE_SIZE = 12;

/* ── Deterministic tone from tag name (no index dependency) ── */

const TAG_TONES: InsightColor[] = ['amber', 'violet', 'cyan', 'emerald', 'rose', 'indigo', 'slate'];

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function getTone(name: string): InsightColor {
  return TAG_TONES[hashName(name) % TAG_TONES.length];
}

/* ── Relative date helper ── */

function relativeDate(date: Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'امروز';
  if (diffDays === 1) return 'دیروز';
  if (diffDays < 7) return `${fa.format(diffDays)} روز پیش`;
  if (diffDays < 30) return `${fa.format(Math.floor(diffDays / 7))} هفته پیش`;
  if (diffDays < 365) return `${fa.format(Math.floor(diffDays / 30))} ماه پیش`;
  return `${fa.format(Math.floor(diffDays / 365))} سال پیش`;
}

/* ── Types ── */

type FilterMode = 'all' | 'used' | 'unused';
type SortMode = 'name' | 'popularity';

interface Props {
  initial: {
    rows: TagRow[];
    total: number;
  } | null;
}

/* ── Density-aware list: فشرده → dense table, راحت → comfortable card grid ── */

interface TagListViewProps {
  columns: Column<TagRow>[];
  rows: TagRow[];
  rowKey: (row: TagRow, index: number) => string;
  selectedKeys?: string[];
  onSelectionChange?: (keys: string[]) => void;
  empty?: ReactNode;
  onCopySlug: (slug: string, name: string) => void;
  onEdit: (tag: TagRow) => void;
  onDelete: (tag: TagRow) => void;
}

function TagListView({
  columns,
  rows,
  rowKey,
  selectedKeys,
  onSelectionChange,
  empty,
  onCopySlug,
  onEdit,
  onDelete,
}: TagListViewProps) {
  const { density } = useTableDensity();

  if (density !== 'comfortable') {
    return (
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={rowKey}
        selectable
        selectedKeys={selectedKeys}
        onSelectionChange={onSelectionChange}
        empty={empty}
      />
    );
  }

  if (rows.length === 0) {
    return <div className={s.cardEmpty}>{empty}</div>;
  }

  const toggleCard = (key: string) => {
    const set = new Set(selectedKeys ?? []);
    if (set.has(key)) set.delete(key);
    else set.add(key);
    onSelectionChange?.(Array.from(set));
  };

  return (
    <div className={s.cardGrid}>
      {rows.map((tag, i) => {
        const key = rowKey(tag, i);
        const checked = selectedKeys?.includes(key) ?? false;
        return (
          <article
            key={key}
            className={`${s.tagCard} ${checked ? s.tagCardSelected : ''}`}
            aria-selected={checked}
          >
            <div className={s.cardTop}>
              <span
                className={`${s.tagMonogram} ${s.cardMonogram} ${s[`tone_${getTone(tag.name)}`]}`}
              >
                <Hash size={15} strokeWidth={2} />
              </span>
              <div className={s.tagInfo}>
                <span className={s.cardName} title={tag.name}>
                  {tag.name}
                </span>
                <button
                  type="button"
                  className={s.slugCopy}
                  onClick={() => onCopySlug(tag.slug, tag.name)}
                  title="کپی اسلاگ"
                  aria-label={`کپی اسلاگ ${tag.name}`}
                >
                  <span className={s.slugText}>/{tag.slug}</span>
                  <Copy size={10} strokeWidth={2} className={s.slugCopyIcon} aria-hidden />
                </button>
              </div>
              <label className={s.cardCheck} htmlFor={`tag-check-${tag.id}`}>
                <Checkbox
                  id={`tag-check-${tag.id}`}
                  checked={checked}
                  onCheckedChange={() => toggleCard(key)}
                  aria-label={`انتخاب ${tag.name}`}
                />
              </label>
            </div>

            <div className={s.cardMeta}>
              {tag.postCount > 0 ? (
                <Link
                  href={`/archive/tag/${tag.slug}`}
                  className={s.postsLink}
                  title={`مشاهدهٔ ${fa.format(tag.postCount)} مقاله با برچسب ${tag.name}`}
                >
                  <span className={s.postsCount}>{fa.format(tag.postCount)}</span>
                  <span className={s.postsLabel}>مقاله</span>
                </Link>
              ) : (
                <span className={s.postsLabel}>بدون مقاله</span>
              )}
              <span className={s.dateCell}>
                <CalendarDays size={11} strokeWidth={1.75} className={s.dateIcon} />
                <span>{relativeDate(tag.createdAt)}</span>
              </span>
            </div>

            <div className={s.cardActions}>
              <button
                type="button"
                className={s.iconBtn}
                onClick={() => onEdit(tag)}
                title="ویرایش"
                aria-label={`ویرایش ${tag.name}`}
              >
                <Pencil size={13} strokeWidth={1.75} />
              </button>
              <button
                type="button"
                className={`${s.iconBtn} ${s.iconDanger}`}
                onClick={() => onDelete(tag)}
                title="حذف"
                aria-label={`حذف ${tag.name}`}
              >
                <Trash2 size={12} strokeWidth={1.75} />
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default function TagsClient({ initial }: Props) {
  const { toast } = useToast();
  const [, startTransition] = useTransition();

  const [items, setItems] = useState<TagRow[]>(initial?.rows ?? []);
  const [total, setTotal] = useState(initial?.total ?? 0);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [sortMode, setSortMode] = useState<SortMode>('name');
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<TagRow | null>(null);
  const [bulkDeleteKeys, setBulkDeleteKeys] = useState<string[]>([]);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TagRow | null>(null);
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [page, setPage] = useState(1);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const formContainerRef = useRef<HTMLDivElement>(null);

  // Auto-slug when editing existing tag
  useEffect(() => {
    if (editTarget) {
      setFormSlug(editTarget.slug);
    } else {
      setFormSlug('');
    }
  }, [editTarget]);

  // Refresh from server
  const refresh = useCallback(async () => {
    const result = await getTags();
    if (result.success && result.data) {
      setItems(result.data.rows);
      setTotal(result.data.total);
    }
  }, []);

  /* ── Derived data ── */

  const filtered = useMemo(() => {
    let list = items;

    // Filter
    if (filterMode === 'used') {
      list = list.filter((t) => t.postCount > 0);
    } else if (filterMode === 'unused') {
      list = list.filter((t) => t.postCount === 0);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) => t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q),
      );
    }

    // Sort
    if (sortMode === 'popularity') {
      list = [...list].sort((a, b) => b.postCount - a.postCount || a.name.localeCompare(b.name));
    } else {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [items, search, filterMode, sortMode]);

  /* ── Pagination ── */

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)), [filtered]);

  // Clamp when deletions shrink the result set below the current page
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageRows = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  );

  /* ── Cross-page selection ── */

  const pageKeys = useMemo(() => pageRows.map((t) => t.id), [pageRows]);
  const pageSelectedKeys = useMemo(
    () => selectedKeys.filter((k) => pageKeys.includes(k)),
    [selectedKeys, pageKeys],
  );

  const handlePageSelection = useCallback(
    (keys: string[]) => {
      setSelectedKeys((prev) => [
        ...new Set([...prev.filter((k) => !pageKeys.includes(k)), ...keys]),
      ]);
    },
    [pageKeys],
  );

  // Search / filter / sort changes reset to the first page
  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleFilterMode = useCallback((mode: FilterMode) => {
    setFilterMode(mode);
    setPage(1);
  }, []);

  const handleSortToggle = useCallback(() => {
    setSortMode((m) => (m === 'name' ? 'popularity' : 'name'));
    setPage(1);
  }, []);

  const selectAllFiltered = useCallback(
    () => setSelectedKeys(filtered.map((t) => t.id)),
    [filtered],
  );
  const clearSelection = useCallback(() => setSelectedKeys([]), []);

  /* ── Merge pair (exactly 2 selected — first absorbs into second) ── */

  const mergePair = useMemo(() => {
    if (selectedKeys.length !== 2) return null;
    const [firstId, secondId] = selectedKeys;
    const first = items.find((t) => t.id === firstId);
    const second = items.find((t) => t.id === secondId);
    if (!first || !second) return null;
    return { source: first, target: second };
  }, [selectedKeys, items]);

  const totalPosts = useMemo(() => items.reduce((sum, t) => sum + t.postCount, 0), [items]);
  const usedTags = useMemo(() => items.filter((t) => t.postCount > 0).length, [items]);
  const unusedTags = useMemo(() => items.filter((t) => t.postCount === 0).length, [items]);
  const topTag = useMemo(
    () =>
      items.reduce(
        (best, t) => (t.postCount > best.postCount ? t : best),
        items[0] ?? ({ name: '—', postCount: 0 } as TagRow),
      ),
    [items],
  );

  /* ── Insights ── */

  const topTags = useMemo(() => {
    return [...items]
      .sort((a, b) => b.postCount - a.postCount)
      .slice(0, 5)
      .map((t) => ({
        label: t.name,
        value: t.postCount,
        color: getTone(t.name),
        hint: `/${t.slug}`,
      }));
  }, [items]);

  const donutData = useMemo<DonutSegment[]>(() => {
    return [
      { label: 'در استفاده', value: usedTags, color: 'emerald' },
      { label: 'بدون استفاده', value: unusedTags, color: 'slate' },
    ];
  }, [usedTags, unusedTags]);

  const usageSplit = useMemo<SplitBarSegment[]>(() => {
    return [
      { label: 'در استفاده', value: usedTags, color: 'emerald' },
      { label: 'بدون استفاده', value: unusedTags, color: 'slate' },
    ];
  }, [usedTags, unusedTags]);

  /* ── CRUD actions ── */

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
      const slug = formSlug.trim() || generateSlug(formName.trim());
      if (editTarget) {
        const result = await updateTag(editTarget.id, {
          name: formName.trim(),
          slug: slug || undefined,
        });
        if (result.success && result.data) {
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
          slug: slug || undefined,
        });
        if (result.success && result.data) {
          const created = result.data;
          setItems((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
          setTotal((t) => t + 1);
          toast({ title: 'برچسب ساخته شد' });
          setSheetOpen(false);
        } else {
          toast({ title: result.message ?? 'خطا در ساخت برچسب', variant: 'destructive' });
        }
      }
    });
  }, [editTarget, formName, formSlug, toast]);

  // Keyboard shortcut: Enter to save
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && formName.trim()) {
        e.preventDefault();
        save();
      }
    },
    [formName, save],
  );

  const handleDelete = useCallback(
    (tag: TagRow) => {
      startTransition(async () => {
        setItems((prev) => prev.filter((item) => item.id !== tag.id));
        setTotal((t) => t - 1);
        const result = await deleteTag(tag.id);
        if (!result.success) {
          toast({ title: result.message ?? 'خطا', variant: 'destructive' });
          await refresh();
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

  /* ── Merge ── */

  const confirmMerge = useCallback(() => {
    if (!mergePair) return;
    const { source, target } = mergePair;
    startTransition(async () => {
      const result = await mergeTags(source.id, target.id);
      if (result.success) {
        setItems((prev) =>
          prev
            .filter((t) => t.id !== source.id)
            .map((t) =>
              t.id === target.id ? { ...t, postCount: t.postCount + source.postCount } : t,
            ),
        );
        setTotal((t) => Math.max(0, t - 1));
        setSelectedKeys([]);
        setMergeOpen(false);
        toast({ title: result.message ?? 'ادغام انجام شد' });
      } else {
        toast({ title: result.message ?? 'خطا در ادغام برچسب‌ها', variant: 'destructive' });
        setMergeOpen(false);
        await refresh();
      }
    });
  }, [mergePair, toast, refresh]);

  /* ── Copy slug ── */

  const copySlug = useCallback(
    async (slug: string, name: string) => {
      try {
        await navigator.clipboard.writeText(slug);
        toast({ title: 'اسلاگ کپی شد', description: `/${slug}` });
      } catch {
        toast({ title: 'کپی نشد — دوباره تلاش کنید', variant: 'destructive', description: name });
      }
    },
    [toast],
  );

  /* ── Export ── */

  const exportData = useMemo(
    () =>
      items.map((t) => ({
        name: t.name,
        slug: t.slug,
        posts: t.postCount,
        created: relativeDate(t.createdAt),
      })),
    [items],
  );

  const exportColumns = [
    { key: 'name', header: 'نام' },
    { key: 'slug', header: 'اسلاگ' },
    { key: 'posts', header: 'تعداد مقاله' },
    { key: 'created', header: 'تاریخ' },
  ];

  /* ── Table columns ── */

  const columns: Column<TagRow>[] = useMemo(
    () => [
      {
        key: 'tag',
        header: 'برچسب',
        render: (t) => (
          <div className={s.tagCell}>
            <div className={`${s.tagMonogram} ${s[`tone_${getTone(t.name)}`]}`}>
              <Hash size={12} strokeWidth={2} />
            </div>
            <div className={s.tagInfo}>
              <span className={s.tagName} title={t.name}>
                {t.name}
              </span>
              <button
                type="button"
                className={s.slugCopy}
                onClick={() => copySlug(t.slug, t.name)}
                title="کپی اسلاگ"
                aria-label={`کپی اسلاگ ${t.name}`}
              >
                <span className={s.slugText}>/{t.slug}</span>
                <Copy size={10} strokeWidth={2} className={s.slugCopyIcon} aria-hidden />
              </button>
            </div>
          </div>
        ),
      },
      {
        key: 'posts',
        header: 'مقاله',
        width: 96,
        render: (t) =>
          t.postCount > 0 ? (
            <Link
              href={`/archive/tag/${t.slug}`}
              className={s.postsLink}
              title={`مشاهدهٔ ${fa.format(t.postCount)} مقاله با برچسب ${t.name}`}
            >
              <span className={s.postsCount}>{fa.format(t.postCount)}</span>
              <span className={s.postsLabel}>مقاله</span>
            </Link>
          ) : (
            <div className={s.postsCell}>
              <span className={s.postsCount}>۰</span>
            </div>
          ),
      },
      {
        key: 'date',
        header: 'تاریخ',
        width: 100,
        collapse: true,
        render: (t) => (
          <div className={s.dateCell}>
            <CalendarDays size={11} strokeWidth={1.75} className={s.dateIcon} />
            <span>{relativeDate(t.createdAt)}</span>
          </div>
        ),
      },
      {
        key: 'actions',
        header: '',
        width: 76,
        render: (t) => (
          <div className={s.rowActions}>
            <button
              type="button"
              className={s.iconBtn}
              onClick={() => openEdit(t)}
              title="ویرایش"
              aria-label={`ویرایش ${t.name}`}
            >
              <Pencil size={13} strokeWidth={1.75} />
            </button>
            <button
              type="button"
              className={`${s.iconBtn} ${s.iconDanger}`}
              onClick={() => setDeleteTarget(t)}
              title="حذف"
              aria-label={`حذف ${t.name}`}
            >
              <Trash2 size={12} strokeWidth={1.75} />
            </button>
          </div>
        ),
      },
    ],
    [openEdit, copySlug],
  );

  /* ── Filter chip labels ── */

  const filterChips = [
    { key: 'all' as FilterMode, label: 'همه', count: total },
    { key: 'used' as FilterMode, label: 'در استفاده', count: usedTags },
    { key: 'unused' as FilterMode, label: 'خالی', count: unusedTags },
  ];

  /* ── Footer range text ── */

  const rangeText =
    filtered.length === 0
      ? 'موردی یافت نشد'
      : totalPages <= 1
        ? `${fa.format(filtered.length)} برچسب`
        : `${fa.format((page - 1) * PAGE_SIZE + 1)}–${fa.format(
            Math.min(page * PAGE_SIZE, filtered.length),
          )} از ${fa.format(filtered.length)}`;

  return (
    <div className={s.root}>
      {/* ── Hero ── */}
      <PageHero
        breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: 'برچسب‌ها' }]}
        eyebrow="محتوا"
        title="مدیریت برچسب‌ها"
        description="ساخت، ویرایش، ادغام و حذف برچسب‌های مقالات — دسته‌بندی هوشمند محتوا"
        icon={Tag}
        actions={
          <Button size="sm" onClick={openCreate} className={s.createBtn}>
            <Plus size={14} strokeWidth={2} />
            <span className={s.btnLabel}>برچسب جدید</span>
          </Button>
        }
      />

      {/* ── KPI strip ── */}
      <StatGrid>
        <KpiCard
          label="کل برچسب‌ها"
          value={total}
          icon={Tag}
          trend={total > 0 ? 'neutral' : undefined}
        />
        <KpiCard
          label="در استفاده"
          value={usedTags}
          icon={Sparkles}
          trend={usedTags > 0 ? 'up' : undefined}
        />
        <KpiCard label="مقاله‌های برچسب‌دار" value={totalPosts} icon={Layers} />
        <KpiCard
          label="پرکاربردترین"
          value={topTag && topTag.name !== '—' ? topTag.postCount : 0}
          icon={TrendingUp}
          format="latin"
          info={
            topTag && topTag.name !== '—'
              ? `${topTag.name} — ${fa.format(topTag.postCount)} مقاله`
              : undefined
          }
        />
      </StatGrid>

      {/* ── Bulk bar ── */}
      {selectedKeys.length > 0 && (
        <div className={s.bulkBar}>
          <div className={s.bulkMain}>
            <span className={s.bulkCount}>{fa.format(selectedKeys.length)} مورد انتخاب شده</span>
            <div className={s.bulkActions}>
              {mergePair && (
                <Button size="sm" variant="outline" onClick={() => setMergeOpen(true)}>
                  <GitMerge size={14} strokeWidth={2} />
                  <span className={s.btnLabel}>ادغام</span>
                </Button>
              )}
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setBulkDeleteKeys(selectedKeys)}
              >
                <Trash2 size={14} />
                <span className={s.btnLabel}>حذف</span>
              </Button>
              <Button size="sm" variant="ghost" onClick={clearSelection}>
                <X size={14} />
                <span className={s.btnLabel}>پاک کردن انتخاب</span>
              </Button>
            </div>
          </div>
          {selectedKeys.length < filtered.length && (
            <button type="button" className={s.selectAllBtn} onClick={selectAllFiltered}>
              <CheckSquare size={13} strokeWidth={2} aria-hidden />
              انتخاب همهٔ {fa.format(filtered.length)} نتیجه
            </button>
          )}
        </div>
      )}

      {/* ── Filter chips ── */}
      <div className={s.filterChips}>
        <Filter size={13} strokeWidth={1.75} className={s.filterIcon} />
        {filterChips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            className={`${s.chip} ${filterMode === chip.key ? s.chipActive : ''}`}
            onClick={() => handleFilterMode(chip.key)}
            aria-pressed={filterMode === chip.key}
          >
            {chip.label}
            <span className={s.chipCount}>{fa.format(chip.count)}</span>
          </button>
        ))}
        {/* Sort toggle */}
        <button
          type="button"
          className={`${s.chip} ${s.chipSort}`}
          onClick={handleSortToggle}
          title={sortMode === 'name' ? 'مرتب‌سازی بر اساس محبوبیت' : 'مرتب‌سازی بر اساس نام'}
        >
          {sortMode === 'popularity' ? (
            <>
              <TrendingUp size={12} />
              محبوبیت
              <ChevronDown size={11} />
            </>
          ) : (
            <>
              <span className={s.sortAlpha}>A→Z</span>
              نام
              <ChevronUp size={11} />
            </>
          )}
        </button>
      </div>

      {/* ── Main layout ── */}
      <InsightLayout
        main={
          <DataPanel
            title="برچسب‌ها"
            icon={<Hash size={14} strokeWidth={1.75} />}
            count={fa.format(filtered.length)}
            footer={
              <div className={s.foot}>
                <span className={s.footCount}>{rangeText}</span>
                {filtered.length > 0 && totalPages > 1 && (
                  <nav className={s.pager} aria-label="صفحه‌بندی برچسب‌ها">
                    <button
                      type="button"
                      className={s.pagerBtn}
                      disabled={page === 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      aria-label="صفحهٔ قبل"
                    >
                      <ChevronRight size={14} strokeWidth={2} />
                    </button>
                    <span className={s.pagerInfo}>
                      {fa.format(page)} / {fa.format(totalPages)}
                    </span>
                    <button
                      type="button"
                      className={s.pagerBtn}
                      disabled={page === totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      aria-label="صفحهٔ بعد"
                    >
                      <ChevronLeft size={14} strokeWidth={2} />
                    </button>
                  </nav>
                )}
              </div>
            }
          >
            <TableToolbar
              search={
                <SearchInput
                  value={search}
                  onChange={handleSearch}
                  placeholder="جستجو در نام و اسلاگ..."
                  ariaLabel="جستجو در برچسب‌ها"
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
              content={
                <TagListView
                  columns={columns}
                  rows={pageRows}
                  rowKey={(row) => row.id}
                  selectedKeys={pageSelectedKeys}
                  onSelectionChange={handlePageSelection}
                  onCopySlug={copySlug}
                  onEdit={openEdit}
                  onDelete={setDeleteTarget}
                  empty={
                    <MillionDollarEmpty
                      variant={search ? 'search' : 'sparkles'}
                      eyebrow="مدیریت برچسب‌ها"
                      title={search ? 'برچسبی یافت نشد' : 'هنوز برچسبی نیست'}
                      description={
                        search
                          ? 'جستجوی خود را تغییر دهید یا فیلتر را بردارید'
                          : 'اولین برچسب را بسازید تا مقالات را دسته‌بندی کنید'
                      }
                      tone="amber"
                      primaryAction={
                        !search && (
                          <Button size="sm" onClick={openCreate}>
                            <Plus size={14} />
                            <span>برچسب جدید</span>
                          </Button>
                        )
                      }
                    />
                  }
                />
              }
            />
          </DataPanel>
        }
        aside={
          <InsightPanel>
            {/* Donut distribution */}
            <InsightCard title="توزیع برچسب‌ها" icon={Tag}>
              {total > 0 ? (
                <Donut
                  data={donutData}
                  size={112}
                  thickness={11}
                  centerLabel="مجموع"
                  centerValue={fa.format(total)}
                />
              ) : (
                <p className={s.insightEmpty}>هنوز برچسبی ساخته نشده</p>
              )}
            </InsightCard>

            {/* Top tags */}
            <InsightCard title="پرکاربردترین‌ها" icon={TrendingUp}>
              {topTags.length > 0 ? (
                <BarList data={topTags} showShare />
              ) : (
                <p className={s.insightEmpty}>هنوز برچسبی ساخته نشده</p>
              )}
            </InsightCard>

            {/* Usage split */}
            <InsightCard title="سهم استفاده" icon={Filter}>
              {total > 0 ? (
                <SplitBar data={usageSplit} format={(v) => fa.format(v)} />
              ) : (
                <p className={s.insightEmpty}>هنوز برچسبی ساخته نشده</p>
              )}
            </InsightCard>

            {/* Quick links */}
            <InsightCard title="دسترسی سریع" icon={FileText}>
              <div className={s.quickLinks}>
                <Link href="/dashboard/posts" className={s.quickLink}>
                  <FileText size={13} strokeWidth={1.75} />
                  مقالات
                </Link>
                <Link href="/dashboard/categories" className={s.quickLink}>
                  <Archive size={13} strokeWidth={1.75} />
                  دسته‌بندی‌ها
                </Link>
                <Link href="/dashboard/settings" className={s.quickLink}>
                  <Settings size={13} strokeWidth={1.75} />
                  تنظیمات
                </Link>
              </div>
            </InsightCard>
          </InsightPanel>
        }
      />

      {/* ── Create/Edit Dialog (مرکزی، premium) ── */}
      <DialogPrimitive.Root open={sheetOpen} onOpenChange={setSheetOpen}>
        <DialogPrimitive.Portal>
          <div className={s.dialogOverlay} aria-hidden />
          <DialogPrimitive.Content className={s.dialogRoot} dir="rtl">
            <div className={s.dialogCard} ref={formContainerRef} onKeyDown={handleKeyDown}>
              {/* Close */}
              <DialogPrimitive.Close asChild>
                <button type="button" className={s.dialogClose} aria-label="بستن">
                  <X size={16} strokeWidth={2} />
                </button>
              </DialogPrimitive.Close>

              {/* Header */}
              <div className={s.dialogHeader}>
                <div className={s.dialogIconWrap}>
                  <Hash size={22} strokeWidth={2} />
                </div>
                <div className={s.dialogHeaderText}>
                  <DialogPrimitive.Title asChild>
                    <h2 className={s.dialogTitle}>{editTarget ? 'ویرایش برچسب' : 'برچسب جدید'}</h2>
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description asChild>
                    <p className={s.dialogSub}>
                      {editTarget
                        ? 'نام و اسلاگ برچسب را ویرایش کنید'
                        : 'نام برچسب جدید را وارد کنید — اسلاگ خودکار تولید می‌شود'}
                    </p>
                  </DialogPrimitive.Description>
                </div>
              </div>

              {/* Form */}
              <div className={s.dialogForm}>
                <div className={s.fieldGroup}>
                  <label className={s.fieldLabelText} htmlFor="tag-name">
                    نام برچسب <span className={s.req}>*</span>
                  </label>
                  <Input
                    id="tag-name"
                    ref={nameInputRef}
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="مثال: تکنولوژی"
                    autoFocus
                    maxLength={60}
                  />
                  <div className={s.fieldMeta}>
                    {formName.length > 0 && (
                      <span className={s.charCount}>{fa.format(formName.length)} / ۶۰</span>
                    )}
                  </div>
                </div>

                <div className={s.fieldGroup}>
                  <label className={s.fieldLabelText} htmlFor="tag-slug">
                    اسلاگ (اختیاری)
                  </label>
                  <div className={s.slugPreview}>
                    {formSlug
                      ? `/${formSlug}`
                      : formName.trim()
                        ? `/${generateSlug(formName.trim())}`
                        : '(خودکار)'}
                  </div>
                  <Input
                    id="tag-slug"
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                    placeholder="مثال: technology"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className={s.dialogFooter}>
                <Button size="sm" variant="outline" onClick={() => setSheetOpen(false)}>
                  انصراف
                </Button>
                <Button size="sm" onClick={save} disabled={!formName.trim()}>
                  <Hash size={14} strokeWidth={2} />
                  {editTarget ? 'ذخیره تغییرات' : 'ساخت برچسب'}
                </Button>
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {/* ── Delete confirm ── */}
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
        warning={
          deleteTarget && deleteTarget.postCount > 0 ? 'این برچسب به مقالات متصل است' : undefined
        }
      />

      {/* ── Bulk delete confirm ── */}
      <ConfirmDialog
        open={bulkDeleteKeys.length > 0}
        onOpenChange={(open) => !open && setBulkDeleteKeys([])}
        title="حذف گروهی برچسب‌ها"
        description={`${fa.format(bulkDeleteKeys.length)} برچسب حذف می‌شود. ارتباط با مقالات قطع می‌شود و این عمل قابل بازگشت نیست.`}
        confirmLabel="حذف شود"
        onConfirm={confirmBulkDelete}
        variant="danger"
      />

      {/* ── Merge confirm ── */}
      <ConfirmDialog
        open={mergeOpen}
        onOpenChange={setMergeOpen}
        title="ادغام برچسب‌ها"
        description={
          mergePair
            ? `"${mergePair.source.name}" (${fa.format(
                mergePair.source.postCount,
              )} مقاله) در "${mergePair.target.name}" ادغام می‌شود — همهٔ مقاله‌هایش منتقل شده و "${mergePair.source.name}" حذف می‌شود.`
            : ''
        }
        confirmLabel="ادغام شود"
        onConfirm={confirmMerge}
        variant="default"
        icon={GitMerge}
        warning="مقاله‌های مشترک دو برچسب تکراری نمی‌شوند"
      />
    </div>
  );
}
