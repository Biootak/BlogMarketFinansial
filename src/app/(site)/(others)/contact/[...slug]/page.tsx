import { permanentRedirect } from 'next/navigation';

export default function ContactCatchAll() {
  permanentRedirect('/contact');
}
