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
import { clearAdminEmail, readAdminEmail } from "@/lib/admin/simple-gate";

interface AdminAuthShellProps {
  children: ReactNode;
  /** Callback opcional para o layout receber o handler de logout. */
  onLogoutReady?: (handler: () => Promise<void>) => void;
}

export function AdminAuthShell({ children, onLogoutReady }: AdminAuthShellProps) {
  // SSR-safe: começa "checking" para evitar hydration mismatch; após mount
  // lê o localStorage e decide `signed_in` ou `signed_out`.
  const [state, setState] = useState<"checking" | "signed_out" | "signed_in">(
    "checking",
  );
  const onLogoutReadyRef = useRef(onLogoutReady);
  useEffect(() => {
    onLogoutReadyRef.current = onLogoutReady;
  }, [onLogoutReady]);

  useEffect(() => {
    setState(readAdminEmail() ? "signed_in" : "signed_out");
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