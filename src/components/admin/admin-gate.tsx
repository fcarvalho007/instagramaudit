/**
 * AdminGate — gate simples (modo testes privados).
 *
 * Mostra apenas um input "Email" + botão "Entrar". Valida o email contra
 * `/api/admin/simple-login` (allowlist `ADMIN_ALLOWED_EMAILS`). Em sucesso
 * persiste o email em localStorage e dispara `onSuccess()` (ou recarrega
 * a página, se nenhum callback for passado).
 *
 * Sem password, sem magic link, sem 2FA — risco aceite pelo owner.
 */

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { writeAdminEmail } from "@/lib/admin/simple-gate";

interface AdminGateProps {
  onSuccess?: (email: string) => void;
}

export function AdminGate({ onSuccess }: AdminGateProps = {}) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const cleaned = email.trim().toLowerCase();
    if (!cleaned) {
      setError("Indica o email.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/simple-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleaned }),
      });
      if (res.ok) {
        writeAdminEmail(cleaned);
        if (onSuccess) {
          onSuccess(cleaned);
        } else if (typeof window !== "undefined") {
          window.location.reload();
        }
        return;
      }
      if (res.status === 403) {
        setError("Email não autorizado.");
      } else {
        setError(`Erro ${res.status}. Tenta novamente.`);
      }
    } catch {
      setError("Erro de rede. Tenta novamente.");
    } finally {
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
          <p className="text-eyebrow text-content-tertiary">
            InstaBench · Admin
          </p>
          <h1 className="font-display text-2xl text-content-primary">Acesso</h1>
          <p className="text-sm text-content-secondary">
            Indica o email autorizado para entrar no backoffice.
          </p>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="admin-email"
            className="text-eyebrow-sm block text-content-tertiary"
          >
            Email
          </label>
          <input
            id="admin-email"
            type="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            className="w-full rounded-md border border-border-subtle bg-surface-base px-3 py-2 text-sm text-content-primary outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
            placeholder="exemplo@dominio.pt"
          />
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "A entrar…" : "Entrar"}
        </Button>

        {error ? (
          <p className="text-sm text-signal-danger" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </div>
  );
}
