import type React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface ArchiveFilterListBoxProps {
  className?: string;
  lists: { name: string }[];
  selected: { name: string };
  onChange: (selected: { name: string }) => void;
}

const ArchiveFilterListBox: React.FC<ArchiveFilterListBoxProps> = ({
  className = '',
  lists,
  selected,
  onChange,
}) => {
  return (
    <div className={`nc-ArchiveFilterListBox flex-shrink-0 ${className}`}>
      <Select
        dir="rtl"
        onValueChange={(value) => onChange({ name: value })}
        defaultValue={selected.name}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="انتخاب فیلتر" />
        </SelectTrigger>
        <SelectContent>
          {lists.map((item, index) => (
            <SelectItem key={index} value={item.name}>
              {item.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ArchiveFilterListBox;
