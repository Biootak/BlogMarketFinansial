import { redirect } from 'next/navigation';

export default function PublicCreditRatesPage() {
  // /credit-rates — نرخ سود بانکی؛ هدایت به آرشیو
  redirect('/archive');
}
