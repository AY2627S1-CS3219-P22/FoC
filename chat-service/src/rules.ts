// AI-assisted (Claude), reviewed and tested by Maliha
// When a chat can be read or written, from the order's state
import type { Order } from './orders';

export const endedAt = (o: Order) => o.deliveredAt ?? o.cancelledAt;

const SEND_WINDOW_MS = 10 * 60_000; // F10.4.2: can still send for 10 min after it ends
export const KEEP_MS = 60 * 60_000; // F10.4.1: chat deleted 1 h after it ends

// Chat opens once a courier accepts. After the errand ends it's read-only
// for a bit, then gone.
export function chatAccess(o: Order, now = Date.now()) {
  if (!o.courierId) return { canRead: false, canSend: false };
  const end = endedAt(o);
  if (!end) return { canRead: true, canSend: true };
  const since = now - new Date(end).getTime();
  return { canRead: since < KEEP_MS, canSend: since < SEND_WINDOW_MS };
}