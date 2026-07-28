/**
 * /transfer — legacy URL.
 *
 * The canonical public money-transfer page lives at /money-transfer
 * (route group `(site)`) and includes the full site shell (Header,
 * market ticker, Footer, mega-menu, etc.). The previous implementation
 * in this route group rendered the form without Header/Footer, which
 * gave users a naked page with no navigation — a critical UX break.
 *
 * This file is a permanent redirect so any inbound links (old sitemap,
 * backlinks, shared URLs) still land on the right experience.
 */
import { permanentRedirect } from 'next/navigation';

export default function TransferLegacyAlias(): never {
  permanentRedirect('/money-transfer');
}
