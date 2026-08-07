import { apiSnapshot } from '@/lib/api/response';
import { getJobSnapshot } from '@/lib/jobs';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  return apiSnapshot(getJobSnapshot);
}
