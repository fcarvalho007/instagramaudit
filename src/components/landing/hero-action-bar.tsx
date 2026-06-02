import { useState } from "react";
import { ArrowRight, AtSign, Plus } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [competitorsOpen, setCompetitorsOpen] = useState(false);
  const [competitor1, setCompetitor1] = useState("");
  const [competitor2, setCompetitor2] = useState("");
  const [competitorError, setCompetitorError] = useState<string | null>(null);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [pendingNav, setPendingNav] = useState<{
    username: string;
    competitors: string[];
  } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const username = extractUsername(value);
    if (!username) {
      setError(value.trim() ? t("actionBar.errors.invalid") : t("actionBar.errors.empty"));
      return;
    }
    setError(null);

    // Validate optional competitors. Silently drop empties, reject invalid.
    const rawCompetitors = competitorsOpen ? [competitor1, competitor2] : [];
    const competitors: string[] = [];
    for (const raw of rawCompetitors) {
      const c = extractUsername(raw);
      if (!c) {
        if (raw.trim()) {
        setCompetitorError(t("actionBar.errors.competitorInvalid"));
        return;
      }
        continue;
      }
      if (c === username) continue; // skip duplicate of primary
      if (competitors.includes(c)) continue; // dedupe
      competitors.push(c);
    }
    setCompetitorError(null);

    // Fase 3: NÃO navegar directamente — abrir onboarding modal primeiro.
    // O modal vai submeter a /api/onboarding/start (cookie + créditos)
    // antes de qualquer chamada ao provider.
    setPendingNav({ username, competitors });
    setOnboardingOpen(true);
  };

  return (
    <>
    <div className="relative w-full max-w-3xl mx-auto">
      {/* Micro-label above the bar */}
      <div
        className="mb-3 flex items-center gap-2"
        style={{ color: "var(--hero-fg-subtle)" }}
      >
        <InstagramGlyph className="size-[18px]" />
        <span className="text-eyebrow-sm">{t("actionBar.microLabel")}</span>
      </div>

      {/* The bar — glass card with input + button inline */}
      <div
        className="relative rounded-2xl border backdrop-blur-xl shadow-2xl overflow-hidden hero-bar-breathe transition-colors"
        style={{
          borderColor: "var(--hero-border-strong)",
          backgroundColor: "rgb(255 255 255 / 0.04)",
          boxShadow:
            "inset 0 1px 0 rgb(255 255 255 / 0.06), 0 30px 60px -30px rgb(0 0 0 / 0.7)",
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
              style={{ color: "var(--hero-fg-faint)" }}
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
              className="w-full h-16 sm:h-[72px] bg-transparent pl-14 pr-4 font-sans text-base md:text-lg focus:outline-none placeholder:text-[var(--hero-fg-faint)]"
              style={{ color: "var(--hero-fg)" }}
            />
          </div>

          {/* Submit zone */}
          <div className="p-2.5 flex items-stretch">
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
          style={{ color: "#FF8A8A" }}
        >
          {error}
        </p>
      ) : (
        <p
          className="mt-3 font-sans text-xs"
          style={{ color: "var(--hero-fg-subtle)" }}
        >
          {t("actionBar.personalHint")}
        </p>
      )}

      {/* Progressive reveal: competitors */}
      <div className="mt-4 flex">
        {!competitorsOpen ? (
          <button
            type="button"
            onClick={() => setCompetitorsOpen(true)}
            className="group inline-flex items-center gap-2 font-sans text-sm transition-colors duration-[150ms]"
            style={{ color: "var(--hero-fg-subtle)" }}
          >
            <Plus className="size-4 transition-transform group-hover:rotate-90 duration-[250ms]" />
            {t("actionBar.addCompetitors")}
          </button>
        ) : (
          <div className="w-full space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <span
                className="text-eyebrow"
                style={{ color: "var(--hero-fg-subtle)" }}
              >
                {t("actionBar.competitorsLabel")}
              </span>
              <button
                type="button"
                onClick={() => {
                  setCompetitorsOpen(false);
                  setCompetitor1("");
                  setCompetitor2("");
                  setCompetitorError(null);
                }}
                className="font-sans text-xs transition-colors"
                style={{ color: "var(--hero-fg-subtle)" }}
              >
                {t("actionBar.remove")}
              </button>
            </div>
            <Input
              variant="glass"
              inputSize="md"
              leftIcon={<AtSign />}
              placeholder={t("actionBar.competitor1Placeholder")}
              aria-label={t("actionBar.competitor1Aria")}
              value={competitor1}
              onChange={(e) => {
                setCompetitor1(e.target.value);
                if (competitorError) setCompetitorError(null);
              }}
            />
            <Input
              variant="glass"
              inputSize="md"
              leftIcon={<AtSign />}
              placeholder={t("actionBar.competitor2Placeholder")}
              aria-label={t("actionBar.competitor2Aria")}
              value={competitor2}
              onChange={(e) => {
                setCompetitor2(e.target.value);
                if (competitorError) setCompetitorError(null);
              }}
            />
            {competitorError ? (
              <p
                role="alert"
                className="font-sans text-sm"
                style={{ color: "#FF8A8A" }}
              >
                {competitorError}
              </p>
            ) : null}
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
            search:
              pendingNav.competitors.length > 0
                ? { vs: pendingNav.competitors.join(",") }
                : {},
          });
        }}
      />
    ) : null}
    </>
  );
}
