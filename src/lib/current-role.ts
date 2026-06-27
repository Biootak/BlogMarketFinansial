import { auth } from '@/auth';

export default async function getCurrentUser() {
  const session = await auth();
  return session?.user.role;
}
