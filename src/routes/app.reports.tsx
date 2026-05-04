import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/reports")({
  component: ReportsPlaceholder,
  head: () => ({
    meta: [
      { title: "Os meus relatórios — InstaBench" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function ReportsPlaceholder() {
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        window.location.href = "/login";
      } else {
        setUser({ email: data.user.email ?? undefined });
        setChecking(false);
      }
    });
  }, []);

  if (checking) return null;

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-content-primary">
        Os meus relatórios
      </h1>
      <p className="mt-2 text-sm text-content-secondary">
        {user?.email ? `Sessão ativa: ${user.email}` : ""}
      </p>
      <p className="mt-4 text-sm text-content-tertiary">
        Esta secção será desenvolvida em breve.
      </p>
    </div>
  );
}
