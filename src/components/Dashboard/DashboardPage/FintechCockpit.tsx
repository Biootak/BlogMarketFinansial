'use client';

import { Badge } from '@/components/ui/badge';
import { useVisibilityAwareInterval } from '@/hooks/useVisibilityAwareInterval';
import { AlertCircle, ArrowLeft, ArrowUpRight, CheckCircle2, Clock3, Radio, ShieldAlert, Users, WalletCards, Zap } from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useMemo, useState } from 'react';
import s from './FintechCockpit.module.css';

export interface FintechCockpitService { id: string; trackingCode: string; fullName: string; serviceType: string; amount: string; currency: string; status: string; urgency: string; createdAt: string | Date; }
export interface FintechCockpitServiceStats { pending: number; todayCount: number; pendingUrgent: number; total: number; }
export interface FintechCockpitLiveService { id: string; name: string; desc: string; status: 'healthy' | 'degraded' | 'down' | 'idle'; latencyMs?: number; href?: string; iconName?: string; }
export interface FintechCockpitLiveEvent { id: string; type: 'deposit' | 'withdraw' | 'kyc' | 'order' | 'auth' | 'fraud'; actor: string; detail: string; amount?: { value: number; currency: string }; timestamp: string | number; href?: string; }
export interface FintechCockpitProps { userName: string; userRole: 'OWNER' | 'ADMIN' | 'AUTHOR' | 'SUPERADMIN'; kpi: { txn24h: number; activeCustomers: number; openFraudCases: number; pendingRequests: number; dealsVolume: number; dealsCurrency: string; }; services: { stats: FintechCockpitServiceStats; recent: FintechCockpitService[]; }; live: { services: FintechCockpitLiveService[]; events: FintechCockpitLiveEvent[]; activityBars: number[]; }; editorial?: ReactNode; }

const fa = new Intl.NumberFormat('fa-IR');
const compact = new Intl.NumberFormat('fa-IR', { notation: 'compact', maximumFractionDigits: 1 });
const serviceLabels: Record<string, string> = { INTERNATIONAL_TRANSFER: 'حواله بین‌المللی', ONLINE_PAYMENT: 'پرداخت آنلاین', TUITION_PAYMENT: 'پرداخت شهریه', FREELANCE_INCOME: 'نقد کردن درآمد', SOFTWARE_PURCHASE: 'خرید نرم‌افزار', CURRENCY_BUY: 'خرید ارز', CURRENCY_SELL: 'فروش ارز', OTHER: 'سایر خدمات' };
const statusLabels: Record<string, string> = { PENDING: 'در انتظار', IN_PROGRESS: 'در حال انجام', COMPLETED: 'تکمیل شده', CANCELLED: 'لغو شده' };
const rel = (value: string | Date) => { const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000); return minutes < 1 ? 'همین حالا' : minutes < 60 ? `${fa.format(minutes)} دقیقه پیش` : `${fa.format(Math.floor(minutes / 60))} ساعت پیش`; };
const eventIcon = (type: FintechCockpitLiveEvent['type']) => type === 'fraud' ? ShieldAlert : type === 'auth' ? CheckCircle2 : type === 'withdraw' ? ArrowUpRight : WalletCards;

function FocusRail({ kpi, stats }: { kpi: FintechCockpitProps['kpi']; stats: FintechCockpitServiceStats }) {
  const items = [
    { label: 'در صف تصمیم', value: stats.pending, href: '/dashboard/service-requests', tone: stats.pending > 0 ? 'warn' : 'ok' },
    { label: 'فوری', value: stats.pendingUrgent, href: '/dashboard/service-requests', tone: stats.pendingUrgent > 0 ? 'danger' : 'ok' },
    { label: 'هشدار ریسک', value: kpi.openFraudCases, href: '/dashboard/fraud-review', tone: kpi.openFraudCases > 0 ? 'danger' : 'ok' },
    { label: 'تراکنش ۲۴ ساعت', value: kpi.txn24h, href: '/dashboard/audit-log', tone: 'neutral' },
  ];
  return <section className={s.focusRail} aria-label="اولویت‌های عملیاتی">{items.map((item) => <Link key={item.label} href={item.href} className={`${s.focusItem} ${s[`tone_${item.tone}`]}`}><span className={s.focusLabel}>{item.label}</span><strong>{fa.format(item.value)}</strong><ArrowLeft size={14} aria-hidden /></Link>)}</section>;
}

function CommandHero({ userName, stats, liveCount }: { userName: string; stats: FintechCockpitServiceStats; liveCount: number }) {
  const [now, setNow] = useState(() => Date.now());
  useVisibilityAwareInterval(() => setNow(Date.now()), 30000);
  const hour = new Date(now).getHours();
  const greeting = hour < 12 ? 'صبح بخیر' : hour < 17 ? 'ظهر بخیر' : hour < 21 ? 'عصر بخیر' : 'شب بخیر';
  const date = new Date(now).toLocaleDateString('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' });
  return <section className={s.hero} aria-label="نمای کلی عملیات"><div className={s.heroCopy}><div className={s.kicker}><span className={s.liveDot} aria-hidden /> اتاق عملیات <span dir="ltr">{new Date(now).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span> <span>{date}</span></div><h1>{greeting}، <em>{userName || 'مدیر'}</em></h1><p>{stats.pending > 0 ? `${fa.format(stats.pending)} درخواست منتظر تصمیم شماست.` : 'صف تصمیم‌گیری خالی است.'}</p><div className={s.heroActions}><Link href="/dashboard/service-requests" className={s.primaryAction}>باز کردن صف درخواست‌ها <ArrowLeft size={15} aria-hidden /></Link><span className={s.heroNote}><Radio size={14} aria-hidden /> {fa.format(liveCount)} رویداد زنده</span></div></div><div className={s.heroIndex} aria-hidden><span>LIVE</span><strong>{fa.format(stats.pending)}</strong><small>نیازمند توجه</small><i /></div></section>;
}

function RequestLedger({ recent, stats }: { recent: FintechCockpitService[]; stats: FintechCockpitServiceStats }) {
  return <section className={s.panel} aria-label="درخواست‌های خدمات"><header className={s.panelHead}><div><span className={s.overline}>QUEUE / SERVICES</span><h2>درخواست‌های در جریان</h2></div><Link href="/dashboard/service-requests" className={s.textLink}>مشاهده همه <ArrowLeft size={14} aria-hidden /></Link></header><div className={s.ledgerMeta}><span><b>{fa.format(stats.pending)}</b> در انتظار</span><span><b>{fa.format(stats.todayCount)}</b> ثبت امروز</span><span><b>{fa.format(stats.pendingUrgent)}</b> فوری</span></div><ul className={s.ledger}>{recent.length === 0 ? <li className={s.empty}><CheckCircle2 size={17} aria-hidden /> صف درخواست‌ها خالی است</li> : recent.map((item) => <li key={item.id}><Link href="/dashboard/service-requests"><span className={s.initial}>{item.fullName.trim().slice(0, 1) || '؟'}</span><span className={s.rowMain}><strong>{item.fullName}</strong><small>{serviceLabels[item.serviceType] ?? item.serviceType} · <span dir="ltr">{item.trackingCode}</span></small></span><span className={s.rowSide}><b dir="ltr">{item.amount} {item.currency}</b><small className={item.urgency === 'URGENT' ? s.urgent : ''}>{item.urgency === 'URGENT' ? 'فوری' : statusLabels[item.status] ?? item.status}</small><time>{rel(item.createdAt)}</time></span></Link></li>)}</ul></section>;
}

function LiveLedger({ live }: { live: FintechCockpitProps['live'] }) {
  const healthy = live.services.filter((service) => service.status === 'healthy').length;
  const score = live.services.length ? Math.round((healthy / live.services.length) * 100) : null;
  return <section className={s.panel} aria-label="وضعیت زنده پلتفرم"><header className={s.panelHead}><div><span className={s.overline}>SYSTEM / LIVE</span><h2>نبض پلتفرم</h2></div><span className={s.health}><span className={s.liveDot} aria-hidden /> {score === null ? 'بدون داده' : `${fa.format(score)}٪ سالم`}</span></header><div className={s.serviceSignals}>{live.services.slice(0, 4).map((service) => <div key={service.id}><span className={`${s.signal} ${s[`signal_${service.status}`]}`} aria-hidden /><span>{service.name}</span><small>{service.latencyMs == null ? 'بدون سنجه' : `${Math.round(service.latencyMs)}ms`}</small></div>)}</div><ul className={s.events}>{live.events.slice(0, 5).map((event) => { const Icon = eventIcon(event.type); return <li key={event.id}><span className={s.eventIcon}><Icon size={14} aria-hidden /></span><span><strong>{event.actor}</strong><small>{event.detail}</small></span><time>{rel(new Date(typeof event.timestamp === 'number' ? event.timestamp : event.timestamp))}</time></li>; })}</ul>{live.events.length === 0 && <div className={s.empty}><Clock3 size={17} aria-hidden /> رویداد زنده‌ای ثبت نشده</div>}</section>;
}

export function FintechCockpit({ userName, kpi, services, live, editorial }: FintechCockpitProps) {
  return <div className={s.root} dir="rtl"><CommandHero userName={userName} stats={services.stats} liveCount={live.events.length} /><FocusRail kpi={kpi} stats={services.stats} /><nav className={s.shortcuts} aria-label="دسترسی سریع"><Link href="/dashboard/exchanges"><Users size={16} aria-hidden /> صرافی‌ها</Link><Link href="/dashboard/exchange-rates"><WalletCards size={16} aria-hidden /> نرخ‌ها</Link><Link href="/dashboard/reports"><ShieldAlert size={16} aria-hidden /> گزارش‌ها</Link><Link href="/dashboard/helpdesk"><Zap size={16} aria-hidden /> پشتیبانی</Link></nav><div className={s.grid}><RequestLedger recent={services.recent} stats={services.stats} /><LiveLedger live={live} /></div>{editorial}</div>;
}

export default FintechCockpit;
