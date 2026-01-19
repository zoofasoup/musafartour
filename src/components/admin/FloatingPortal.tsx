import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

type FloatingPortalProps = {
  children: ReactNode;
};

/**
 * Renders children into document.body so `position: fixed` is not affected by
 * any parent stacking context/overflow/transform.
 */
export function FloatingPortal({ children }: FloatingPortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return createPortal(children, document.body);
}
