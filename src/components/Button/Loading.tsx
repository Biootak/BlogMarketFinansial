import type React from 'react';
import { Loader, Loader2 } from 'lucide-react';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'neutral';
  type?: 'circle' | 'dots' | 'spinner';
  className?: string;
}

const Loading: React.FC<LoadingProps> = ({
  size = 'md',
  variant = 'primary',
  type = 'circle',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  const variantClasses = {
    primary: 'text-primary-600 dark:text-primary-400',
    secondary: 'text-secondary-600 dark:text-secondary-400',
    neutral: 'text-neutral-600 dark:text-neutral-400',
  };

  const LoadingIcon = () => {
    const combinedClasses = `animate-spin ${sizeClasses[size]} ${variantClasses[variant]} ${className}`;

    switch (type) {
      case 'dots':
        return <Loader className={combinedClasses} />;
      case 'spinner':
        return <Loader2 className={combinedClasses} />;
      default:
        return <Loader2 className={combinedClasses} />;
    }
  };

  return <LoadingIcon />;
};

export default Loading;
