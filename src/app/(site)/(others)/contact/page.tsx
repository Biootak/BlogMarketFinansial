import React from 'react';
import ButtonPrimary from '@/components/Button/ButtonPrimary';
import Input from '@/components/Input/Input';
import Label from '@/components/Label/Label';
import SocialLinks from '@/components/SocialsList/SocialLinks';
import Textarea from '@/components/Textarea/Textarea';
import Heading2 from '@/components/Heading/Heading2';

// Define info outside the component to avoid recalculating on each render
const info = [
  {
    title: ' آدرس',
    desc: 'تهران ',
  },
  {
    title: ' ایمیل',
    desc: 'support@financialmarket.com',
  },
  {
    title: ' موبایل',
    desc: '۰۹۳۸۰۹۲۹۶۰۶',
  },
];

const PageContact = () => {
  return (
    <div className="rtl @container/contact">
      <header className="text-center max-w-2xl mx-auto mb-8 sm:mb-10 @md/contact:mb-12 @xl/contact:mb-24 @container/contact">
        <Heading2>تماس با ما</Heading2>
        <span className="block text-sm mt-2 text-neutral-700 sm:text-base dark:text-neutral-200">
          پیام خود را برای ما ارسال کنید، ما با شما تماس خواهیم گرفت.
        </span>
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="max-w-sm space-y-6">
          {info.map((item) => (
            <div key={item.title}>
              {/* Use a unique and stable key for better performance */}
              <h3 className="uppercase font-semibold text-sm dark:text-neutral-200 tracking-wider">
                {item.title}
              </h3>
              <span className="block mt-2 text-neutral-500 dark:text-neutral-400">{item.desc}</span>
            </div>
          ))}
          <div>
            <h3 className="uppercase font-semibold text-sm dark:text-neutral-200 tracking-wider">
              شبکه‌های اجتماعی
            </h3>
            <SocialLinks className="mt-2" />
          </div>
        </div>
        <div className="border border-neutral-100 dark:border-neutral-700 lg:hidden" />
        <div>
          {/* Remove unnecessary action and method attributes from the form */}
          <form className="grid grid-cols-1 gap-6">
            <label className="block">
              <Label>نام کامل</Label>
              <Input placeholder="نام خود را وارد کنید" className="mt-1" />
            </label>
            <label className="block">
              <Label>آدرس ایمیل</Label>
              <Input type="email" placeholder="ایمیل خود را وارد کنید" className="mt-1" />
            </label>
            <label className="block">
              <Label>پیام</Label>
              <Textarea className="mt-1" rows={6} />
            </label>
            <ButtonPrimary type="submit">ارسال پیام</ButtonPrimary>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PageContact;
