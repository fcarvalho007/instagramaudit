/**
 * AdminGate — gate do backoffice.
 *
 * Pede email + password partilhada. `/api/admin/simple-login` valida ambos
 * server-side (allowlist + `ADMIN_LOGIN_PASSWORD`) e emite o cookie
 * `admin_session` HttpOnly. O email guardado em localStorage é apenas para
 * UX (pre-fill); a autoridade real é o cookie server-side.
 */

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { writeAdminEmail } from "@/lib/admin/simple-gate";

interface AdminGateProps {
  onSuccess?: (email: string) => void;
}

export function AdminGate({ onSuccess }: AdminGateProps = {}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const cleaned = email.trim().toLowerCase();
    if (!cleaned || !password) {
      setError("Indica email e password.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/simple-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: cleaned, password }),
      });
      if (res.ok) {
        writeAdminEmail(cleaned);
        setPassword("");
        if (onSuccess) {
          onSuccess(cleaned);
        } else if (typeof window !== "undefined") {
          window.location.reload();
        }
        return;
      }
      if (res.status === 403) {
        setError("Credenciais inválidas.");
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
            AuditProfiles · Admin
          </p>
          <h1 className="font-display text-2xl text-content-primary">Acesso</h1>
          <p className="text-sm text-content-secondary">
            Indica email autorizado e password partilhada do backoffice.
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

        <div className="space-y-2">
          <label
            htmlFor="admin-password"
            className="text-eyebrow-sm block text-content-tertiary"
          >
            Password
          </label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
            className="w-full rounded-md border border-border-subtle bg-surface-base px-3 py-2 text-sm text-content-primary outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
            placeholder="••••••••"
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
