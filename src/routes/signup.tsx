import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
  head: () => ({
    meta: [
      { title: "Criar conta — InstaBench" },
      { name: "description", content: "Cria a tua conta InstaBench." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function SignupPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Redirect if already logged in
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        navigate({ to: "/app/reports" });
      } else {
        setCheckingSession(false);
      }
    });
  }, [navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("Preenche todos os campos.");
      return;
    }
    if (password.length < 6) {
      setError("A palavra-passe deve ter pelo menos 6 caracteres.");
      return;
    }
    setLoading(true);
    const { error: authError } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/app/reports`,
      },
    });
    setLoading(false);
    if (authError) {
      if (authError.message.includes("already registered")) {
        setError("Este email já está registado. Tenta entrar.");
      } else {
        setError(authError.message);
      }
      return;
    }
    setSuccess(true);
  };

  const handleGoogle = async () => {
    setError("");
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/app/reports`,
      },
    });
    if (authError) setError(authError.message);
  };

  if (checkingSession) return null;

  if (success) {
    return (
      <AuthCard
        title="Verifica o teu email"
        subtitle="Enviámos um link de confirmação. Clica no link para ativar a tua conta."
      >
        <div className="flex flex-col items-center gap-4 py-4">
          <CheckCircle2 className="size-12 text-emerald-600" />
          <p className="text-sm text-slate-500 text-center">
            O email pode demorar alguns minutos. Verifica também a pasta de spam.
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

  return (
    <AuthCard
      title="Criar conta"
      subtitle="Guarda os teus relatórios e prepara o acesso ao tracking PRO."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="signup-email">Email</Label>
          <Input
            id="signup-email"
            type="email"
            autoComplete="email"
            placeholder="nome@exemplo.pt"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-password">Palavra-passe</Label>
          <Input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
          Criar conta
        </Button>
      </form>

      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-3 text-slate-400">
            ou
          </span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogle}
      >
        <svg className="mr-2 size-4" viewBox="0 0 24 24" aria-hidden>
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Continuar com Google
      </Button>

      <p className="mt-6 text-center text-sm text-slate-500">
        Já tens conta?{" "}
        <Link to="/login" className="font-medium text-blue-600 hover:underline">
          Entrar
        </Link>
      </p>
    </AuthCard>
  );
}
