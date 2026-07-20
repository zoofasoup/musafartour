import { useEffect, useState } from "react";

const STORAGE_PREFIX = "tour_seen_";

/** First-visit product tour trigger - shows once per browser, like a first-launch app walkthrough. */
export function useProductTour(tourId: string, ready = true, delayMs = 700) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (localStorage.getItem(STORAGE_PREFIX + tourId)) return;
    const t = setTimeout(() => setActive(true), delayMs);
    return () => clearTimeout(t);
  }, [tourId, ready, delayMs]);

  const finish = () => {
    localStorage.setItem(STORAGE_PREFIX + tourId, "1");
    setActive(false);
  };

  return { active, finish };
}
