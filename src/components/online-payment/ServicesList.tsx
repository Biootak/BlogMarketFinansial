import type { FC } from 'react';
import * as motion from 'framer-motion/client';
import {
  HiCheckCircle,
  HiGlobe,
  HiCreditCard,
  HiAcademicCap,
  HiCash,
  HiShoppingCart,
} from 'react-icons/hi';

const services = [
  {
    icon: HiGlobe,
    title: 'حواله‌های بین‌المللی',
    description: 'انتقال سریع و امن پول برای افراد و شرکت‌ها',
  },
  {
    icon: HiCreditCard,
    title: 'پرداخت‌های آنلاین',
    description: 'خرید آسان از سایت‌های معتبر جهانی',
  },
  {
    icon: HiAcademicCap,
    title: 'خدمات آموزشی',
    description: 'پرداخت شهریه و هزینه‌های ثبت‌نام دانشگاهی',
  },
  {
    icon: HiCash,
    title: 'نقد کردن درآمد',
    description: 'دریافت درآمد از پلتفرم‌های فریلنسری بین‌المللی',
  },
  {
    icon: HiShoppingCart,
    title: 'خرید نرم‌افزار',
    description: 'تهیه اشتراک و لایسنس برنامه‌های خارجی',
  },
  { icon: HiCheckCircle, title: 'خدمات ویژه', description: 'راه‌حل‌های سفارشی برای نیازهای خاص شما' },
];

const ServicesList: FC = () => {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-indigo-100 to-purple-100 dark:from-gray-900 dark:via-indigo-900 dark:to-purple-900">
      <div className="max-w-7xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-5xl font-extrabold text-center text-gray-900 dark:text-white mb-20 relative"
        >
          خدمات پرداخت بین‌المللی ما
          <span className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-32 h-1.5 bg-gradient-to-r from-blue-500 to-purple-500" />
        </motion.h2>
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {services.map((service, index) => (
            <motion.li
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group"
            >
              <div className="p-8">
                <service.icon className="h-12 w-12 text-blue-500 group-hover:text-purple-500 transition-colors duration-300 mb-6" />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                  {service.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">{service.description}</p>
              </div>
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-1 w-0 group-hover:w-full transition-all duration-300" />
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default ServicesList;
