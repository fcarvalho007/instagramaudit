/**
 * Alias route: `/admin-report-lab/full-preview/:handle` →
 * `/admin/report-preview/:handle?variant=internal_lab`.
 *
 * Provides the canonical URL shape used in internal docs while
 * delegating to the existing admin preview page (which already enforces
 * the admin gate and renders every block, including lab-only ones).
 */

import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/admin-report-lab/full-preview/$handle")({
  component: AliasRedirect,
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
});

function AliasRedirect() {
  const { handle } = Route.useParams();
  return (
    <Navigate
      to="/admin_/report-preview/$username"
      params={{ username: handle }}
      search={{ variant: "internal_lab", draft: false }}
      replace
    />
  );
}