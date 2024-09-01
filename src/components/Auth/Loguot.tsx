import { logout } from '@/actions/auth-actions';
import { IoExitOutline } from 'react-icons/io5';

const Logout = () => {
  return (
    <form action={logout} className="w-full">
      <button
        type="submit"
        className="flex items-center w-full p-2 transition duration-150 ease-in-out rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 focus:outline-none focus-visible:ring focus-visible:ring-orange-500 focus-visible:ring-opacity-50"
      >
        <IoExitOutline
          className="flex-shrink-0 w-6 h-6 text-neutral-500 dark:text-neutral-300"
          title="خروج"
        />
        <div className="ms-4">
          <p className="text-sm font-medium">خروج</p>
        </div>
      </button>
    </form>
  );
};

export default Logout;
