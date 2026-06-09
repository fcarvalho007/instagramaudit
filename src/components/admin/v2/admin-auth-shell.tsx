/**
 * AdminAuthShell — gate simples (modo testes privados).
 *
 * Lê o email guardado em localStorage. Se existir → renderiza o cockpit.
 * Se não existir → mostra `<AdminGate/>` (input email + botão Entrar).
 * Sem JWT, sem Supabase Auth, sem Google.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AdminGate } from "@/components/admin/admin-gate";
import { clearAdminEmail, writeAdminEmail } from "@/lib/admin/simple-gate";

interface AdminAuthShellProps {
  children: ReactNode;
  /** Callback opcional para o layout receber o handler de logout. */
  onLogoutReady?: (handler: () => Promise<void>) => void;
}

export function AdminAuthShell({ children, onLogoutReady }: AdminAuthShellProps) {
  // SSR-safe: começa "checking" para evitar hydration mismatch; após mount
  // valida o cookie `admin_session` server-side via /api/admin/whoami antes
  // de decidir signed_in/signed_out. O `localStorage` é só UX (pre-fill).
  const [state, setState] = useState<"checking" | "signed_out" | "signed_in">(
    "checking",
  );
  const onLogoutReadyRef = useRef(onLogoutReady);
  useEffect(() => {
    onLogoutReadyRef.current = onLogoutReady;
  }, [onLogoutReady]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/whoami", {
          credentials: "include",
          headers: { "Cache-Control": "no-store" },
        });
        if (cancelled) return;
        if (res.ok) {
          const body = (await res.json()) as { allowed?: boolean; email?: string | null };
          if (body.allowed && body.email) {
            writeAdminEmail(body.email);
            setState("signed_in");
            return;
          }
        }
        clearAdminEmail();
        setState("signed_out");
      } catch {
        if (cancelled) return;
        clearAdminEmail();
        setState("signed_out");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Quando qualquer adminFetch apanha 401/403 dispara este evento. Voltamos
  // imediatamente ao gate sem precisar de refresh manual.
  useEffect(() => {
    function onExpired() {
      setState("signed_out");
    }
    if (typeof window === "undefined") return;
    window.addEventListener("admin:session-expired", onExpired as EventListener);
    return () => {
      window.removeEventListener("admin:session-expired", onExpired as EventListener);
    };
  }, []);

  useEffect(() => {
    const handler = async () => {
      clearAdminEmail();
      setState("signed_out");
    };
    onLogoutReadyRef.current?.(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === "checking") {
    return <div className="min-h-screen bg-surface-base" />;
  }

  if (state === "signed_out") {
    return (
      <>
        <AdminGate onSuccess={() => setState("signed_in")} />
        <Toaster />
      </>
    );
  }

  return <>{children}</>;
}