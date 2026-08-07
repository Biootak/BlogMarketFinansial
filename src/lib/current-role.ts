import { auth } from '@/auth';

export default async function getCurrentUserRole() {
  const session = await auth();
  return session?.user?.role;
}
