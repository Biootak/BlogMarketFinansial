import type { PostWithRelations, Role } from '@/types/types';
import { type ClassValue, clsx } from 'clsx';
import type { Session } from 'next-auth';
import { twMerge } from 'tailwind-merge';
import { auth } from '../auth';
import { redirect } from 'next/navigation';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const toPersianNumber = (num: number | string): string => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num.toString().replace(/\d/g, (x) => persianDigits[Number.parseInt(x)]);
};

export function isBookmarked(post: PostWithRelations, session: Session | null) {
  if (!session?.user?.id || !post.savedBy) return false;
  return post.savedBy.some((save) => save.userId === session.user.id);
}
export function generateColor(str: string): string {
  const colors = ['pink', 'green', 'blue', 'indigo', 'purple'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  hash = Math.abs(hash);
  return colors[hash % colors.length];
}

export function getInitials(name: string | null): string {
  return name ? name.charAt(0).toUpperCase() : '';
}

export async function checkRole(requiredRoles: Role[]) {
  const session = await auth();
  if (!session || !requiredRoles.includes(session.user.role as Role)) {
    redirect('/unauthorized');
  }
  return session;
}
