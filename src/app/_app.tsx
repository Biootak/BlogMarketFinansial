import '@/styles/globals.css';
import 'highlight.js/styles/github-dark.css';
import '@/styles/index.scss';
import type { AppProps } from 'next/app';

export default function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
