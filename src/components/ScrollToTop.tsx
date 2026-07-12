import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const ScrollToTop = () => {
  const { pathname, hash } = useLocation();
  const navType = useNavigationType();

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

    // Only reset scroll to top if this is a new navigation (PUSH or REPLACE) and no hash is present.
    // If it's a back/forward action (POP), we let the browser handle scroll restoration natively.
    if (navType !== "POP") {
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
  }, [pathname, hash, navType]);

  return null;
};

export default ScrollToTop;
