
import { FaTimes } from 'react-icons/fa';
import twFocusClass from '@/utils/twFocusClass';

export interface ButtonCloseProps {
  className?: string;
  onClick?: () => void;
  iconSize?: string;
}

const ButtonClose: React.FC<ButtonCloseProps> = ({
  className = '',
  onClick = () => {},
  iconSize = 'w-5 h-5',
}) => {
  return (
    <button
      type="button"
      className={`w-8 h-8 flex items-center justify-center rounded-full text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 ${className} ${twFocusClass()}`}
      onClick={onClick}
    >
      <span className="sr-only">Close</span>
      <FaTimes className={iconSize} />
    </button>
  );
};

export default ButtonClose;
