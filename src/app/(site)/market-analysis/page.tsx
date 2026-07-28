import { redirect } from 'next/navigation';

export default function MarketAnalysisPage() {
  // /market-analysis — تحلیل بازار؛ هدایت به آرشیو
  redirect('/archive');
}
