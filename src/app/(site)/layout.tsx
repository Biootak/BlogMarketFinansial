import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';

export const metadata: Metadata = {
  title: "Blog Market Financial",
  description: "Your trusted platform for financial market analysis",
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
