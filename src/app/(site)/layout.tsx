import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Market Financial ",
  description: "پلتفرم مورد اعتماد شمادر بازار مالی",
  icons: {
    icon: [
      {
        rel: "icon",
        url: "/favicon.svg",
        type: "image/svg+xml",
        sizes: "any"
      }
    ]
  },
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}
