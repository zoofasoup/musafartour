import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Main window
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    // Admin/Agent scrollable main content areas
    const scrollableContainers = document.querySelectorAll(
      'main[class*="overflow-auto"], [class*="overflow-auto"], [class*="overflow-y-auto"]'
    );
    scrollableContainers.forEach((el) => {
      el.scrollTop = 0;
    });
  }, [pathname]);

  return null;
};

export default ScrollToTop;
