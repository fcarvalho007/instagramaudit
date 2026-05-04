import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, Mail } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Entrar — InstaBench" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const ALLOWED_EMAIL = "fredericodigital@gmail.com";

function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

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

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: ALLOWED_EMAIL,
      options: {
        emailRedirectTo: `${window.location.origin}/app/reports`,
      },
    });

    setLoading(false);
    if (otpError) {
      setError(otpError.message);
    } else {
      setMagicLinkSent(true);
    }
  };

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F0F4FA]">
        <Loader2 className="size-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (magicLinkSent) {
    return (
      <AuthCard
        title="Verifica o email"
        subtitle="Enviámos um magic link para continuar."
      >
        <div className="flex flex-col items-center gap-4 py-4">
          <CheckCircle2 className="size-12 text-emerald-600" />
          <p className="text-sm text-slate-600 font-medium">{ALLOWED_EMAIL}</p>
          <p className="text-sm text-slate-500 text-center">
            Clica no link que recebeste no email para aceder à área de testes.
            Verifica também a pasta de spam.
          </p>
          <button
            onClick={() => setMagicLinkSent(false)}
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Voltar
          </button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Entrar no InstaBench"
      subtitle="Acesso restrito — fase de testes privados."
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 flex items-center gap-3">
          <Mail className="size-4 text-slate-400 shrink-0" />
          <span className="text-sm text-slate-700 font-medium">{ALLOWED_EMAIL}</span>
        </div>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <Button onClick={handleLogin} className="w-full" disabled={loading}>
          {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Enviar magic link
        </Button>
      </div>

      <p className="mt-5 text-center text-xs text-slate-400">
        Receberás um link de acesso no email indicado.
      </p>
    </AuthCard>
  );
}
