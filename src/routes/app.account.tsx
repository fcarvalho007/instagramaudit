import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/account")({
  component: AccountPage,
  head: () => ({
    meta: [
      { title: "Conta — InstaBench" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function AccountPage() {
  const [email, setEmail] = useState<string | undefined>();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? undefined);
    });
  }, []);

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">
        Conta
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Gere os dados da tua conta.
      </p>

      <div className="mt-6 rounded-xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Email
            </label>
            <p className="mt-1 text-sm text-slate-700">{email ?? "—"}</p>
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Nome
            </label>
            <p className="mt-1 text-sm text-slate-400 italic">
              Ainda não definido
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
