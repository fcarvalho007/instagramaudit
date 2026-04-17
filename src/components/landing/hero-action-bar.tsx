import { useState } from "react";
import { ArrowRight, AtSign, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function HeroActionBar() {
  const [competitorsOpen, setCompetitorsOpen] = useState(false);

  return (
    <div className="relative w-full max-w-3xl mx-auto">
      {/* The bar — glass card with input + button inline */}
      <div className="relative rounded-2xl border border-border-strong bg-surface-secondary/60 backdrop-blur-xl shadow-2xl overflow-hidden hero-bar-breathe">
        <form
          onSubmit={(e) => e.preventDefault()}
          className="flex flex-col sm:flex-row items-stretch gap-0 divide-y sm:divide-y-0 sm:divide-x divide-border-subtle"
        >
          {/* Input zone */}
          <div className="relative flex-1">
            <AtSign
              className="absolute left-5 top-1/2 -translate-y-1/2 size-5 text-content-tertiary pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              placeholder="@username ou URL do perfil"
              aria-label="Username ou URL do perfil do Instagram"
              className="w-full h-16 sm:h-[72px] bg-transparent pl-14 pr-4 font-sans text-base md:text-lg text-content-primary placeholder:text-content-tertiary/70 focus:outline-none"
            />
          </div>

          {/* Submit zone */}
          <div className="p-2 flex items-stretch">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              rightIcon={<ArrowRight />}
              className="w-full sm:w-auto sm:h-14 px-6 sm:px-8 whitespace-nowrap"
            >
              Analisar
            </Button>
          </div>
        </form>
      </div>

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
