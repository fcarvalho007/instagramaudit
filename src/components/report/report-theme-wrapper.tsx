import { useEffect } from "react";

interface ReportThemeWrapperProps {
  children: React.ReactNode;
}

/**
 * Mounts data-theme="light" on <body> while children are mounted,
 * isolating the light "Clean Analytical" palette to this route only.
 * On unmount (navigation away), restores the dark default.
 */
export function ReportThemeWrapper({ children }: ReportThemeWrapperProps) {
  useEffect(() => {
    const previous = document.body.getAttribute("data-theme");
    document.body.setAttribute("data-theme", "light");
    return () => {
      if (previous) {
        document.body.setAttribute("data-theme", previous);
      } else {
        document.body.removeAttribute("data-theme");
      }
    };
  }, []);

  return <>{children}</>;
}
