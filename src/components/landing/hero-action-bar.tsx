import { useState } from "react";
import { ArrowRight, AtSign, Plus } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InstagramGlyph } from "./instagram-glyph";

// Instagram username spec: 1-30 chars, letters/numbers/dots/underscores only
const USERNAME_REGEX = /^[A-Za-z0-9._]{1,30}$/;

function extractUsername(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  // Handle URLs like https://instagram.com/handle/ or @handle
  const urlMatch = trimmed.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  if (urlMatch) return urlMatch[1].toLowerCase();
  return trimmed.replace(/^@/, "").replace(/\/+$/g, "").toLowerCase();
}

export function HeroActionBar() {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [competitorsOpen, setCompetitorsOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const username = extractUsername(value);
    if (!username) {
      setError("Inserir um username válido para continuar");
      return;
    }
    if (!USERNAME_REGEX.test(username)) {
      setError("Username inválido. Apenas letras, números, ponto e underscore.");
      return;
    }
    setError(null);
    navigate({ to: "/analyze/$username", params: { username } });
  };

  return (
    <div className="relative w-full max-w-3xl mx-auto">
      {/* Micro-label above the bar */}
      <div className="mb-3 flex items-center justify-center gap-2 text-content-secondary">
        <InstagramGlyph className="size-[18px]" />
        <span className="font-mono text-[0.625rem] uppercase tracking-[0.18em]">
          Perfil público do Instagram
        </span>
      </div>

      {/* The bar — glass card with input + button inline */}
      <div className="relative rounded-2xl border border-border-strong bg-surface-base/80 backdrop-blur-xl shadow-2xl shadow-[inset_0_1px_0_rgb(255_255_255_/_0.04),0_30px_60px_-30px_rgb(0_0_0_/_0.6)] overflow-hidden hero-bar-breathe focus-within:border-accent-violet/40 transition-colors">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col sm:flex-row items-stretch gap-0 divide-y sm:divide-y-0 sm:divide-x divide-border-subtle sm:divide-border-default"
        >
          {/* Input zone */}
          <div className="relative flex-1">
            <AtSign
              className="absolute left-5 top-1/2 -translate-y-1/2 size-5 text-content-tertiary pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError(null);
              }}
              placeholder="@username ou URL do perfil"
              aria-label="Username ou URL do perfil do Instagram"
              aria-invalid={error ? true : undefined}
              className="w-full h-16 sm:h-[72px] bg-transparent pl-14 pr-4 font-sans text-base md:text-lg text-content-primary placeholder:text-content-tertiary/70 focus:outline-none"
            />
          </div>

          {/* Submit zone */}
          <div className="p-2.5 flex items-stretch">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              rightIcon={<ArrowRight />}
              className="w-full sm:w-auto sm:h-14 px-6 sm:px-8 whitespace-nowrap shadow-glow-violet"
            >
              Analisar
            </Button>
          </div>
        </form>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-3 text-center font-sans text-sm text-signal-danger"
        >
          {error}
        </p>
      ) : null}

      {/* Progressive reveal: competitors */}
      <div className="mt-4 flex justify-center">
        {!competitorsOpen ? (
          <button
            type="button"
            onClick={() => setCompetitorsOpen(true)}
            className="group inline-flex items-center gap-2 font-sans text-sm text-content-secondary hover:text-accent-luminous transition-colors duration-[150ms]"
          >
            <Plus className="size-4 transition-transform group-hover:rotate-90 duration-[250ms]" />
            Adicionar até 2 concorrentes para comparar
          </button>
        ) : (
          <div className="w-full space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-wide text-content-tertiary">
                Concorrentes (opcional)
              </span>
              <button
                type="button"
                onClick={() => setCompetitorsOpen(false)}
                className="font-sans text-xs text-content-tertiary hover:text-content-secondary transition-colors"
              >
                Remover
              </button>
            </div>
            <Input
              variant="glass"
              inputSize="md"
              leftIcon={<AtSign />}
              placeholder="@concorrente 1"
              aria-label="Username do primeiro concorrente"
            />
            <Input
              variant="glass"
              inputSize="md"
              leftIcon={<AtSign />}
              placeholder="@concorrente 2 (opcional)"
              aria-label="Username do segundo concorrente"
            />
          </div>
        )}
      </div>

      <style>{`
        .hero-bar-breathe {
          animation: hero-bar-breathe-kf 4s ease-in-out infinite;
        }
        @keyframes hero-bar-breathe-kf {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.005); }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-bar-breathe { animation: none; }
        }
      `}</style>
    </div>
  );
}
