import type { FC } from 'react';
import Link from 'next/link';
import { FaTelegram, FaWhatsapp } from 'react-icons/fa';
import * as motion from 'framer-motion/client';

const ContactCTA: FC = () => {
  return (
    <section
      id="contact"
      className="bg-gradient-to-br from-white to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-2xl p-8 my-12 max-w-4xl mx-auto"
    >
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-4xl font-bold mb-6 text-center text-gray-800 dark:text-gray-100"
      >
        ارتباط با پشتیبانی
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-center text-gray-600 dark:text-gray-300 mb-8 text-lg"
      >
        برای ثبت سفارش و دریافت مشاوره رایگان، با کارشناسان ما در ارتباط باشید
      </motion.p>
      <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
        <ContactButton
          href="https://t.me/Financial_Market_telegram"
          icon={<FaTelegram className="ml-2" size={24} />}
          text="پشتیبانی تلگرام"
          bgColor="bg-blue-500 hover:bg-blue-600"
        />
        <ContactButton
          href="https://wa.me/1234567890"
          icon={<FaWhatsapp className="ml-2" size={24} />}
          text="پشتیبانی واتساپ"
          bgColor="bg-green-500 hover:bg-green-600"
        />
      </div>
    </section>
  );
};

interface ContactButtonProps {
  href: string;
  icon: React.ReactNode;
  text: string;
  bgColor: string;
}

const ContactButton: FC<ContactButtonProps> = ({ href, icon, text, bgColor }) => (
  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center ${bgColor} text-white px-6 py-3 rounded-full transition-colors duration-300 shadow-lg`}
    >
      {icon}
      <span className="ml-2">{text}</span>
    </Link>
  </motion.div>
);

export default ContactCTA;
