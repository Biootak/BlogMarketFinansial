'use server';

import {
  cancelApproval as _cancelApproval,
  createApproval as _createApproval,
  decideStep as _decideStep,
  getApprovalById as _getApprovalById,
} from '@/lib/approvals';
import type { CreateApprovalInput } from '@/lib/approvals';

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

export async function createApproval(
  input: CreateApprovalInput,
): Promise<{ success: boolean; id?: string; message?: string }> {
  return _createApproval(input);
}

export async function getApprovalById(
  id: string,
): Promise<{ success: boolean; data?: import('@/lib/approvals').ApprovalSummary; message?: string }> {
  return _getApprovalById(id);
}
