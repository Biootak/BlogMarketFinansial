import React, { type FC, type ReactNode } from "react";

export interface NavItemProps {
  className?: string;
  radius?: string;
  onClick?: () => void;
  isActive?: boolean;
  renderX?: ReactNode;
  children?: ReactNode;
}

const NavItem: FC<NavItemProps> = ({
  className = "px-5 py-2.5 text-sm sm:text-base sm:px-6 sm:py-3 capitalize",
  radius = "rounded-full",
  children,
  onClick = () => {},
  isActive = false,
  renderX,
}) => {
  return (
    <li className="nc-NavItem relative flex-shrink-0">
      {renderX && renderX}
      <button
        className={`flex items-center justify-center font-medium transition-all duration-200 ${className} ${radius} ${
          isActive
            ? "bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600"
            : "text-neutral-600 hover:text-primary-700 hover:bg-primary-50/60 dark:text-neutral-300 dark:hover:text-primary-300 dark:hover:bg-primary-900/30"
        } `}
        onClick={onClick}
      >
        {children}
      </button>
    </li>
  );
};

export default NavItem;
