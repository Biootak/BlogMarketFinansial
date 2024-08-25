import React, { type FC } from 'react';
import Image from 'next/image';
import ButtonCircle from '@/components/Button/ButtonCircle';
import rightImg from '@/images/SVG-subcribe2.png';
import Badge from '@/components/Badge/Badge';
import Input from '@/components/Input/Input';
import { HiArrowRight } from 'react-icons/hi2';

export interface SectionSubscribe2Props {
  className?: string;
}

const SectionSubscribe2: FC<SectionSubscribe2Props> = ({ className = '' }) => {
  return (
    <div
      className={`nc-SectionSubscribe2 relative flex flex-col lg:flex-row items-center ${className}`}
      dir="rtl"
    >
      <div className="flex-shrink-0 mb-14 lg:mb-0 lg:ml-10 lg:w-2/5">
        <h2 className="font-semibold text-4xl">به خبرنامه ما بپیوندید 🎉</h2>
        <span className="block mt-6 text-neutral-500 dark:text-neutral-400">
          درباره هر موضوعی بخوانید و دیدگاه‌های جدید را به اشتراک بگذارید. همه خوش آمدند.
        </span>
        <ul className="space-y-5 mt-10">
          <li className="flex items-center space-x-4 space-x-reverse">
            <Badge name="۰۱" />
            <span className="font-medium text-neutral-700 dark:text-neutral-300">
              تخفیف بیشتری دریافت کنید
            </span>
          </li>
          <li className="flex items-center space-x-4 space-x-reverse">
            <Badge color="red" name="۰۲" />
            <span className="font-medium text-neutral-700 dark:text-neutral-300">
              مجلات ویژه دریافت کنید
            </span>
          </li>
        </ul>
        <form className="mt-10 relative max-w-sm">
          <Input required aria-required placeholder="ایمیل خود را وارد کنید" type="email" />
          <ButtonCircle
            type="submit"
            className="absolute transform top-1/2 -translate-y-1/2 left-1 dark:bg-neutral-300 dark:text-black"
          >
            <HiArrowRight className="w-5 h-5 rotate-180" />
          </ButtonCircle>
        </form>
      </div>
      <div className="flex-grow">
        <Image
          alt="تصویر اشتراک"
          sizes="(max-width: 768px) 100vw, 50vw"
          src={rightImg}
          width={710}
          height={510}
        />
      </div>
    </div>
  );
};

export default SectionSubscribe2;
