import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/app/app-layout";
import { ensureReportAssociation } from "@/server/account.functions";

export const Route = createFileRoute("/app")({
  component: AppShell,
  head: () => ({
    meta: [{ name: "robots", content: "noindex" }],
  }),
});

function AppShell() {
  const [user, setUser] = useState<{
    email?: string;
    name?: string;
  } | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        window.location.href = "/login";
      } else {
        setUser({
          email: data.user.email ?? undefined,
          name:
            data.user.user_metadata?.full_name ??
            data.user.user_metadata?.name ??
            undefined,
        });
        setChecking(false);

        // Fire-and-forget: link any reports created since last login
        ensureReportAssociation().catch(() => {});
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        window.location.href = "/login";
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F0F4FA]">
        <div className="size-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
      </div>
    );
  }

  return (
    <AppLayout userEmail={user?.email} userName={user?.name}>
      <Outlet />
    </AppLayout>
  );
}
