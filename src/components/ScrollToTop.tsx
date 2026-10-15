import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

// Scroll positions by history entry. The browser's own restoration is switched off: with smooth scrolling on the page
// it animated the old page to the saved offset before the route swapped, which looked like a pointless scroll.
const positions = new Map<string, number>();

const ScrollToTop = () => {
  const { pathname, hash, key } = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  }, []);

  // Remember where this entry was scrolled to, so back/forward can return to it.
  useEffect(() => {
    let raf = 0;
    const save = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => positions.set(key, window.scrollY));
    };
    window.addEventListener("scroll", save, { passive: true });
    return () => {
      window.removeEventListener("scroll", save);
      cancelAnimationFrame(raf);
    };
  }, [key]);

  useEffect(() => {
    // If there's a hash in the URL, scroll to that specific element
    if (hash) {
      const id = hash.replace('#', '');
      const scrollToHash = () => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: "instant", block: "start" });
        }
      };
      // Try immediately and also after a short delay for lazy-loaded components
      requestAnimationFrame(scrollToHash);
      setTimeout(scrollToHash, 100);
      return;
    }

    // Back/forward: jump (no animation) to the saved offset, retrying briefly while lazy content makes the page tall enough.
    if (navType === "POP") {
      const target = positions.get(key) ?? 0;
      let tries = 0;
      const restore = () => {
        window.scrollTo({ top: target, left: 0, behavior: "instant" as ScrollBehavior });
        if (Math.abs(window.scrollY - target) > 2 && tries++ < 30) requestAnimationFrame(restore);
      };
      restore();
      return;
    }

    // New navigation (PUSH or REPLACE) without a hash: start at the top.
    {
      const resetScroll = () => {
        // Main window
        window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;

        // Any scrollable container
        document.querySelectorAll('[class*="overflow-auto"], [class*="overflow-y-auto"], [data-radix-scroll-area-viewport], main').forEach((el) => {
          el.scrollTop = 0;
        });
      };

      // Fire immediately + after paint to catch lazy-loaded content
      resetScroll();
      requestAnimationFrame(resetScroll);
    }
  }, [pathname, hash, navType, key]);

  return null;
};

export default ScrollToTop;
