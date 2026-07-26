/**
 * Barrel for the Dashboard primitives layer (chunk 1b).
 *
 * Components are imported individually so server-only modules (Breadcrumb)
 * are not pulled into client bundles by accident. Consumers should
 * `import { PageHeader } from '@/components/Dashboard/primitives'`.
 */

export { PageHeader } from './PageHeader';
export type { PageHeaderProps, PageHeaderAccent } from './PageHeader';

export { StatCard } from './StatCard';
export type { StatCardProps } from './StatCard';

export { StatGrid } from './StatGrid';
export type { StatGridProps } from './StatGrid';

export { DataTable } from './DataTable';
export type { DataTableProps, Column } from './DataTable';

export { TableToolbar, useTableDensity } from './TableToolbar';
export type { TableToolbarProps, TableDensity } from './TableToolbar';

export { Section } from './Section';
export type { SectionProps } from './Section';

export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';

export { Skeleton } from './Skeleton';
export type { SkeletonProps, SkeletonVariant } from './Skeleton';

export { Breadcrumb } from './Breadcrumb';
export type { BreadcrumbProps, BreadcrumbItem } from './Breadcrumb';

export { MagneticButton } from './MagneticButton';
export type { MagneticButtonProps } from './MagneticButton';

export { AmbientBackground } from './AmbientBackground';
export type { AmbientBackgroundProps, AmbientTone } from './AmbientBackground';

export { DashboardEmpty } from './DashboardEmpty';
export type { DashboardEmptyProps, DashboardEmptyTone } from './DashboardEmpty';

export { NoiseTexture } from './NoiseTexture';
export type { NoiseTextureProps } from './NoiseTexture';

export { Spotlight } from './Spotlight';
export type { SpotlightProps, SpotlightTone } from './Spotlight';

export { ConfirmDialog } from './ConfirmDialog';
export type { ConfirmDialogProps } from './ConfirmDialog';

export { FormField } from './FormField';
export type { FormFieldProps } from './FormField';

export { default as CountUp } from './CountUp';

export { GeometricAccent, GeometricField } from './GeometricAccent';
export type {
  GeometricAccentProps,
  GeometricAccentVariant,
  GeometricFieldProps,
} from './GeometricAccent';

export { KindBadge, StatusBadge, CustomerStatusBadge } from './StatusBadge';

export { PanelDrawer } from './PanelDrawer';
export type { PanelDrawerProps } from './PanelDrawer';
