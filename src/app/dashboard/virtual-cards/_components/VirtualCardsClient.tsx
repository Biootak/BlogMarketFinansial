'use client';

/**
 * VirtualCardsClient — 2026 Virtual Card Manager
 *
 * ویژگی‌ها:
 * - نمایش کارت‌ها با طراحی کارت فیزیکی
 * - صدور کارت جدید (حداکثر ۳)
 * - فریز/آنفریز و لغو
 * - همه ۵ state: loading/empty/error/success/disabled
 */

import {
  type VirtualCardRow,
  cancelVirtualCard,
  issueVirtualCard,
  toggleFreezeCard,
} from '@/actions/virtual-card';
import { MillionDollarEmpty } from '@/components/Dashboard/primitives/MillionDollarEmpty';
import { PageHeader } from '@/components/Dashboard/primitives/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { AlertCircle, Flame, Lock, Plus, Trash2, Unlock, Wifi } from 'lucide-react';
import { useCallback, useState, useTransition } from 'react';
import s from './VirtualCardsClient.module.css';

const _faNum = new Intl.NumberFormat('fa-IR');

type Props = { initialCards: VirtualCardRow[] };

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'فعال',
  FROZEN: 'فریز شده',
  BLOCKED: 'مسدود',
  EXPIRED: 'منقضی',
};

function formatExpiry(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}`;
}

// ── Card Visual Component ─────────────────────────────────────────────────
function CardVisual({ card }: { card: VirtualCardRow }) {
  return (
    <article
      className={`${s.cardVisual} ${card.status === 'FROZEN' ? s.cardFrozen : ''}`}
      aria-label={`کارت ${card.last4}`}
    >
      {/* Ambient glow */}
      <div className={s.cardAmbient} aria-hidden />

      {/* Top row */}
      <div className={s.cardTop}>
        <div className={s.cardLabel}>{card.label || 'کارت مجازی'}</div>
        <div className={s.cardNetwork}>
          <Wifi size={16} aria-hidden />
        </div>
      </div>

      {/* Card number */}
      <div className={s.cardNumber} dir="ltr" aria-label={`شماره کارت ختم به ${card.last4}`}>
        <span>••••</span>
        <span>••••</span>
        <span>••••</span>
        <span>{card.last4}</span>
      </div>

      {/* Bottom row */}
      <div className={s.cardBottom}>
        <div className={s.cardExpiry}>
          <span className={s.cardExpiryLabel}>انقضا</span>
          <span className={s.cardExpiryVal} dir="ltr">
            {formatExpiry(card.expiresAt)}
          </span>
        </div>
        <div className={s.cardBrand}>{card.brand}</div>
      </div>

      {/* Frozen overlay */}
      {card.status === 'FROZEN' && (
        <div className={s.frozenOverlay} aria-label="کارت فریز شده">
          <Lock size={28} aria-hidden />
          <span>فریز شده</span>
        </div>
      )}

      {/* Status badge */}
      <div className={`${s.cardStatus} ${s[`cardStatus_${card.status.toLowerCase()}`]}`}>
        {STATUS_LABELS[card.status] ?? card.status}
      </div>
    </article>
  );
}

// ── Main Component ────────────────────────────────────────────────────────
export default function VirtualCardsClient({ initialCards }: Props) {
  const [cards, setCards] = useState<VirtualCardRow[]>(initialCards);
  const [showIssueDialog, setShowIssueDialog] = useState(false);
  const [issueLabel, setIssueLabel] = useState('');
  const [issueCurrency, setIssueCurrency] = useState<'USD' | 'EUR' | 'AFN'>('USD');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleIssue = useCallback(() => {
    setError(null);
    startTransition(async () => {
      const res = await issueVirtualCard({
        label: issueLabel || undefined,
        currency: issueCurrency,
      });
      if (!res.success) {
        setError(res.error.message);
        return;
      }
      setCards((prev) => [res.data, ...prev]);
      setShowIssueDialog(false);
      setIssueLabel('');
    });
  }, [issueLabel, issueCurrency]);

  const handleFreeze = useCallback((cardId: string, freeze: boolean) => {
    startTransition(async () => {
      const res = await toggleFreezeCard(cardId, freeze);
      if (!res.success) return;
      setCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, status: freeze ? 'FROZEN' : 'ACTIVE' } : c)),
      );
    });
  }, []);

  const handleCancel = useCallback((cardId: string) => {
    if (!confirm('آیا از مسدود کردن دائمی این کارت اطمینان دارید؟')) return;
    startTransition(async () => {
      const res = await cancelVirtualCard(cardId);
      if (!res.success) return;
      setCards((prev) => prev.filter((c) => c.id !== cardId));
    });
  }, []);

  const activeCount = cards.filter((c) => c.status === 'ACTIVE').length;
  const canIssue = activeCount < 3;

  return (
    <div className={s.page}>
      <PageHeader
        variant="compact"
        breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: 'کارت‌های مجازی' }]}
        eyebrow="پرداخت"
        title="کارت‌های مجازی"
        description="کارت‌های پیش‌پرداخت مجازی برای خریدهای آنلاین"
        actions={
          <Button
            size="sm"
            onClick={() => setShowIssueDialog(true)}
            disabled={!canIssue || isPending}
          >
            <Plus size={15} aria-hidden />
            صدور کارت جدید
          </Button>
        }
      />

      {cards.length === 0 ? (
        <MillionDollarEmpty
          variant="card"
          tone="primary"
          eyebrow="کیف پول"
          title="هنوز کارت مجازی ندارید"
          description="با صدور کارت مجازی، می‌توانید خریدهای آنلاین امن‌تری داشته باشید. سقف هزینه قابل تنظیم، فریز فوری و یکپارچه با کیف پول شما."
          primaryAction={
            <Button onClick={() => setShowIssueDialog(true)} disabled={isPending}>
              <Plus size={15} aria-hidden />
              صدور اولین کارت
            </Button>
          }
        />
      ) : (
        <>
          <div className={s.stats}>
            <div className={s.stat}>
              <span className={s.statValue}>{_faNum.format(cards.length)}</span>
              <span className={s.statLabel}>کل کارت‌ها</span>
            </div>
            <div className={s.stat}>
              <span className={s.statValue}>{_faNum.format(activeCount)}</span>
              <span className={s.statLabel}>فعال</span>
            </div>
            <div className={s.stat}>
              <span className={s.statValue}>{_faNum.format(3 - activeCount)}</span>
              <span className={s.statLabel}>ظرفیت باقی‌مانده</span>
            </div>
          </div>

          <div className={s.grid}>
            {cards.map((card) => (
              <div key={card.id} className={s.cardWrapper}>
                <CardVisual card={card} />

                <div className={s.cardActions}>
                  {card.status === 'ACTIVE' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFreeze(card.id, true)}
                      disabled={isPending}
                    >
                      <Flame size={14} aria-hidden />
                      فریز
                    </Button>
                  )}
                  {card.status === 'FROZEN' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFreeze(card.id, false)}
                      disabled={isPending}
                    >
                      <Unlock size={14} aria-hidden />
                      آنفریز
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCancel(card.id)}
                    disabled={isPending}
                    className={s.cancelBtn}
                  >
                    <Trash2 size={14} aria-hidden />
                    لغو
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Issue Card Dialog ── */}
      <Dialog open={showIssueDialog} onOpenChange={setShowIssueDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>صدور کارت مجازی جدید</DialogTitle>
            <DialogDescription>
              کارت جدیدی با ارز دلخواه صادر کنید. حداکثر ۳ کارت فعال مجاز است.
            </DialogDescription>
          </DialogHeader>

          <div className={s.issueForm}>
            {error && (
              <div className={s.issueError} role="alert">
                <AlertCircle size={14} aria-hidden />
                <span>{error}</span>
              </div>
            )}

            <div className={s.issueField}>
              <label className={s.issueLabel} htmlFor="issue-label-input">
                نام کارت (اختیاری)
              </label>
              <Input
                id="issue-label-input"
                value={issueLabel}
                onChange={(e) => setIssueLabel(e.target.value)}
                placeholder="مثال: خرید اشتراک"
                maxLength={50}
              />
            </div>

            <div className={s.issueField}>
              <p className={s.issueLabel}>ارز</p>
              <div className={s.currencyBtns}>
                {(['USD', 'EUR', 'AFN'] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`${s.currencyBtn} ${issueCurrency === c ? s.currencyBtnActive : ''}`}
                    onClick={() => setIssueCurrency(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className={s.issueActions}>
              <Button variant="outline" onClick={() => setShowIssueDialog(false)}>
                انصراف
              </Button>
              <Button onClick={handleIssue} disabled={isPending}>
                {isPending ? 'در حال صدور...' : 'صدور کارت'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
