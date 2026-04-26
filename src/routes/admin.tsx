/**
 * /admin — operational admin v1.
 *
 * Acesso via Google Sign-in (Lovable Cloud) com allowlist de emails
 * (ADMIN_ALLOWED_EMAILS). Quem entrar com email não autorizado vê
 * "Acesso restrito" e a sessão Supabase é terminada automaticamente.
 *
 * Self-contained layout (no public Header/Footer).
 */

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { AdminGate } from "@/components/admin/admin-gate";
import { CockpitShell } from "@/components/admin/cockpit/cockpit-shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "Admin · InstaBench" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

type AuthState = "checking" | "signed_out" | "denied" | "in";

function AdminPage() {
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [deniedEmail, setDeniedEmail] = useState<string | null>(null);
  // Evita correr `evaluate()` duas vezes para o mesmo token quando
  // `getSession()` e `onAuthStateChange()` disparam quase em simultâneo.
  const lastEvaluatedTokenRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function evaluate(token: string | null) {
      if (lastEvaluatedTokenRef.current === token) return;
      lastEvaluatedTokenRef.current = token;
      if (!token) {
        if (!cancelled) {
          setAuthState("signed_out");
          setDeniedEmail(null);
        }
        return;
      }
      try {
        const res = await fetch("/api/admin/whoami", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = (await res.json().catch(() => ({}))) as {
          allowed?: boolean;
          email?: string | null;
        };
        if (cancelled) return;
        if (body.allowed) {
          setAuthState("in");
          setDeniedEmail(null);
        } else {
          setDeniedEmail(body.email ?? null);
          setAuthState("denied");
          // Termina a sessão para não deixar JWT órfão de um email não autorizado.
          await supabase.auth.signOut().catch(() => null);
        }
      } catch {
        if (!cancelled) setAuthState("signed_out");
      }
    }

    // ORDEM CRÍTICA: registar o listener antes de chamar getSession.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      void evaluate(session?.access_token ?? null);
    });

    void supabase.auth.getSession().then(({ data }) => {
      void evaluate(data.session?.access_token ?? null);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut().catch(() => null);
    lastEvaluatedTokenRef.current = null;
    setAuthState("signed_out");
    setDeniedEmail(null);
  }

  if (authState === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-base text-content-secondary">
        A verificar sessão…
      </div>
    );
  }

  if (authState === "signed_out") {
    return (
      <>
        <AdminGate />
        <Toaster />
      </>
    );
  }

  if (authState === "denied") {
    return (
      <>
        <div className="flex min-h-screen items-center justify-center bg-surface-base px-4">
          <div className="w-full max-w-sm space-y-6 rounded-xl border border-border-subtle bg-surface-elevated p-8 shadow-xl">
            <div className="space-y-2">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-content-tertiary">
                InstaBench · Admin
              </p>
              <h1 className="font-display text-2xl text-content-primary">Acesso restrito</h1>
              <p className="text-sm text-content-secondary">
                {deniedEmail
                  ? `A conta ${deniedEmail} não está autorizada a aceder ao backoffice.`
                  : "Esta conta Google não está autorizada a aceder ao backoffice."}
              </p>
              <p className="text-xs text-content-tertiary">
                A sessão foi terminada. Tenta novamente com uma conta autorizada.
              </p>
            </div>
            <Button
              type="button"
              className="w-full"
              onClick={() => setAuthState("signed_out")}
            >
              Entrar com outra conta
            </Button>
          </div>
        </div>
        <Toaster />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-surface-base text-content-primary">
      <header className="border-b border-border-subtle bg-surface-elevated">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="space-y-1">
            <p className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-content-tertiary">
              InstaBench · Admin
            </p>
            <h1 className="font-display text-xl text-content-primary">Backoffice</h1>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Terminar sessão
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <CockpitShell />
      </main>

      <Toaster />
    </div>
  );
}
