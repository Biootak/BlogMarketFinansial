import { redirect } from 'next/navigation';

export default function RateListsPage() {
  redirect('/dashboard/exchange-rates?tab=lists');
}
