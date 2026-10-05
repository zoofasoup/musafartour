import { useCallback, useState } from "react";

const KEY = "admin-notification-muted-types";

/** Storage can be missing or throw (private window, blocked site data); the bell must work without it. */
const read = (): string[] => {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === "string") : [];
  } catch {
    return [];
  }
};

/** Which notification types this person has muted on this device. A convenience, not shared data. */
export function useNotificationPrefs() {
  const [muted, setMuted] = useState<Set<string>>(() => new Set(read()));

  const toggleMuted = useCallback((type: string) => {
    setMuted(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      try {
        localStorage.setItem(KEY, JSON.stringify([...next]));
      } catch {
        /* keep the in-memory choice for this visit */
      }
      return next;
    });
  }, []);

  return { muted, toggleMuted };
}
