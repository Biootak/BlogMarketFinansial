import { auth } from '@/auth';
import { serverLog } from '@/lib/server-logger';
import type { NextApiRequest, NextApiResponse } from 'next';

type Notification = {
  id: number;
  name: string;
  description: string;
  time: string;
  href: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Notification[] | { error: string }>,
) {
  const session = await auth(req, res);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // اینجا می‌توانید نوتیفیکیشن‌ها را از دیتابیس دریافت کنید
    const notifications: Notification[] = [
      {
        id: 1,
        name: 'System',
        description: 'Welcome to your account!',
        time: 'Just now',
        href: '##',
      },
      // سایر نوتیفیکیشن‌ها
    ];

    res.status(200).json(notifications);
  } catch (error) {
    serverLog.error('notifications', 'fetch', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
