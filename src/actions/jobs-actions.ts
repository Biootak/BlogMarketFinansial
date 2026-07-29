'use server';

import {
  cancelJob as _cancelJob,
  retryJob as _retryJob,
} from '@/lib/jobs';

export async function cancelJob(
  id: string,
): Promise<{ success: boolean; message?: string }> {
  return _cancelJob(id);
}

export async function retryJob(
  id: string,
): Promise<{ success: boolean; message?: string }> {
  return _retryJob(id);
}
