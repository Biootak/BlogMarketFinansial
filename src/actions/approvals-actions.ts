'use server';

import {
  decideStep as _decideStep,
  cancelApproval as _cancelApproval,
} from '@/lib/approvals';

export async function decideStep(
  requestId: string,
  decision: 'approved' | 'rejected',
  comment?: string,
): Promise<{ success: boolean; message?: string }> {
  return _decideStep(requestId, decision, comment);
}

export async function cancelApproval(
  requestId: string,
): Promise<{ success: boolean; message?: string }> {
  return _cancelApproval(requestId);
}
