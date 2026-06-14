import React, { type FC } from "react";
import Badge from "@/components/Badge/Badge";
import Link from "next/link";
import Image from "next/image";
import type { TaxonomyType, TwMainColor } from "@/types/types";
import { heading, text, radius } from "@/lib/design-tokens";

export interface CardCategory4Props {
  className?: string;
  taxonomy: TaxonomyType;
  index?: string;
}

const CardCategory4: FC<CardCategory4Props> = ({
  className = "",
  taxonomy,
  index,
}) => {
  const { count, name, thumbnail, color } = taxonomy;
  const getColorClass = () => {
    switch (color) {
      case "pink": return "bg-pink-500";
      case "red": return "bg-red-500";
      case "gray": return "bg-gray-500";
      case "green": return "bg-green-500";
      case "purple": return "bg-purple-500";
      case "indigo": return "bg-indigo-500";
      case "yellow": return "bg-yellow-500";
      case "blue": return "bg-blue-500";
      default: return "bg-pink-500";
    }
  };

  return (
    <Link href={`/archive/category/${name}`} className={`nc-CardCategory4 flex flex-col ${className}`}>
      <div className={`flex-shrink-0 relative w-full aspect-[7/5] ${radius.lg} overflow-hidden group`}>
        <Image
          alt={name}
          fill
          src={thumbnail || '/images/placeholder-small.png'}
          className="object-cover w-full h-full rounded-2xl"
          sizes="(min-width: 1024px) 20rem, (min-width: 640px) 16rem, 12rem"
        />
        <div>
          {index && (
            <Badge
              color={color as TwMainColor}
              name={index}
              className="absolute top-3 start-3"
            />
          )}
        </div>
        <span className="opacity-0 group-hover:opacity-100 absolute inset-0 bg-black bg-opacity-10 transition-opacity" />
      </div>

      <div className="flex items-center mt-3">
        <div className={`w-8 h-8 ${getColorClass()} rounded-full`} />
        <div className="ms-3">
          <h2 className={heading.h4}>{name}</h2>
          <span className={['block', text.bodySm].join(' ')}>
            {count} Articles
          </span>
        </div>
      </div>
    </Link>
  );
};

export default CardCategory4;
