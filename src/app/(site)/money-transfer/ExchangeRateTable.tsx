import type { ExchangeRateData } from '@/types/types';
import { ExchangeRateTableWrapper } from './ExchangeRateTableWrapper';


export default function ExchangeRateTable({
  exchangeRates,
}: {
  exchangeRates: ExchangeRateData[];
}) {
  return <ExchangeRateTableWrapper exchangeRates={exchangeRates} />;
}
