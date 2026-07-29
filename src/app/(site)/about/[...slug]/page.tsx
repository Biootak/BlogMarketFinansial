import { permanentRedirect } from 'next/navigation';

export default function AboutCatchAll() {
  permanentRedirect('/about');
}
