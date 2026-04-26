import { useEffect } from "react";
import { ScriptOnce } from "@tanstack/react-router";

interface ReportThemeWrapperProps {
  children: React.ReactNode;
}

/**
 * Forces data-theme="light" on <body> for the report route, with no
 * dark→light flicker on first paint.
 *
 * Strategy:
 *  - <ScriptOnce> runs synchronously before React hydrates, so SPA navigations
 *    into this route apply the light palette before the first paint.
 *  - The route's own head() injects the same one-liner so hard reloads also
 *    flip the body before any paint.
 *  - On unmount we restore the previous data-theme (or remove it) so leaving
 *    the route returns to the global dark default.
 */
export function ReportThemeWrapper({ children }: ReportThemeWrapperProps) {
  useEffect(() => {
    // Capture the value present BEFORE our pre-hydration script ran. If the
    // body already has data-theme="light" we still treat it as "no previous"
    // so leaving the route restores the dark default.
    const current = document.body.getAttribute("data-theme");
    const previous = current === "light" ? null : current;
    if (current !== "light") {
      document.body.setAttribute("data-theme", "light");
    }
    return () => {
      if (previous) {
        document.body.setAttribute("data-theme", previous);
      } else {
        document.body.removeAttribute("data-theme");
      }
    };
  }, []);

  return (
    <>
      <ScriptOnce>
        {`document.body.setAttribute("data-theme","light")`}
      </ScriptOnce>
      {children}
    </>
  );
}
