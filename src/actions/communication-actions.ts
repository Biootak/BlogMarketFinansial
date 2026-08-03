'use server';

import type { CreateAnnouncementInput } from '@/lib/communication';
import {
  archiveAnnouncement as _archiveAnnouncement,
  createAnnouncement as _createAnnouncement,
  publishAnnouncement as _publishAnnouncement,
} from '@/lib/communication';

export async function createAnnouncement(
  input: CreateAnnouncementInput,
): Promise<{ success: boolean; id?: string; message?: string }> {
  return _createAnnouncement(input);
}

export async function publishAnnouncement(
  id: string,
): Promise<{ success: boolean; message?: string }> {
  return _publishAnnouncement(id);
}

export async function archiveAnnouncement(
  id: string,
): Promise<{ success: boolean; message?: string }> {
  return _archiveAnnouncement(id);
}
