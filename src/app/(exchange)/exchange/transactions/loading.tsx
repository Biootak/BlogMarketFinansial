import ExchangePageSkeleton from '@/components/Exchange/ExchangePageSkeleton';

export default function TransactionsLoading() {
  return <ExchangePageSkeleton statCount={3} tableRows={8} />;
}
