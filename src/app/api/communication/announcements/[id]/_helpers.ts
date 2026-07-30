/**
 * Shared helpers for the announcement sub-routes.
 * `parseChannelsFromBody` is local because the row is a raw Prisma row with
 * a `channels` string column; `UpdateAnnouncementInput` lives in
 * `@/lib/communication` and is the canonical type used by the server action.
 */
import type { Channel } from '@/lib/communication';

export type { Channel };

export const parseChannelsFromBody = (row: { channels: string }): Channel[] => {
  return row.channels
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is Channel => ['inapp', 'email', 'push', 'sms'].includes(s));
};
