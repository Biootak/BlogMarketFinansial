import { FaExchangeAlt, FaShieldAlt, FaClock } from 'react-icons/fa';

const infoCards = [
  {
    icon: <FaExchangeAlt className="text-4xl text-blue-500" />,
    title: 'نرخ‌های رقابتی',
    description: 'بهترین نرخ‌های ارز در بازار را به شما ارائه می‌دهیم.',
  },
  {
    icon: <FaShieldAlt className="text-4xl text-green-500" />,
    title: 'امنیت بالا',
    description: 'انتقال ایمن و مطمئن ارز با پیشرفته‌ترین سیستم‌های امنیتی.',
  },
  {
    icon: <FaClock className="text-4xl text-purple-500" />,
    title: 'سرعت بالا',
    description: 'انتقال سریع ارز در کمترین زمان ممکن.',
  },
];

export default function InfoCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 ">
      {infoCards.map((card, index) => (
        <div
          key={index}
          className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2"
        >
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 bg-gray-100 dark:bg-gray-700 p-4 rounded-full">{card.icon}</div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-3">
              {card.title}
            </h3>
            <p className="text-gray-600 dark:text-gray-300">{card.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
