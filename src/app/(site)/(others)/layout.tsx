import SectionSubscribe2 from "@/components/SectionSubscribe2/SectionSubscribe2";
import type { ReactNode } from "react";
import s from "./others.module.css";

/**
 * Layout for /contact, /subscription, /terms etc.
 * Fixed: no hardcoded left/right, no bg-primary-100 inline class.
 * Uses logical properties + tokens only.
 */
const LayoutPage = ({ children }: { children: ReactNode }) => {
  return (
    <div className={s.shell}>
      <div className={s.topBand} aria-hidden />
      <div className={s.container}>
        <div className={s.card}>{children}</div>
      </div>
      <div className={s.subscribe}>
        <SectionSubscribe2 />
      </div>
    </div>
  );
};

export default LayoutPage;
