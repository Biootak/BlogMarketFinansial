'use server';

import type { CreateTicketInput, TicketStatus } from '@/lib/tickets';
import {
  createTicket as _createTicket,
  updateTicketStatus as _updateTicketStatus,
  assignTicket as _assignTicket,
  replyToTicket as _replyToTicket,
} from '@/lib/tickets';

export async function createTicket(
  input: CreateTicketInput,
): Promise<{ success: boolean; id?: string; message?: string }> {
  return _createTicket(input);
}

export async function updateTicketStatus(
  id: string,
  status: TicketStatus,
): Promise<{ success: boolean; message?: string }> {
  return _updateTicketStatus(id, status);
}

export async function assignTicket(
  id: string,
  assigneeId: string | null,
): Promise<{ success: boolean; message?: string }> {
  return _assignTicket(id, assigneeId);
}

export async function replyToTicket(
  ticketId: string,
  body: string,
  isInternal?: boolean,
): Promise<{ success: boolean; message?: string }> {
  return _replyToTicket(ticketId, body, isInternal);
}
