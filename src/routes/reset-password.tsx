import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, KeyRound } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({
    meta: [
      { title: "Recuperar palavra-passe — InstaBench" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function ResetPasswordPage() {
  // Detect recovery mode (user clicked email link)
  const [isRecovery, setIsRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);

  useEffect(() => {
    // Check for recovery token in URL hash
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      if (hash.includes("type=recovery")) {
        setIsRecovery(true);
      }
    }

    // Listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "PASSWORD_RECOVERY") {
          setIsRecovery(true);
        }
      },
    );
    return () => subscription.unsubscribe();
  }, []);

  // ── Request reset link ──
  const handleRequestReset = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Introduz o email.");
      return;
    }
    setLoading(true);
    const { error: authError } = await supabase.auth.resetPasswordForEmail(
      trimmedEmail,
      { redirectTo: `${window.location.origin}/reset-password` },
    );
    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    setEmailSent(true);
  };

  // ── Set new password ──
  const handleSetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 6) {
      setError("A palavra-passe deve ter pelo menos 6 caracteres.");
      return;
    }
    setLoading(true);
    const { error: authError } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    setPasswordUpdated(true);
  };

  // ── Password updated success ──
  if (passwordUpdated) {
    return (
      <AuthCard
        title="Palavra-passe atualizada"
        subtitle="Já podes entrar com a nova palavra-passe."
      >
        <div className="flex flex-col items-center gap-4 py-4">
          <CheckCircle2 className="size-12 text-emerald-600" />
          <Link
            to="/login"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Ir para o login
          </Link>
        </div>
      </AuthCard>
    );
  }

  // ── Set new password form (recovery mode) ──
  if (isRecovery) {
    return (
      <AuthCard
        title="Nova palavra-passe"
        subtitle="Define uma nova palavra-passe para a conta."
      >
        <form onSubmit={handleSetPassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">Nova palavra-passe</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              placeholder="Mínimo 6 caracteres"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Guardar nova palavra-passe
          </Button>
        </form>
      </AuthCard>
    );
  }

  // ── Email sent success ──
  if (emailSent) {
    return (
      <AuthCard
        title="Link enviado"
        subtitle="Verifica o email para continuar."
      >
        <div className="flex flex-col items-center gap-4 py-4">
          <CheckCircle2 className="size-12 text-emerald-600" />
          <p className="text-sm text-content-secondary text-center">
            Se o email estiver registado, receberás um link de recuperação. Verifica também a pasta de spam.
          </p>
          <Link
            to="/login"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Voltar ao login
          </Link>
        </div>
      </AuthCard>
    );
  }

  // ── Request reset form ──
  return (
    <AuthCard
      title="Recuperar palavra-passe"
      subtitle="Recebe um link para definires uma nova palavra-passe."
    >
      <form onSubmit={handleRequestReset} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reset-email">Email</Label>
          <Input
            id="reset-email"
            type="email"
            autoComplete="email"
            placeholder="nome@exemplo.pt"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Enviar link de recuperação
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-content-secondary">
        <Link to="/login" className="font-medium text-blue-600 hover:underline">
          Voltar ao login
        </Link>
      </p>
    </AuthCard>
  );
}
