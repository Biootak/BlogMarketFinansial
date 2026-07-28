import { getSiteIdentity } from '@/lib/site-identity';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import s from './subscription-plan.module.css';
import { PlanDetailClient } from './PlanDetailClient';

type Params = Promise<{ plan: string }>;

const VALID_PLANS = ['free', 'pro', 'business'] as const;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { plan: rawPlan } = await params;
  const planId = rawPlan as (typeof VALID_PLANS)[number];
  const { siteName } = await getSiteIdentity();
  const name = siteName || 'پلتفرم مالی';
  const titles: Record<string, string> = {
    free: 'پلن رایگان',
    pro: 'پلن حرفه‌ای',
    business: 'پلن سازمانی',
  };
  return {
    title: `${titles[planId] ?? 'پلن'} | ${name}`,
    description: `جزئیات ${titles[planId] ?? 'پلن'} — امکانات، قیمت و شرایط اشتراک در ${name}.`,
    alternates: { canonical: `/subscription/${planId}` },
  };
}

export default async function PlanDetailPage({ params }: { params: Params }) {
  const { plan } = await params;

  if (!VALID_PLANS.includes(plan as (typeof VALID_PLANS)[number])) {
    notFound();
  }

  return (
    <div className={s.page}>
      <div className="container">
        <PlanDetailClient planId={plan as (typeof VALID_PLANS)[number]} />
      </div>
    </div>
  );
}
