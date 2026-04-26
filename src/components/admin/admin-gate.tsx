import { useState } from "react";
import { Button } from "@/components/ui/button";
import { lovable } from "@/integrations/lovable/index";

export function AdminGate() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleSignIn() {
    setSubmitting(true);
    setError(null);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri:
          typeof window !== "undefined"
            ? `${window.location.origin}/admin`
            : undefined,
      });

      if (result.error) {
        setError("Não foi possível iniciar sessão com Google.");
        setSubmitting(false);
        return;
      }
      // Se result.redirected, o browser segue para o Google; caso contrário,
      // a sessão foi reposta e o listener em /admin tratará o resto.
    } catch {
      setError("Erro de rede. Tentar novamente.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-base px-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-border-subtle bg-surface-elevated p-8 shadow-xl">
        <div className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-content-tertiary">
            InstaBench · Admin
          </p>
          <h1 className="font-display text-2xl text-content-primary">Acesso restrito</h1>
          <p className="text-sm text-content-secondary">
            O backoffice é privado. Entra com a tua conta Google autorizada para continuar.
          </p>
        </div>

        <Button
          type="button"
          className="w-full"
          onClick={handleGoogleSignIn}
          disabled={submitting}
        >
          {submitting ? "A redirecionar…" : "Entrar com Google"}
        </Button>

        {error ? (
          <p className="text-sm text-signal-danger" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
