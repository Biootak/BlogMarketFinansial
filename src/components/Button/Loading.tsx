import type React from "react";
import { ImSpinner2 } from "react-icons/im";
import { CgSpinner } from "react-icons/cg";
import { AiOutlineLoading3Quarters } from "react-icons/ai";

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'neutral';
  type?: 'circle' | 'dots' | 'spinner';
}

const Loading: React.FC<LoadingProps> = ({ 
  size = 'md', 
  variant = 'primary',
  type = 'circle'
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  const variantClasses = {
    primary: 'text-primary-600 dark:text-primary-400',
    secondary: 'text-secondary-600 dark:text-secondary-400',
    neutral: 'text-neutral-600 dark:text-neutral-400'
  };

  const LoadingIcon = () => {
    switch(type) {
      case 'dots':
        return <CgSpinner className={`animate-spin ${sizeClasses[size]} ${variantClasses[variant]}`} />;
      case 'spinner':
        return <AiOutlineLoading3Quarters className={`animate-spin ${sizeClasses[size]} ${variantClasses[variant]}`} />;
      default:
        return <ImSpinner2 className={`animate-spin ${sizeClasses[size]} ${variantClasses[variant]}`} />;
    }
  };

  return <LoadingIcon />;
};

export default Loading;