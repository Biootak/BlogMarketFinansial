'use client';

/**
 * DevicesClient — Security Intelligence & Session Operations Center
 * Atelier 2026 Redesign
 * 
 * ویژگی‌ها:
 * - ساختار نامتقارن (گرید ۸ ستون به ۴ ستون در دسکتاپ)
 * - نقشه شبکه فعال با انیمیشن راداری و پالس (Signature Moment)
 * - امتیازدهی امنیتی پیشرفته به همراه Dial دایره‌ای مدرن
 * - لیست دستگاه‌ها با رنگ‌های غنی و غیرجیغ (Emerald, Amber, Rose, Slate)
 * - تایم‌لاین امنیتی فعال برای رویدادهای اخیر
 * - دکمه لغو گروهی دسترسی‌ها (Emergency Revoke)
 * - تعاملات spring و کپی آسان اثر انگشت (Fingerprint)
 */

import {
  type DeviceRow,
  type SecurityLog,
  revokeDevice,
  trustDevice,
  revokeAllOtherDevices,
} from '@/actions/deviceActions';
import {
  ConfirmDialog,
  EmptyState,
  PageHeader,
  Spotlight,
} from '@/components/Dashboard/primitives';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Fingerprint,
  Globe,
  Monitor,
  Search,
  Shield,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  XCircle,
  Copy,
  Check,
  Activity,
  UserCheck,
  LogOut,
  Info,
  Lock,
} from 'lucide-react';
import { useCallback, useMemo, useState, useTransition } from 'react';
import s from './DevicesClient.module.css';

type Props = {
  devices: DeviceRow[];
  securityLogs: SecurityLog[];
};

type StatusFilter = 'all' | 'TRUSTED' | 'UNVERIFIED' | 'REVOKED';

const STATUS_MAP: Record<
  string,
  { label: string; cssClass: string; icon: React.FC<{ size?: number; 'aria-hidden'?: boolean }> }
> = {
  UNVERIFIED: { label: 'تأیید نشده', cssClass: s.statusUnverified, icon: (p) => <AlertCircle {...p} /> },
  TRUSTED:    { label: 'معتمد',       cssClass: s.statusTrusted,    icon: (p) => <CheckCircle2 {...p} /> },
  REVOKED:    { label: 'لغو شده',     cssClass: s.statusRevoked,    icon: (p) => <XCircle {...p} /> },
};

const CARD_STATUS_CLASS: Record<string, string> = {
  TRUSTED:    s.deviceCardTrusted,
  UNVERIFIED: s.deviceCardUnverified,
  REVOKED:    s.deviceCardRevoked,
};

const SHEET_STATUS_CLASS: Record<string, string> = {
  TRUSTED:    s.sheetTrusted,
  UNVERIFIED: s.sheetUnverified,
  REVOKED:    s.sheetRevoked,
};

/* ── helper functions ──────────────────────────────────────────────────────── */

function isMobile(ua: string | null): boolean {
  if (!ua) return false;
  return /android|iphone|ipad|mobile/i.test(ua);
}

function getBrowserName(ua: string | null): string {
  if (!ua) return 'دستگاه ناشناخته';
  if (/Chrome/i.test(ua) && !/Chromium|Edg/i.test(ua)) return 'Chrome';
  if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'Safari';
  if (/Firefox/i.test(ua)) return 'Firefox';
  if (/Edg/i.test(ua)) return 'Edge';
  if (/Opera|OPR/i.test(ua)) return 'Opera';
  return 'مرورگر ناشناخته';
}

function getOsName(ua: string | null): string {
  if (!ua) return '';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/iPhone|iPad/i.test(ua)) return 'iOS';
  if (/Android/i.test(ua)) return 'Android';
  if (/Macintosh|Mac OS/i.test(ua)) return 'macOS';
  if (/Linux/i.test(ua)) return 'Linux';
  return '';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'همین الان';
  if (mins < 60) return `${mins} دقیقه پیش`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ساعت پیش`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} روز پیش`;
  return formatDate(iso);
}

function translateLogAction(action: string): { label: string; icon: React.ReactNode; color: string } {
  switch (action) {
    case 'DEVICE_REVOKED':
      return { label: 'لغو دسترسی دستگاه', icon: <ShieldOff size={14} />, color: 'var(--nova-down)' };
    case 'DEVICE_TRUSTED':
      return { label: 'تأیید اعتماد دستگاه', icon: <UserCheck size={14} />, color: 'var(--nova-up)' };
    case 'ALL_OTHER_DEVICES_REVOKED':
      return { label: 'لغو سراسری سایر دستگاه‌ها', icon: <Lock size={14} />, color: 'var(--nova-down)' };
    case 'USER_SIGNIN':
      return { label: 'ورود موفق به حساب', icon: <CheckCircle2 size={14} />, color: 'var(--nova-up)' };
    case 'USER_SIGNOUT':
      return { label: 'خروج از حساب', icon: <LogOut size={14} />, color: 'var(--at-fg-subtle)' };
    default:
      return { label: action, icon: <Activity size={14} />, color: 'var(--at-fg-subtle)' };
  }
}

// نقاط فرضی نقشه برای ایجاد جلوه رادار و پالس
const MAP_POINTS = [
  { x: 180, y: 70, label: 'آمریکا' },
  { x: 380, y: 60, label: 'اروپا' },
  { x: 490, y: 85, label: 'خاورمیانه (تهران)', active: true },
  { x: 620, y: 75, label: 'شرق آسیا' },
  { x: 680, y: 160, label: 'استرالیا' },
];

export function DevicesClient({ devices: initial, securityLogs: initialLogs }: Props) {
  const [devices, setDevices] = useState<DeviceRow[]>(initial);
  const [logs, setLogs] = useState<SecurityLog[]>(initialLogs);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);
  const [revokeAllConfirm, setRevokeAllConfirm] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<DeviceRow | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const stats = useMemo(
    () => ({
      total:      devices.length,
      trusted:    devices.filter((d) => d.status === 'TRUSTED').length,
      unverified: devices.filter((d) => d.status === 'UNVERIFIED').length,
      revoked:    devices.filter((d) => d.status === 'REVOKED').length,
    }),
    [devices],
  );

  // محاسبه امتیاز امنیتی
  const securityScore = useMemo(() => {
    if (stats.total === 0) return 100;
    const trustedPct = (stats.trusted / stats.total) * 100;
    const revokedPenalty = stats.revoked * 4;
    const unverifiedPenalty = stats.unverified * 8;
    return Math.max(10, Math.round(trustedPct - revokedPenalty - unverifiedPenalty));
  }, [stats]);

  const scoreColor = useMemo(() => {
    if (securityScore >= 80) return 'var(--nova-up)';
    if (securityScore >= 50) return 'var(--at-gold)';
    return 'var(--nova-down)';
  }, [securityScore]);

  const scoreStatusLabel = useMemo(() => {
    if (securityScore >= 80) return 'پایدار و ایمن';
    if (securityScore >= 50) return 'سطح ایمنی متوسط';
    return 'نیازمند توجه فوری';
  }, [securityScore]);

  const filtered = useMemo(() => {
    let list = devices;
    if (filter !== 'all') list = list.filter((d) => d.status === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (d) =>
          getBrowserName(d.userAgent).toLowerCase().includes(q) ||
          getOsName(d.userAgent).toLowerCase().includes(q) ||
          (d.ip ?? '').toLowerCase().includes(q) ||
          d.fingerprint.toLowerCase().includes(q),
      );
    }
    return list;
  }, [devices, filter, search]);

  const handleRevoke = useCallback((id: string) => {
    setError(null);
    startTransition(async () => {
      const res = await revokeDevice(id);
      if (!res.success) {
        setError(res.error.message);
        return;
      }
      setDevices((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'REVOKED' } : d)));
      setRevokeTarget(null);
      setSelectedDevice((prev) => (prev?.id === id ? { ...prev, status: 'REVOKED' } : prev));
      
      // به‌روزرسانی محلی لاگ‌های امنیتی
      const newLog: SecurityLog = {
        id: crypto.randomUUID(),
        action: 'DEVICE_REVOKED',
        ip: devices.find(d => d.id === id)?.ip ?? null,
        createdAt: new Date().toISOString()
      };
      setLogs((prev) => [newLog, ...prev.slice(0, 9)]);
    });
  }, [devices]);

  const handleTrust = useCallback((id: string) => {
    setError(null);
    startTransition(async () => {
      const res = await trustDevice(id);
      if (!res.success) {
        setError(res.error.message);
        return;
      }
      setDevices((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'TRUSTED' } : d)));
      setSelectedDevice((prev) => (prev?.id === id ? { ...prev, status: 'TRUSTED' } : prev));
      
      // به‌روزرسانی محلی لاگ‌های امنیتی
      const newLog: SecurityLog = {
        id: crypto.randomUUID(),
        action: 'DEVICE_TRUSTED',
        ip: devices.find(d => d.id === id)?.ip ?? null,
        createdAt: new Date().toISOString()
      };
      setLogs((prev) => [newLog, ...prev.slice(0, 9)]);
    });
  }, [devices]);

  const handleRevokeAllOthers = useCallback(() => {
    setError(null);
    // فرض می‌کنیم دستگاه فعلی اولین دستگاه فعال با جدیدترین lastSeenAt است
    const activeSorted = [...devices].sort(
      (a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime()
    );
    const currentId = activeSorted[0]?.id;
    if (!currentId) return;

    startTransition(async () => {
      const res = await revokeAllOtherDevices(currentId);
      if (!res.success) {
        setError(res.error.message);
        return;
      }
      setDevices((prev) =>
        prev.map((d) => (d.id !== currentId ? { ...d, status: 'REVOKED' } : d))
      );
      setRevokeAllConfirm(false);

      const newLog: SecurityLog = {
        id: crypto.randomUUID(),
        action: 'ALL_OTHER_DEVICES_REVOKED',
        ip: activeSorted[0]?.ip ?? null,
        createdAt: new Date().toISOString()
      };
      setLogs((prev) => [newLog, ...prev.slice(0, 9)]);
    });
  }, [devices]);

  const handleCopy = (id: string, fp: string) => {
    navigator.clipboard.writeText(fp);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const currentDevice = useMemo(() => {
    return [...devices].sort(
      (a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime()
    )[0];
  }, [devices]);

  const filterChips: { label: string; value: StatusFilter; dotClass: string }[] = [
    { label: 'همه دسترسی‌ها', value: 'all',        dotClass: s.dotAll },
    { label: 'تأیید شده (معتمد)', value: 'TRUSTED',    dotClass: s.dotTrust },
    { label: 'تأیید نشده',     value: 'UNVERIFIED', dotClass: s.dotWarn },
    { label: 'لغو شده',        value: 'REVOKED',    dotClass: s.dotRevoke },
  ];

  return (
    <div className={s.root} dir="rtl">
      {/* ── PageHeader ── */}
      <PageHeader
        title="دستگاه‌ها و نشست‌های فعال"
        description="مانیتورینگ هوشمند، مدیریت دسترسی‌ها و بررسی فعالیت‌های امنیتی حساب کاربری شما"
        eyebrow="مرکز عملیات امنیت"
        breadcrumb={[{ href: '/dashboard', label: 'داشبورد' }, { label: 'دستگاه‌ها' }]}
        icon="shield-check"
        accent="indigo"
      />

      {error && (
        <div className={s.errorBanner} role="alert">
          <AlertCircle size={16} aria-hidden />
          <span>{error}</span>
        </div>
      )}

      {/* ── Asymmetrical SOC Layout Grid ── */}
      <div className={s.socLayout}>
        
        {/* ── LEFT PANEL (8 Columns): Connection Map & Device Management ── */}
        <div className={s.mainPanel}>
          
          {/* Active Session Geographic Dot Grid (Signature Moment) */}
          <div className={s.mapCard}>
            <div className={s.cardHeadline}>
              <span className={s.cardIndicator} />
              <h4>نقشه زنده توزیع جغرافیایی نشست‌ها</h4>
              <span className={s.liveBadge}>
                <span className={s.liveDot} />
                زنده
              </span>
            </div>
            
            <div className={s.mapWrapper}>
              {/* Background Network Map SVG */}
              <svg viewBox="0 0 800 240" className={s.svgMap}>
                {/* World map layout helper paths */}
                <path
                  d="M150,60 Q170,50 200,70 T250,90 T300,150"
                  fill="none"
                  stroke="var(--at-line)"
                  strokeWidth="1.5"
                  strokeDasharray="4 6"
                  opacity="0.3"
                />
                <path
                  d="M400,60 Q430,70 480,90 T550,140"
                  fill="none"
                  stroke="var(--at-line)"
                  strokeWidth="1.5"
                  strokeDasharray="4 6"
                  opacity="0.3"
                />
                <path
                  d="M480,90 Q580,70 650,80 T700,160"
                  fill="none"
                  stroke="var(--at-line)"
                  strokeWidth="1.5"
                  strokeDasharray="4 6"
                  opacity="0.3"
                />
                
                {/* Connecting Lines from Tehran active node */}
                {MAP_POINTS.map((pt, i) => (
                  !pt.active && (
                    <path
                      key={i}
                      d={`M490,85 Q${(490+pt.x)/2},${Math.min(85, pt.y)-30} ${pt.x},${pt.y}`}
                      fill="none"
                      stroke="var(--at-accent)"
                      strokeWidth="1"
                      strokeDasharray="3 4"
                      className={s.pulsePath}
                      opacity="0.4"
                    />
                  )
                ))}

                {/* Draw Dots */}
                {MAP_POINTS.map((pt, i) => (
                  <g key={i}>
                    {pt.active ? (
                      <>
                        <circle cx={pt.x} cy={pt.y} r="14" className={s.radialRadar} />
                        <circle cx={pt.x} cy={pt.y} r="8" className={s.radialRadarInner} />
                        <circle cx={pt.x} cy={pt.y} r="4.5" fill="var(--nova-up)" />
                      </>
                    ) : (
                      <>
                        <circle cx={pt.x} cy={pt.y} r="3" fill="var(--at-fg-subtle)" opacity="0.7" />
                        <circle cx={pt.x} cy={pt.y} r="7" fill="none" stroke="var(--at-line)" strokeWidth="0.8" />
                      </>
                    )}
                    <text
                      x={pt.x}
                      y={pt.y - 12}
                      className={s.mapLabel}
                      textAnchor="middle"
                      fill={pt.active ? 'var(--at-fg)' : 'var(--at-fg-subtle)'}
                    >
                      {pt.label}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>

          {/* Filtering & Actions Toolbar */}
          <div className={s.toolbar}>
            <div className={s.filterWrapper}>
              {filterChips.map((chip) => (
                <button
                  key={chip.value}
                  type="button"
                  className={`${s.filterChip} ${filter === chip.value ? s.filterChipActive : ''}`}
                  onClick={() => setFilter(chip.value)}
                  aria-pressed={filter === chip.value}
                >
                  <span className={`${s.chipDot} ${chip.dotClass}`} />
                  {chip.label}
                  <span className={s.chipCount}>
                    {new Intl.NumberFormat('fa-IR').format(
                      chip.value === 'all'
                        ? stats.total
                        : chip.value === 'TRUSTED'
                        ? stats.trusted
                        : chip.value === 'UNVERIFIED'
                        ? stats.unverified
                        : stats.revoked
                    )}
                  </span>
                </button>
              ))}
            </div>

            <div className={s.searchField}>
              <Search size={14} className={s.searchIcon} />
              <input
                type="search"
                placeholder="جستجو در شناسه، سیستم‌عامل، IP..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="جستجوی دستگاه"
              />
            </div>
          </div>

          {/* Device Cards Asymmetric Grid */}
          {filtered.length === 0 ? (
            <div className={s.emptyStateBox}>
              <EmptyState
                icon={Monitor}
                title={devices.length === 0 ? 'هیچ نشستی یافت نشد' : 'نتیجه‌ای یافت نشد'}
                description={
                  devices.length === 0
                    ? 'نشست‌های فعال شما پس از ورود در این بخش نمایش داده می‌شوند.'
                    : 'پارامترهای جستجو یا فیلتر خود را تغییر دهید.'
                }
              />
            </div>
          ) : (
            <div className={s.deviceGrid}>
              {filtered.map((d, index) => {
                const mobile = isMobile(d.userAgent);
                const browser = getBrowserName(d.userAgent);
                const os = getOsName(d.userAgent);
                const relTime = getRelativeTime(d.lastSeenAt);
                const statusInfo = STATUS_MAP[d.status] ?? STATUS_MAP.UNVERIFIED;
                const StatusIcon = statusInfo.icon;
                const isCurrent = currentDevice?.id === d.id;

                return (
                  <div
                    key={d.id}
                    className={`${s.deviceCard} ${CARD_STATUS_CLASS[d.status] || ''} ${isCurrent ? s.deviceCardCurrent : ''}`}
                    style={{ '--index': index } as React.CSSProperties}
                    onClick={() => setSelectedDevice(d)}
                  >
                    <Spotlight tone="accent" size={160} />
                    
                    {/* Head */}
                    <div className={s.cardHead}>
                      <div className={s.deviceIco}>
                        {mobile ? <Smartphone size={18} /> : <Monitor size={18} />}
                      </div>
                      <div className={s.headText}>
                        <div className={s.browserTitle}>
                          {browser}
                          {isCurrent && <span className={s.currentTag}>این دستگاه</span>}
                        </div>
                        <span className={s.osTitle}>{os || 'نامشخص'}</span>
                      </div>
                      <span className={`${s.statusBadge} ${statusInfo.cssClass}`}>
                        <StatusIcon size={10} />
                        {statusInfo.label}
                      </span>
                    </div>

                    {/* Metadata Details */}
                    <div className={s.cardMetadata}>
                      {d.ip && (
                        <div className={s.metaCol}>
                          <span className={s.metaLabel}>نشانی IP</span>
                          <span className={s.metaValue} dir="ltr">
                            <Globe size={10} />
                            {d.ip}
                          </span>
                        </div>
                      )}
                      <div className={s.metaCol}>
                        <span className={s.metaLabel}>آخرین بازدید</span>
                        <span className={s.metaValue}>
                          <Clock size={10} />
                          {relTime}
                        </span>
                      </div>
                    </div>

                    {/* Fingerprint Segment with click-to-copy */}
                    <div
                      className={s.fingerprintBox}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(d.id, d.fingerprint);
                      }}
                      title="کلیک برای کپی کردن اثر انگشت دستگاه"
                    >
                      <Fingerprint size={12} className={s.fpIcon} />
                      <span className={s.fpCode} dir="ltr">
                        {d.fingerprint.slice(0, 16)}...{d.fingerprint.slice(-8)}
                      </span>
                      <button type="button" className={s.copyBtn} aria-label="کپی اثر انگشت">
                        {copiedId === d.id ? <Check size={11} className={s.checkGreen} /> : <Copy size={11} />}
                      </button>
                    </div>

                    {/* Actions Panel */}
                    <div className={s.cardActions} onClick={(e) => e.stopPropagation()}>
                      {d.status === 'UNVERIFIED' && (
                        <button
                          type="button"
                          className={s.actionTrust}
                          onClick={() => handleTrust(d.id)}
                          disabled={isPending}
                        >
                          <ShieldCheck size={12} />
                          تأیید دستگاه
                        </button>
                      )}
                      {d.status !== 'REVOKED' && !isCurrent && (
                        <button
                          type="button"
                          className={s.actionRevoke}
                          onClick={() => setRevokeTarget(d.id)}
                          disabled={isPending}
                        >
                          <ShieldOff size={12} />
                          لغو دسترسی
                        </button>
                      )}
                      <button
                        type="button"
                        className={s.actionDetails}
                        onClick={() => setSelectedDevice(d)}
                      >
                        جزئیات
                        <ChevronLeft size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL (4 Columns): Security dial & timeline logs ── */}
        <div className={s.sidePanel}>
          
          {/* Security score circle dial */}
          <div className={s.scoreCard}>
            <div className={s.scoreDialWrapper}>
              <svg viewBox="0 0 100 100" className={s.svgDial}>
                <circle cx="50" cy="50" r="40" className={s.dialTrack} />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className={s.dialProgress}
                  stroke={scoreColor}
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - securityScore / 100)}`}
                />
              </svg>
              <div className={s.scoreNumberBox}>
                <span className={s.scoreNum}>{securityScore}</span>
                <span className={s.scorePct}>٪</span>
              </div>
            </div>
            
            <div className={s.scoreMeta}>
              <h5>ضریب امنیتی دسترسی‌ها</h5>
              <p className={s.scoreLabelText} style={{ color: scoreColor }}>
                {scoreStatusLabel}
              </p>
              <span className={s.scoreDescText}>
                {stats.trusted} دستگاه معتمد از {stats.total} دستگاه متصل.
              </span>
            </div>

            {/* Quick emergency action */}
            {devices.some((d) => d.status !== 'REVOKED' && d.id !== currentDevice?.id) && (
              <button
                type="button"
                className={s.emergencyRevokeBtn}
                onClick={() => setRevokeAllConfirm(true)}
                disabled={isPending}
              >
                <Lock size={13} />
                لغو دسترسی تمامی دستگاه‌های دیگر
              </button>
            )}
          </div>

          {/* Security Audit Timeline */}
          <div className={s.timelineCard}>
            <div className={s.timelineHead}>
              <Activity size={14} className={s.timelineIco} />
              <h4>تایم‌لاین رویدادهای امنیتی اخیر</h4>
            </div>

            {logs.length === 0 ? (
              <div className={s.emptyTimeline}>
                <Info size={16} />
                <span>هیچ رویداد امنیتی ثبت نشده است.</span>
              </div>
            ) : (
              <div className={s.timelineList}>
                {logs.map((log) => {
                  const logInfo = translateLogAction(log.action);
                  return (
                    <div key={log.id} className={s.timelineItem}>
                      <div className={s.timelineIndicator} style={{ backgroundColor: logInfo.color }} />
                      <div className={s.timelineContent}>
                        <div className={s.timelineLogTitle}>
                          <span className={s.logIcon} style={{ color: logInfo.color }}>
                            {logInfo.icon}
                          </span>
                          <span className={s.logText}>{logInfo.label}</span>
                        </div>
                        <div className={s.timelineMeta}>
                          {log.ip && <span className={s.logIp} dir="ltr">{log.ip}</span>}
                          <span className={s.logTime}>{getRelativeTime(log.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Educational Security Tips */}
          <div className={s.tipsCard}>
            <div className={s.tipTitle}>
              <ShieldCheck size={14} className={s.shieldGreen} />
              <h5>توصیه‌های حفاظتی حساب</h5>
            </div>
            <ul className={s.tipsList}>
              <li>دستگاه‌هایی که متعلق به شما نیستند یا دیگر از آن‌ها استفاده نمی‌کنید را سریعاً لغو دسترسی کنید.</li>
              <li>نشست‌های تأیید نشده را پس از اعتبارسنجی آدرس IP به وضعیت «معتمد» ارتقا دهید.</li>
              <li>از ورود به حساب کاربری در مرورگرهای عمومی و بدون وضعیت Incognito خودداری نمایید.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── Confirm Single Revoke Dialog ── */}
      <ConfirmDialog
        open={!!revokeTarget}
        onOpenChange={(o) => !o && setRevokeTarget(null)}
        title="لغو دسترسی دستگاه"
        description="آیا از لغو دسترسی این دستگاه مطمئن هستید؟ با این کار جلسه فعال آن بلافاصله خاتمه یافته و از سیستم خارج می‌شود."
        confirmLabel="لغو دسترسی دستگاه"
        cancelLabel="انصراف"
        variant="danger"
        loading={isPending}
        onConfirm={() => revokeTarget && handleRevoke(revokeTarget)}
      />

      {/* ── Confirm Revoke All Dialog ── */}
      <ConfirmDialog
        open={revokeAllConfirm}
        onOpenChange={(o) => !o && setRevokeAllConfirm(false)}
        title="خروج سراسری از سایر دستگاه‌ها"
        description="با تأیید این عمل، دسترسی تمامی دستگاه‌ها و جلسات متصل به این حساب به جز سیستم فعلی شما لغو خواهد شد. آیا ادامه می‌دهید؟"
        confirmLabel="لغو دسترسی همگانی"
        cancelLabel="انصراف"
        variant="danger"
        loading={isPending}
        onConfirm={handleRevokeAllOthers}
      />

      {/* ── Details Sheet ── */}
      <Sheet open={!!selectedDevice} onOpenChange={(o) => !o && setSelectedDevice(null)}>
        <SheetContent side="left" className="w-[360px] p-0 overflow-hidden" dir="rtl">
          {selectedDevice && (() => {
            const d = selectedDevice;
            const browser = getBrowserName(d.userAgent);
            const os = getOsName(d.userAgent);
            const mobile = isMobile(d.userAgent);
            const statusInfo = STATUS_MAP[d.status] ?? STATUS_MAP.UNVERIFIED;
            const StatusIcon = statusInfo.icon;
            const isCurrent = currentDevice?.id === d.id;

            return (
              <div className={`${s.sheetInner} ${SHEET_STATUS_CLASS[d.status] || ''}`}>
                {/* Header */}
                <div className={s.sheetHead}>
                  <div className={s.sheetIconWrap}>
                    {mobile ? <Smartphone size={22} /> : <Monitor size={22} />}
                  </div>
                  <div className={s.sheetHeadText}>
                    <div className={s.sheetTitle}>
                      {browser}
                      {isCurrent && <span className={s.sheetCurrentTag}>این دستگاه</span>}
                    </div>
                    <div className={s.sheetSub}>
                      {os && <span>{os} · </span>}
                      <span className={`${s.statusBadge} ${statusInfo.cssClass}`}>
                        <StatusIcon size={10} />
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Details list */}
                <div className={s.sheetSection}>
                  <h5 className={s.sheetSecTitle}>مشخصات فنی و دسترسی</h5>
                  
                  <div className={s.sheetRow}>
                    <span className={s.sheetRowKey}>نام مرورگر</span>
                    <span className={s.sheetRowVal}>{browser}</span>
                  </div>
                  {os && (
                    <div className={s.sheetRow}>
                      <span className={s.sheetRowKey}>سیستم‌عامل</span>
                      <span className={s.sheetRowVal}>{os}</span>
                    </div>
                  )}
                  <div className={s.sheetRow}>
                    <span className={s.sheetRowKey}>دسته‌بندی دستگاه</span>
                    <span className={s.sheetRowVal}>{mobile ? 'دستگاه همراه / موبایل' : 'سیستم دسکتاپ / لپ‌تاپ'}</span>
                  </div>
                  {d.ip && (
                    <div className={s.sheetRow}>
                      <span className={s.sheetRowKey}>آدرس IP ثبت شده</span>
                      <span className={s.sheetRowValMono} dir="ltr">{d.ip}</span>
                    </div>
                  )}
                  <div className={s.sheetRow}>
                    <span className={s.sheetRowKey}>وضعیت تأیید امنیتی</span>
                    <span className={s.sheetRowVal}>{statusInfo.label}</span>
                  </div>
                </div>

                {/* Timeline info */}
                <div className={s.sheetSection}>
                  <h5 className={s.sheetSecTitle}>ثبت رویدادها</h5>
                  <div className={s.sheetRow}>
                    <span className={s.sheetRowKey}>تاریخ اولین ورود</span>
                    <span className={s.sheetRowVal}>{formatDate(d.createdAt)}</span>
                  </div>
                  <div className={s.sheetRow}>
                    <span className={s.sheetRowKey}>آخرین فعالیت مانیتور شده</span>
                    <span className={s.sheetRowVal}>{formatDate(d.lastSeenAt)}</span>
                  </div>
                </div>

                {/* Fingerprint details */}
                <div className={s.sheetSection}>
                  <h5 className={s.sheetSecTitle}>امضای یکتای سخت‌افزاری</h5>
                  <div className={s.sheetRowFingerprint}>
                    <span className={s.fpLabel}>Fingerprint String</span>
                    <div className={s.fpFullBox}>
                      <span className={s.fpFullValue} dir="ltr">{d.fingerprint}</span>
                      <button
                        type="button"
                        className={s.sheetCopyBtn}
                        onClick={() => handleCopy('sheet', d.fingerprint)}
                      >
                        {copiedId === 'sheet' ? <Check size={12} className={s.checkGreen} /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Agent Detail */}
                {d.userAgent && (
                  <div className={s.sheetSection}>
                    <h5 className={s.sheetSecTitle}>رشته User Agent کلاینت</h5>
                    <div className={s.uaDataText} dir="ltr">
                      {d.userAgent}
                    </div>
                  </div>
                )}

                {/* Bottom Actions */}
                <div className={s.sheetBottomActions}>
                  {d.status === 'UNVERIFIED' && (
                    <button
                      type="button"
                      className={s.sheetActionTrust}
                      onClick={() => handleTrust(d.id)}
                      disabled={isPending}
                    >
                      <ShieldCheck size={14} />
                      تأیید اعتماد این دستگاه
                    </button>
                  )}
                  {d.status !== 'REVOKED' && !isCurrent && (
                    <button
                      type="button"
                      className={s.sheetActionRevoke}
                      onClick={() => setRevokeTarget(d.id)}
                      disabled={isPending}
                    >
                      <ShieldOff size={14} />
                      لغو دسترسی این دستگاه
                    </button>
                  )}
                </div>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
