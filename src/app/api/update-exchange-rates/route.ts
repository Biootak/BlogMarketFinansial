import type { NextApiRequest, NextApiResponse } from 'next';
import { updateExchangeRates } from '@/actions/updateExchangeRates';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      await updateExchangeRates();
      res.status(200).json({ success: true, message: 'نرخ‌های ارز با موفقیت به‌روزرسانی شدند' });
    } catch (error) {
      console.error('خطا در به‌روزرسانی نرخ‌های ارز:', error);
      res.status(500).json({ success: false, message: 'به‌روزرسانی نرخ‌های ارز با شکست مواجه شد' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`متد ${req.method} مجاز نیست`);
  }
}
