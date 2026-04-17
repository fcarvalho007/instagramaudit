import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AdminGateProps {
  onAuthenticated: () => void;
}

export function AdminGate({ onAuthenticated }: AdminGateProps) {
  const [token, setToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      });
      const body = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string };
      if (!res.ok || !body.success) {
        setError(body.message ?? "Não foi possível autenticar.");
        setSubmitting(false);
        return;
      }
      onAuthenticated();
    } catch {
      setError("Erro de rede. Tentar novamente.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-base px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-6 rounded-xl border border-border-subtle bg-surface-elevated p-8 shadow-xl"
      >
        <div className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-content-tertiary">
            InstaBench · Admin
          </p>
          <h1 className="font-display text-2xl text-content-primary">Acesso restrito</h1>
          <p className="text-sm text-content-secondary">
            Introduzir o token de acesso para continuar.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="admin-token" className="text-content-secondary">
            Token de acesso
          </Label>
          <Input
            id="admin-token"
            type="password"
            autoComplete="off"
            autoFocus
            value={token}
            onChange={(e) => setToken(e.target.value)}
            disabled={submitting}
          />
          {error ? (
            <p className="text-sm text-signal-danger" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <Button type="submit" className="w-full" disabled={submitting || !token.trim()}>
          {submitting ? "A validar…" : "Entrar"}
        </Button>
      </form>
    </div>
  );
}
