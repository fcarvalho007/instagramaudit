import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/app/app-layout";
import { ensureReportAssociation } from "@/lib/rpc/account.functions";
import { getLeadSessionState } from "@/lib/rpc/lead-session.functions";
import {
  SessionModeContext,
  type AppSessionMode,
} from "@/components/app/session-mode";

export const Route = createFileRoute("/app")({
  component: AppShell,
  head: () => ({
    meta: [{ name: "robots", content: "noindex" }],
  }),
});

export { useAppSessionMode, type AppSessionMode } from "@/components/app/session-mode";

function AppShell() {
  const [user, setUser] = useState<{
    email?: string;
    name?: string;
  } | null>(null);
  const [mode, setMode] = useState<AppSessionMode>("auth");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getUser().then(async ({ data }) => {
      if (cancelled) return;
      if (data.user) {
        setUser({
          email: data.user.email ?? undefined,
          name:
            data.user.user_metadata?.full_name ??
            data.user.user_metadata?.name ??
            undefined,
        });
        setMode("auth");
        setChecking(false);

        // Fire-and-forget: link any reports created since last login
        ensureReportAssociation().catch(() => {});
        return;
      }

      // Sem utilizador Supabase: aceitar sessão de lead verificada.
      try {
        const state = await getLeadSessionState();
        if (cancelled) return;
        if (state.hasLeadSession) {
          setUser({ email: state.email ?? undefined });
          setMode("lead");
          setChecking(false);
          return;
        }
      } catch {
        /* fail-closed abaixo */
      }
      window.location.href = "/";
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        window.location.href = "/login";
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-muted">
        <div className="size-6 animate-spin rounded-full border-2 border-border-default/30 border-t-content-secondary" />
      </div>
    );
  }

  return (
    <SessionModeContext.Provider value={mode}>
      <AppLayout userEmail={user?.email} userName={user?.name}>
        <Outlet />
      </AppLayout>
    </SessionModeContext.Provider>
  );
}
