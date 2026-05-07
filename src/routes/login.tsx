import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Loader2, LogIn } from "lucide-react";
import { autoLogin } from "@/server/auto-login.functions";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Entrar — InstaBench" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const DISPLAY_EMAIL = "fredericodigital@gmail.com";

function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        navigate({ to: "/app/reports" });
      } else {
        setCheckingSession(false);
      }
    });
  }, [navigate]);

  const handleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      // Server generates a temp password and ensures user exists
      const { email, password } = await autoLogin();

      // Sign in with the temp credentials
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInErr) {
        setError(signInErr.message);
        setLoading(false);
        return;
      }

      navigate({ to: "/app/reports" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar.");
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-muted">
        <Loader2 className="size-5 animate-spin text-content-tertiary" />
      </div>
    );
  }

  return (
    <AuthCard
      title="Entrar no InstaBench"
      subtitle="Acesso restrito — fase de testes privados."
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-border-default/20 bg-surface-muted px-4 py-3 text-center">
          <span className="text-sm text-content-primary font-medium">{DISPLAY_EMAIL}</span>
        </div>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <Button onClick={handleLogin} className="w-full" disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <LogIn className="mr-2 size-4" />
          )}
          Entrar
        </Button>
      </div>

      <p className="mt-5 text-center text-xs text-content-tertiary">
        Fase de testes — acesso restrito.
      </p>
    </AuthCard>
  );
}
