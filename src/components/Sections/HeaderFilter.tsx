'use client';

import type React from 'react';
import { useState } from 'react';
import Heading from '@/components/Heading/Heading';
import Nav from '@/components/Nav/Nav';
import NavItem from '@/components/NavItem/NavItem';
import Button from '../Button/Button';
import { HiArrowRight } from 'react-icons/hi2';
import type { TaxonomyType, PostWithRelations } from '@/types/types';

export interface HeaderFilterProps {
  categories: TaxonomyType[] | undefined;
  heading: string;
  getFilteredPosts: (count: number, category?: string) => Promise<PostWithRelations[]>;
}

const HeaderFilter: React.FC<HeaderFilterProps> = ({
  categories = [],
  heading = '🎈 آخرین مقالات',
  getFilteredPosts,
}) => {
  const [tabActive, setTabActive] = useState<string>('همه');

  const handleClickTab = async (item: string) => {
    if (item === tabActive) {
      return;
    }
    setTabActive(item);
    await getFilteredPosts(8, item === 'همه' ? undefined : item);
  };

  return (
    <div className="flex flex-col mb-8 relative">
      <Heading>{heading}</Heading>
      <div className="flex justify-between">
        <Nav
          className="sm:space-x-2 rtl:space-x-reverse"
          containerClassName="relative flex w-full overflow-x-auto text-sm md:text-base"
        >
          <NavItem key="all" isActive={tabActive === 'همه'} onClick={() => handleClickTab('همه')}>
            همه
          </NavItem>
          {categories.map((category) => (
            <NavItem
              key={category.id}
              isActive={tabActive === category.name}
              onClick={() => handleClickTab(category.name)}
            >
              {category.name}
            </NavItem>
          ))}
        </Nav>
        <Button className="!hidden md:!flex" pattern="white" sizeClass="px-6">
          <span>مشاهده همه</span>
          <HiArrowRight className="ms-3 w-6 h-6 rtl:rotate-180" />
        </Button>
      </div>
    </div>
  );
};

export default HeaderFilter;
