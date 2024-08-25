import React, { type FC, memo } from "react";
import { type SocialType, SOCIALS_DATA } from "@/components/SocialsShare/SocialsShare";

export interface SocialsListProps {
  className?: string;
  itemClass?: string;
  socials?: SocialType[];
}

export const SOCIALS_2 = SOCIALS_DATA;

const SocialsList: FC<SocialsListProps> = memo(({
  className = "",
  itemClass = "block",
  socials = SOCIALS_2,
}) => {
  return (
    <nav
      className={`nc-SocialsList flex space-x-3 text-2xl text-neutral-6000 dark:text-neutral-300 ${className}`}
    >
      {socials.map((item, i) => (
        <a
          key={i}
          className={`${itemClass}`}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          title={item.name}
        >
          {typeof item.icon === 'string' ? (
            <span dangerouslySetInnerHTML={{ __html: item.icon }} />
          ) : (
            item.icon
          )}
        </a>
      ))}
    </nav>
  );
});

SocialsList.displayName = 'SocialsList';

export default SocialsList;