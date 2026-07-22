'use client';

/**
 * ExchangeDetailClient — 2026 Million-Dollar Exchange Detail
 *
 * Tabbed interface:
 *   ۱. اطلاعات — وضعیت + اطلاعات پایه + آخرین تراکنش‌ها
 *   ۲. کارمندان — لیست + invite + revoke + role badge
 *   ۳. مشتریان — نگاه سریع (لینک به /dashboard/customers)
 */

import type { CustomerRow } from '@/actions/exchange-customers';
import type { TransactionRow } from '@/actions/exchange-transactions';
import {
  type ExchangeRow,
  type ExchangeStaffRow,
  addExchangeStaff,
  revokeExchangeStaff,
  setExchangeStatus,
} from '@/actions/exchanges';
import { ConfirmDialog } from '@/components/Dashboard/primitives';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import {
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Mail,
  MapPin,
  PauseCircle,
  Phone,
  Plus,
  ShieldCheck,
  Users,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';
import s from './ExchangeDetailClient.module.css';

// ─── Label maps ────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'فعال',
  PENDING: 'در انتظار تأیید',
  SUSPENDED: 'معلق',
  CLOSED: 'بسته',
};

const ROLE_FA: Record<string, string> = {
  OWNER: 'مالک',
  MANAGER: 'مدیر',
  STAFF: 'کارمند',
  VIEWER: 'مشاهده‌گر',
};

const KIND_FA: Record<string, string> = {
  DEPOSIT: 'واریز',
  WITHDRAWAL: 'برداشت',
  EXCHANGE: 'صرافی',
  TRANSFER: 'انتقال',
  FEE: 'کارمزد',
};

const STATUS_TX_FA: Record<string, string> = {
  COMPLETED: 'تکمیل',
  PENDING: 'در انتظار',
  FAILED: 'ناموفق',
  CANCELLED: 'لغو',
};

const ROLE_COLOR: Record<string, string> = {
  OWNER: 'var(--ds-brand-500)',
  MANAGER: 'var(--nova-amber,oklch(60% 0.16 70))',
  STAFF: 'var(--nova-emerald,oklch(50% 0.14 145))',
  VIEWER: 'var(--ds-text-muted)',
};

// ─── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  exchange: ExchangeRow;
  staff: ExchangeStaffRow[];
  recentTransactions: TransactionRow[];
  recentCustomers?: CustomerRow[];
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ExchangeDetailClient({
  exchange,
  staff: initialStaff,
  recentTransactions,
  recentCustomers,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();

  // ── Status ────────────────────────────────────────────────────────────────
  const [status, setStatus] = useState(exchange.status);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);

  const handleStatusChange = useCallback(
    async (newStatus: 'ACTIVE' | 'SUSPENDED' | 'CLOSED' | 'PENDING') => {
      setSavingStatus(true);
      const res = await setExchangeStatus(exchange.id, newStatus);
      setSavingStatus(false);
      if (res.success) {
        setStatus(newStatus);
        router.refresh();
        toast({ title: 'وضعیت به‌روز شد' });
      } else {
        toast({ title: 'خطا', description: res.error.message, variant: 'destructive' });
      }
      setPendingStatus(null);
    },
    [exchange.id, router, toast],
  );

  // ── Staff ─────────────────────────────────────────────────────────────────
  const [staffList, setStaffList] = useState<ExchangeStaffRow[]>(initialStaff);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'OWNER' | 'MANAGER' | 'STAFF' | 'VIEWER'>('STAFF');
  const [invitePending, startInviteTransition] = useTransition();
  const [revokeTarget, setRevokeTarget] = useState<ExchangeStaffRow | null>(null);
  const [revokePending, startRevokeTransition] = useTransition();

  const handleInvite = useCallback(() => {
    startInviteTransition(async () => {
      const res = await addExchangeStaff(exchange.id, inviteEmail.trim(), inviteRole);
      if (res.success && res.data) {
        setStaffList((prev) => [...prev, ...(res.data ? [res.data] : [])]);
        setInviteEmail('');
        setInviteRole('STAFF');
        setShowInvite(false);
        toast({ title: 'کارمند دعوت شد', description: inviteEmail.trim() });
        router.refresh();
      } else if (!res.success) {
        toast({ title: 'خطا', description: res.error.message, variant: 'destructive' });
      }
    });
  }, [exchange.id, inviteEmail, inviteRole, toast, router]);

  const handleRevoke = useCallback(() => {
    if (!revokeTarget) return;
    startRevokeTransition(async () => {
      const res = await revokeExchangeStaff(revokeTarget.id, exchange.id);
      if (res.success) {
        setStaffList((prev) => prev.filter((s) => s.id !== revokeTarget.id));
        toast({ title: 'دسترسی لغو شد' });
        router.refresh();
      } else {
        toast({ title: 'خطا', description: res.error.message, variant: 'destructive' });
      }
      setRevokeTarget(null);
    });
  }, [revokeTarget, exchange.id, toast, router]);

  return (
    <div className={s.root} dir="rtl">
      {/* ── KPI Strip ─────────────────────────────────────────────── */}
      <div className={s.kpiStrip} aria-label="آمار صرافی">
        {[
          { label: 'کارمندان', value: staffList.length },
          { label: 'تراکنش‌های اخیر', value: recentTransactions.length },
          { label: 'کارمزد پلتفرم', value: `${exchange.platformFee}٪` },
          {
            label: 'سقف روزانه (افغانی)',
            value:
              exchange.dailyLimitAf > 0
                ? new Intl.NumberFormat('fa-IR', { notation: 'compact' }).format(
                    exchange.dailyLimitAf,
                  )
                : '∞',
          },
        ].map(({ label, value }, i) => (
          <div key={label} className={s.kpiItem}>
            <span className={s.kpiVal}>
              {typeof value === 'number' ? new Intl.NumberFormat('fa-IR').format(value) : value}
            </span>
            <span className={s.kpiLabel}>{label}</span>
            {i < 3 && <div className={s.kpiDivider} aria-hidden />}
          </div>
        ))}
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────── */}
      <Tabs defaultValue="info" className={s.tabs}>
        <TabsList className={s.tabsList}>
          <TabsTrigger value="info" className={s.tabsTrigger}>
            <Building2 size={14} aria-hidden /> اطلاعات
          </TabsTrigger>
          <TabsTrigger value="staff" className={s.tabsTrigger}>
            <Users size={14} aria-hidden /> کارمندان
            <span className={s.tabCount}>{staffList.length}</span>
          </TabsTrigger>
          <TabsTrigger value="customers" className={s.tabsTrigger}>
            <ShieldCheck size={14} aria-hidden /> مشتریان
            <span className={s.tabCount}>{recentCustomers?.length ?? 0}</span>
          </TabsTrigger>
          <TabsTrigger value="transactions" className={s.tabsTrigger}>
            <CircleDollarSign size={14} aria-hidden /> تراکنش‌ها
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: اطلاعات ──────────────────────────────────────── */}
        <TabsContent value="info" className={s.tabContent}>
          <div className={s.topRow}>
            {/* اطلاعات پایه */}
            <div className={s.card}>
              <div className={s.cardHeader}>
                <span className={s.cardHeaderIcon} aria-hidden>
                  <Building2 size={15} />
                </span>
                <span>اطلاعات پایه</span>
              </div>
              <dl className={s.infoGrid}>
                {exchange.licenseNo && (
                  <>
                    <dt>شماره مجوز</dt>
                    <dd dir="ltr">{exchange.licenseNo}</dd>
                  </>
                )}
                {exchange.city && (
                  <>
                    <dt>
                      <MapPin size={12} aria-hidden /> شهر
                    </dt>
                    <dd>{exchange.city}</dd>
                  </>
                )}
                {exchange.address && (
                  <>
                    <dt>آدرس</dt>
                    <dd>{exchange.address}</dd>
                  </>
                )}
                {exchange.phone && (
                  <>
                    <dt>
                      <Phone size={12} aria-hidden /> تلفن
                    </dt>
                    <dd dir="ltr">{exchange.phone}</dd>
                  </>
                )}
                {exchange.email && (
                  <>
                    <dt>
                      <Mail size={12} aria-hidden /> ایمیل
                    </dt>
                    <dd dir="ltr">{exchange.email}</dd>
                  </>
                )}
                <dt>
                  <ShieldCheck size={12} aria-hidden /> KYC
                </dt>
                <dd>{exchange.requireKyc ? 'اجباری' : 'اختیاری'}</dd>
                <dt>تاریخ ثبت</dt>
                <dd>
                  {new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(
                    new Date(exchange.createdAt),
                  )}
                </dd>
              </dl>
            </div>

            {/* مدیریت وضعیت */}
            <div className={s.card}>
              <div className={s.cardHeader}>
                <span className={s.cardHeaderIcon} aria-hidden>
                  <CircleDollarSign size={15} />
                </span>
                <span>وضعیت و مدیریت</span>
              </div>
              <div className={s.statusSection}>
                <div className={s.statusBadgeLg} data-status={status}>
                  <span className={s.statusDot} aria-hidden />
                  {STATUS_LABEL[status] ?? status}
                </div>
                <p className={s.statusHint}>وضعیت فعلی صرافی. تغییر وضعیت بلافاصله اعمال می‌شود.</p>
              </div>
              <div className={s.statusActions}>
                {status !== 'ACTIVE' && (
                  <button
                    type="button"
                    className={`${s.statusBtn} ${s.statusBtnActive}`}
                    onClick={() => setPendingStatus('ACTIVE')}
                    disabled={savingStatus}
                  >
                    <CheckCircle2 size={16} aria-hidden /> تأیید و فعال‌سازی
                  </button>
                )}
                {status === 'ACTIVE' && (
                  <button
                    type="button"
                    className={`${s.statusBtn} ${s.statusBtnSuspend}`}
                    onClick={() => setPendingStatus('SUSPENDED')}
                    disabled={savingStatus}
                  >
                    <PauseCircle size={16} aria-hidden /> تعلیق موقت
                  </button>
                )}
                {status !== 'CLOSED' && (
                  <button
                    type="button"
                    className={`${s.statusBtn} ${s.statusBtnClose}`}
                    onClick={() => setPendingStatus('CLOSED')}
                    disabled={savingStatus}
                  >
                    <XCircle size={16} aria-hidden /> بستن صرافی
                  </button>
                )}
                <Link href="/dashboard/exchanges" className={s.statusBtn}>
                  بازگشت به لیست
                </Link>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── Tab: کارمندان ─────────────────────────────────────── */}
        <TabsContent value="staff" className={s.tabContent}>
          <div className={s.card}>
            <div className={s.cardHeader}>
              <span className={s.cardHeaderIcon} aria-hidden>
                <Users size={15} />
              </span>
              <span>کارمندان ({new Intl.NumberFormat('fa-IR').format(staffList.length)})</span>
              <div className={s.cardHeaderActions}>
                <Button
                  size="sm"
                  variant="outline"
                  className={s.inviteBtn}
                  onClick={() => setShowInvite(true)}
                >
                  <Plus size={13} aria-hidden /> دعوت کارمند
                </Button>
              </div>
            </div>

            {staffList.length === 0 ? (
              <div className={s.empty}>
                <Users size={32} className={s.emptyIcon} aria-hidden />
                <p>هنوز کارمندی اضافه نشده.</p>
                <Button size="sm" onClick={() => setShowInvite(true)}>
                  <Plus size={13} aria-hidden /> اولین کارمند را دعوت کنید
                </Button>
              </div>
            ) : (
              <div className={s.staffList}>
                {staffList.map((member, i) => (
                  <div
                    key={member.id}
                    className={s.staffRow}
                    style={{ '--row-i': i } as React.CSSProperties}
                  >
                    {/* آواتار */}
                    <div className={s.staffAvatar}>
                      {member.user.image ? (
                        <img
                          src={member.user.image}
                          alt={member.user.name ?? ''}
                          className={s.staffAvatarImg}
                        />
                      ) : (
                        <span className={s.staffAvatarFallback}>
                          {(member.user.name ?? member.user.email).slice(0, 1).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* اطلاعات */}
                    <div className={s.staffInfo}>
                      <span className={s.staffName}>{member.user.name ?? member.user.email}</span>
                      <span className={s.staffEmail}>{member.user.email}</span>
                    </div>

                    {/* نقش */}
                    <span
                      className={s.roleBadge}
                      style={
                        {
                          '--role-c': ROLE_COLOR[member.role] ?? 'var(--ds-text-muted)',
                        } as React.CSSProperties
                      }
                    >
                      {ROLE_FA[member.role] ?? member.role}
                    </span>

                    {/* تاریخ پیوستن */}
                    <span className={s.joinedDate}>
                      {new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short' }).format(
                        new Date(member.joinedAt),
                      )}
                    </span>

                    {/* لغو دسترسی */}
                    {member.role !== 'OWNER' && (
                      <button
                        type="button"
                        className={s.revokeBtn}
                        onClick={() => setRevokeTarget(member)}
                        title="لغو دسترسی"
                        aria-label={`لغو دسترسی ${member.user.name ?? member.user.email}`}
                      >
                        <XCircle size={14} aria-hidden />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Tab: مشتریان ──────────────────────────────────────── */}
        <TabsContent value="customers" className={s.tabContent}>
          <div className={s.card}>
            <div className={s.cardHeader}>
              <span className={s.cardHeaderIcon} aria-hidden>
                <ShieldCheck size={15} />
              </span>
              <span>آخرین مشتریان</span>
              <div className={s.cardHeaderActions}>
                <Link href="/dashboard/customers" className={s.viewAllLink}>
                  مشاهده همه
                </Link>
              </div>
            </div>
            {!recentCustomers || recentCustomers.length === 0 ? (
              <div className={s.empty}>
                <ShieldCheck size={32} className={s.emptyIcon} aria-hidden />
                <p>مشتری‌ای ثبت نشده.</p>
              </div>
            ) : (
              <div className={s.txList}>
                {recentCustomers.map((c, i) => (
                  <div
                    key={c.id}
                    className={s.txRow}
                    style={{ '--row-i': i } as React.CSSProperties}
                  >
                    <div className={s.txCustomer}>
                      <span className={s.txName}>{c.fullName}</span>
                      <span className={s.txPhone}>{c.phone}</span>
                    </div>
                    <span className={s.txKind}>{c.kycLevel}</span>
                    <span className={c.status === 'ACTIVE' ? s.txStatusCompleted : s.txStatusOther}>
                      {c.status === 'ACTIVE' ? 'فعال' : c.status}
                    </span>
                    <span className={s.txDate}>
                      {new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short' }).format(
                        new Date(c.createdAt),
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Tab: تراکنش‌ها ────────────────────────────────────── */}
        <TabsContent value="transactions" className={s.tabContent}>
          <div className={s.card}>
            <div className={s.cardHeader}>
              <span className={s.cardHeaderIcon} aria-hidden>
                <CircleDollarSign size={15} />
              </span>
              <span>آخرین تراکنش‌ها</span>
            </div>
            {recentTransactions.length === 0 ? (
              <div className={s.empty}>
                <CircleDollarSign size={32} className={s.emptyIcon} aria-hidden />
                <p>هنوز تراکنشی ثبت نشده.</p>
              </div>
            ) : (
              <div className={s.txList}>
                {recentTransactions.map((tx, i) => (
                  <div
                    key={tx.id}
                    className={s.txRow}
                    style={{ '--row-i': i } as React.CSSProperties}
                  >
                    <div className={s.txCustomer}>
                      <span className={s.txName}>{tx.customer?.fullName ?? '—'}</span>
                      <span className={s.txPhone}>{tx.customer?.phone ?? ''}</span>
                    </div>
                    <span className={s.txKind}>{KIND_FA[tx.kind] ?? tx.kind}</span>
                    <span className={s.txAmount}>
                      {new Intl.NumberFormat('fa-IR').format(Number(tx.amount) / 100)} {tx.currency}
                    </span>
                    <span
                      className={tx.status === 'COMPLETED' ? s.txStatusCompleted : s.txStatusOther}
                    >
                      {STATUS_TX_FA[tx.status] ?? tx.status}
                    </span>
                    <span className={s.txDate}>
                      {new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short' }).format(
                        new Date(tx.createdAt as string),
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Confirm Status Dialogs ─────────────────────────────── */}
      {(['ACTIVE', 'SUSPENDED', 'CLOSED'] as const).map((st) => (
        <ConfirmDialog
          key={st}
          open={pendingStatus === st}
          onOpenChange={(o) => {
            if (!o) setPendingStatus(null);
          }}
          title={
            st === 'ACTIVE'
              ? 'فعال‌سازی صرافی'
              : st === 'SUSPENDED'
                ? 'تعلیق صرافی'
                : 'بستن دائمی صرافی'
          }
          description={
            st === 'ACTIVE'
              ? `صرافی «${exchange.name}» تأیید و فعال می‌شود.`
              : st === 'SUSPENDED'
                ? `صرافی «${exchange.name}» موقتاً تعلیق می‌شود.`
                : `صرافی «${exchange.name}» برای همیشه بسته می‌شود. این عملیات برگشت‌پذیر نیست.`
          }
          confirmLabel={
            st === 'ACTIVE' ? 'بله، فعال کن' : st === 'SUSPENDED' ? 'بله، تعلیق کن' : 'بله، ببند'
          }
          cancelLabel="انصراف"
          variant={st === 'ACTIVE' ? 'default' : 'danger'}
          onConfirm={() => handleStatusChange(st)}
          loading={savingStatus}
        />
      ))}

      {/* ── Confirm Revoke ─────────────────────────────────────── */}
      <ConfirmDialog
        open={!!revokeTarget}
        onOpenChange={(o) => {
          if (!o) setRevokeTarget(null);
        }}
        title="لغو دسترسی"
        description={
          revokeTarget
            ? `دسترسی «${revokeTarget.user.name ?? revokeTarget.user.email}» به این صرافی لغو می‌شود.`
            : ''
        }
        confirmLabel="بله، لغو کن"
        cancelLabel="انصراف"
        variant="danger"
        onConfirm={handleRevoke}
        loading={revokePending}
      />

      {/* ── Invite Dialog ─────────────────────────────────────── */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent dir="rtl" className={s.inviteDialog}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users size={17} aria-hidden /> دعوت کارمند جدید
            </DialogTitle>
          </DialogHeader>
          <div className={s.inviteBody}>
            <div className={s.inviteField}>
              <Label htmlFor="invite-email">ایمیل کاربر</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="example@domain.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                dir="ltr"
              />
              <p className={s.inviteHint}>کاربر باید قبلاً در سیستم ثبت‌نام کرده باشد</p>
            </div>
            <div className={s.inviteField}>
              <Label htmlFor="invite-role">نقش</Label>
              <Select
                value={inviteRole}
                onValueChange={(v) => setInviteRole(v as typeof inviteRole)}
              >
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_FA)
                    .filter(([k]) => k !== 'OWNER')
                    .map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className={s.inviteFooter}>
            <Button variant="outline" onClick={() => setShowInvite(false)} disabled={invitePending}>
              انصراف
            </Button>
            <Button onClick={handleInvite} disabled={invitePending || !inviteEmail.trim()}>
              {invitePending ? (
                <span className={s.spinner} aria-label="در حال ذخیره" />
              ) : (
                <CheckCircle2 size={14} aria-hidden />
              )}
              دعوت
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
