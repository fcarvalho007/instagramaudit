import { useState } from "react";
import { ArrowRight, AtSign, Check } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { InstagramGlyph } from "./instagram-glyph";
import { normalizeInstagramHandle } from "@/lib/instagram/normalize-handle";
import { OnboardingModal } from "@/components/onboarding/onboarding-modal";

/**
 * Re-export do helper canónico em `@/lib/instagram/normalize-handle`,
 * mantido por compatibilidade com call-sites e testes existentes.
 */
export function extractUsername(raw: string): string {
  return normalizeInstagramHandle(raw);
}

export function HeroActionBar() {
  const { t } = useTranslation("landing");
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [pendingNav, setPendingNav] = useState<{ username: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const username = extractUsername(value);
    if (!username) {
      setError(value.trim() ? t("actionBar.errors.invalid") : t("actionBar.errors.empty"));
      return;
    }
    setError(null);

    // Fase 3: NÃO navegar directamente — abrir onboarding modal primeiro.
    // O modal vai submeter a /api/onboarding/start (cookie + créditos)
    // antes de qualquer chamada ao provider.
    setPendingNav({ username });
    setOnboardingOpen(true);
  };

  const trustInline = [
    t("actionBar.trustInline.freeReports"),
  ];

  return (
    <>
    <div className="relative w-full max-w-3xl mx-auto">
      {/* Micro-label above the bar */}
      <div
        className="mb-3 flex items-center gap-2"
        style={{ color: "rgb(var(--hero-cyan-soft))" }}
      >
        <InstagramGlyph className="size-[18px]" />
        <span className="text-eyebrow-sm">{t("actionBar.microLabel")}</span>
      </div>

      {/* The bar — glass card with input + button inline */}
      <div
        className="relative rounded-2xl border overflow-hidden sm:hero-bar-breathe transition-colors"
        style={{
          borderColor: "rgba(15, 23, 42, 0.08)",
          backgroundColor: "#FFFFFF",
          boxShadow:
            "0 18px 40px -22px rgba(8, 14, 32, 0.45), 0 1px 0 rgba(15, 23, 42, 0.04) inset",
        }}
      >
        <form
          onSubmit={handleSubmit}
          className="flex flex-col sm:flex-row items-stretch gap-0"
        >
          {/* Input zone */}
          <div className="relative flex-1">
            <AtSign
              className="absolute left-5 top-1/2 -translate-y-1/2 size-5 pointer-events-none"
              style={{ color: "rgb(var(--hero-bg-base))" }}
              aria-hidden="true"
            />
            <input
              type="text"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError(null);
              }}
              placeholder={t("actionBar.placeholder")}
              aria-label={t("actionBar.ariaInput")}
              aria-invalid={error ? true : undefined}
              className="w-full h-14 sm:h-[72px] bg-transparent pl-14 pr-4 font-sans text-base md:text-lg focus:outline-none text-[color:rgb(var(--hero-bg-base))] placeholder:text-[#94A3B8]"
            />
          </div>

          {/* Submit zone */}
          <div className="p-2 sm:p-2.5 flex items-stretch">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              rightIcon={<ArrowRight />}
              className="w-full sm:w-auto sm:h-14 px-6 sm:px-8 whitespace-nowrap shadow-md"
            >
              {t("actionBar.submit")}
            </Button>
          </div>
        </form>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-3 font-sans text-sm"
          style={{ color: "rgb(var(--signal-danger))" }}
        >
          {error}
        </p>
      ) : (
        <ul
          className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5"
          aria-label="Trust"
        >
          {trustInline.map((item) => (
            <li
              key={item}
              className="flex items-center gap-1.5 font-sans text-xs"
              style={{ color: "rgb(var(--hero-text-tertiary))" }}
            >
              <Check
                className="size-3.5"
                style={{ color: "rgb(var(--hero-cyan))" }}
                aria-hidden="true"
              />
              {item}
            </li>
          ))}
        </ul>
      )}

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
    {pendingNav ? (
      <OnboardingModal
        open={onboardingOpen}
        onOpenChange={setOnboardingOpen}
        handle={pendingNav.username}
        onSuccess={(handle) => {
          setOnboardingOpen(false);
          navigate({
            to: "/analyze/$username",
            params: { username: handle },
            search: {},
          });
        }}
      />
    ) : null}
    </>
  );
}
