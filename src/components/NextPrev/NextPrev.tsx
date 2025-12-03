"use client";
import React, { type FC } from "react";
import { HiChevronLeft, HiChevronRight } from "react-icons/hi2";

export interface NextPrevProps {
  className?: string;
  btnClassName?: string;
  onClickNext?: () => void;
  onClickPrev?: () => void;
  onlyNext?: boolean;
  onlyPrev?: boolean;
}

const NextPrev: FC<NextPrevProps> = ({
  className = "",
  onClickNext = () => {},
  onClickPrev = () => {},
  btnClassName = "w-10 h-10",
  onlyNext = false,
  onlyPrev = false,
}) => {
  const [focus, setFocus] = React.useState<"left" | "right">("right");

  const baseButtonClass = `
    rounded-full flex items-center justify-center
    bg-white/20 backdrop-blur-md
    border border-white/30
    text-white
    shadow-lg
    hover:bg-white/30 hover:scale-110
    active:scale-95
    transition-all duration-200 ease-out
  `;

  return (
    <div className={`nc-NextPrev relative flex items-center gap-2 ${className}`}>
      {!onlyNext && (
        <button
          className={`${btnClassName} ${baseButtonClass} ${
            focus === "left" ? "ring-2 ring-white/50 scale-105" : ""
          }`}
          onClick={(e) => {
            e.preventDefault();
            onClickPrev();
          }}
          title="قبلی"
          aria-label="قبلی"
          onMouseEnter={() => setFocus("left")}
        >
          <HiChevronRight className="w-5 h-5" />
        </button>
      )}
      {!onlyPrev && (
        <button
          className={`${btnClassName} ${baseButtonClass} ${
            focus === "right" ? "ring-2 ring-white/50 scale-105" : ""
          }`}
          onClick={(e) => {
            e.preventDefault();
            onClickNext();
          }}
          title="بعدی"
          aria-label="بعدی"
          onMouseEnter={() => setFocus("right")}
        >
          <HiChevronLeft className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

export default NextPrev;
