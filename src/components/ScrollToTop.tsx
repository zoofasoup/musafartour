import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const resetScroll = () => {
      // Main window
      window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;

      // Any scrollable container (admin main, agent layout, scroll-area, etc.)
      document.querySelectorAll('[class*="overflow-auto"], [class*="overflow-y-auto"], [data-radix-scroll-area-viewport], main').forEach((el) => {
        el.scrollTop = 0;
      });
    };

    // Fire immediately + after paint to catch lazy-loaded content
    resetScroll();
    requestAnimationFrame(resetScroll);
  }, [pathname]);

  return null;
};

export default ScrollToTop;
