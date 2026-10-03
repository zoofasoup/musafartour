/**
 * Collapses a flat notification feed into groups so a burst (an agent registering 20 jamaah,
 * an import touching many rows) shows as one row instead of 20.
 * One group = same `type` on the same calendar day. A group of one renders as a plain item.
 */

export interface NotificationLike {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  action_url: string | null;
  created_at: string;
}

export interface NotificationGroup<T extends NotificationLike = NotificationLike> {
  key: string;
  type: string;
  items: T[]; // newest first
  unread: number;
  latest: string; // created_at of the newest item
  actionUrl: string | null; // shared target, or null when members point to different places
}

export type DayBucket = "today" | "yesterday" | "earlier";

const dayKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

export const dayBucket = (iso: string, now: Date = new Date()): DayBucket => {
  const k = dayKey(iso);
  if (k === dayKey(now.toISOString())) return "today";
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  return k === dayKey(y.toISOString()) ? "yesterday" : "earlier";
};

export const groupNotifications = <T extends NotificationLike>(list: T[]): NotificationGroup<T>[] => {
  const sorted = [...list].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const groups = new Map<string, NotificationGroup<T>>();
  for (const n of sorted) {
    const key = `${n.type}|${dayKey(n.created_at)}`;
    const g = groups.get(key);
    if (!g) {
      groups.set(key, {
        key,
        type: n.type,
        items: [n],
        unread: n.is_read ? 0 : 1,
        latest: n.created_at,
        actionUrl: n.action_url,
      });
    } else {
      g.items.push(n);
      if (!n.is_read) g.unread++;
      if (g.actionUrl !== n.action_url) g.actionUrl = null;
    }
  }
  // Map keeps insertion order = order of each group's newest item.
  return [...groups.values()];
};

/** "Ahmad (3 orang), Siti (2 orang) +10 lainnya": a glance at who is inside a group. */
export const groupPreview = (items: NotificationLike[], titlePrefix = "", shown = 2) => {
  const names = items.slice(0, shown).map(i => i.title.replace(titlePrefix, "").trim());
  const rest = items.length - names.length;
  return rest > 0 ? `${names.join(", ")} +${rest} lainnya` : names.join(", ");
};

export const bucketGroups = <T extends NotificationLike>(groups: NotificationGroup<T>[], now: Date = new Date()) => {
  const out: Record<DayBucket, NotificationGroup<T>[]> = { today: [], yesterday: [], earlier: [] };
  for (const g of groups) out[dayBucket(g.latest, now)].push(g);
  return out;
};
