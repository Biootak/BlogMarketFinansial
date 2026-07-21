'use client';

import { HiArrowRight } from 'react-icons/hi2';
import Button from '../Button/Button';

const ViewAllButton: React.FC = () => {
  return (
    <Button className="!hidden md:!flex" pattern="white" sizeClass="px-6">
      <span>مشاهده همه</span>
      <HiArrowRight className="ms-3 w-6 h-6 rtl:rotate-180" />
    </Button>
  );
};

export default ViewAllButton;
