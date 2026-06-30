import { getSiteIdentity } from '@/lib/site-identity';
import Logo from './Logo';

interface SiteLogoProps {
  className?: string;
  variant?: 'default' | 'modern';
}

/**
 * Site-aware logo.
 *
 * Server component that reads the configured logo from SystemSettings and
 * renders the client Logo with the correct URL. Falls back to the default
 * SVG logo when no custom logo is configured.
 */
export default async function SiteLogo({ className, variant }: SiteLogoProps) {
  const { logoUrl, siteName } = await getSiteIdentity();

  return (
    <Logo
      logoUrl={logoUrl}
      className={className}
      variant={variant}
    />
  );
}
