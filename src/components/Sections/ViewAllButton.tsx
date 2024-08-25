'use client';

import Button from '../Button/Button';
import { HiArrowRight } from 'react-icons/hi2';

const ViewAllButton: React.FC = () => {
  return (
    <Button
      className="!hidden md:!flex"
      pattern="white"
      sizeClass="px-6"
      onClick={() => {
        // اینجا می‌توانید منطق کلیک را اضافه کنید
        console.log('View all clicked');
      }}
    >
      <span>مشاهده همه</span>
      <HiArrowRight className="ms-3 w-6 h-6 rtl:rotate-180" />
    </Button>
  );
};

export default ViewAllButton;
