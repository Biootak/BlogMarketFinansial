import type React from 'react';
import { HiOutlinePencilSquare } from 'react-icons/hi2';

interface DraftPostCardProps {
  title: string;
  date: string;
}

const DraftPostCard: React.FC<DraftPostCardProps> = ({ title, date }) => (
  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 mb-2">
    <h4 className="font-semibold mb-2 dark:text-white">{title}</h4>
    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
      <HiOutlinePencilSquare className="w-4 h-4 mr-1" />
      <span>{date}</span>
    </div>
  </div>
);

export default DraftPostCard;
