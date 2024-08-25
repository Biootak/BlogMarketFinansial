import React from 'react';
import { auth } from '@/auth';
import Avatar from '@/components/Avatar/Avatar';
import NewPostButton from './NewPostButton';

export default async function WelcomeSectionContent() {
  const session = await auth();

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-6 text-white">
      <div className="relative z-10 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">خوش آمدید، {session?.user?.name}</h2>
          <p className="text-gray-200 mt-2">
            به داشبورد وبلاگ خود خوش آمدید. آماده نوشتن مطالب جدید هستید؟
          </p>
          <NewPostButton />
        </div>
        <Avatar
          imgUrl={session?.user?.image}
          userName={session?.user?.name}
          sizeClass="h-24 w-24"
          containerClassName="border-4 border-white"
        />
      </div>
    </div>
  );
}
