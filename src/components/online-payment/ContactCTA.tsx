import { getSupportContactLinks } from '@/actions/serviceRequestActions';
import ContactCTAClient from './ContactCTAClient';

interface ContactCTAProps {
  defaultServiceType?:
    | 'INTERNATIONAL_TRANSFER'
    | 'ONLINE_PAYMENT'
    | 'TUITION_PAYMENT'
    | 'FREELANCE_INCOME'
    | 'SOFTWARE_PURCHASE'
    | 'OTHER';
}

export default async function ContactCTA({
  defaultServiceType = 'ONLINE_PAYMENT',
}: ContactCTAProps) {
  const contactLinks = await getSupportContactLinks();

  return (
    <ContactCTAClient
      defaultServiceType={defaultServiceType}
      telegramLink={contactLinks.data?.telegram || null}
      whatsappLink={contactLinks.data?.whatsapp || null}
    />
  );
}
