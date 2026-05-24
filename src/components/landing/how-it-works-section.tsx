import { AtSign, LineChart, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Container } from "@/components/layout/container";
import { HowItWorksStep } from "./how-it-works-step";

export function HowItWorksSection() {
  const { t } = useTranslation("landing");
  return (
    <section className="relative py-24 md:py-32 overflow-hidden border-t border-border-subtle">
      {/* Subtle vertical lines background */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(90deg, transparent 0, transparent 79px, rgb(15 27 61) 79px, rgb(15 27 61) 80px)",
          backgroundSize: "80px 100%",
        }}
      />

      {/* Asymmetric violet glow — shifted right for editorial tension */}
      <div
        aria-hidden="true"
        className="absolute top-1/3 left-[65%] -translate-x-1/2 -translate-y-1/2 h-[420px] w-[600px] max-w-[70vw] rounded-full bg-accent-violet/[0.07] blur-3xl pointer-events-none"
      />

      {/* Soft secondary glow — anchor on left */}
      <div
        aria-hidden="true"
        className="absolute top-2/3 left-[20%] -translate-x-1/2 -translate-y-1/2 h-[300px] w-[400px] max-w-[60vw] rounded-full bg-accent-violet/[0.04] blur-3xl pointer-events-none"
      />

      <Container size="lg" className="relative">
        {/* Section header */}
        <div className="max-w-2xl mb-16 md:mb-20">
          <span className="text-eyebrow text-accent-violet-luminous mb-4 block">
            {t("howItWorks.eyebrow")}
          </span>
          <h2 className="font-display text-3xl md:text-5xl text-content-primary font-medium tracking-tight leading-[1.1] mb-6">
            {t("howItWorks.title")}
          </h2>
          <p className="font-sans text-lg text-content-secondary leading-relaxed">
            {t("howItWorks.lead")}
          </p>
        </div>

        {/* 3 steps grid with directional flow line */}
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-0">
          {/* Continuous hairline + directional violet nodes (desktop only) */}
          <div
            aria-hidden="true"
            className="hidden md:block absolute top-8 left-[8%] right-[8%] h-px bg-gradient-to-r from-transparent via-border-default to-transparent pointer-events-none"
          />
          {/* Node on step 02 icon */}
          <div
            aria-hidden="true"
            className="hidden md:block absolute top-[30px] left-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-accent-violet pointer-events-none"
          />
          {/* Node on step 03 icon */}
          <div
            aria-hidden="true"
            className="hidden md:block absolute top-[31px] left-[83.33%] -translate-x-1/2 h-1.5 w-1.5 rounded-full bg-accent-violet/70 pointer-events-none"
          />

          <div className="md:pr-8">
            <HowItWorksStep
              number="01"
              title={t("howItWorks.step1Title")}
              description={t("howItWorks.step1Desc")}
              icon={<AtSign />}
              delay={0}
              showDivider
            />
          </div>
          <div className="md:px-8">
            <HowItWorksStep
              number="02"
              title={t("howItWorks.step2Title")}
              description={t("howItWorks.step2Desc")}
              icon={<LineChart />}
              delay={150}
              emphasis="primary"
              showDivider
            />
          </div>
          <div className="md:pl-8">
            <HowItWorksStep
              number="03"
              title={t("howItWorks.step3Title")}
              description={t("howItWorks.step3Desc")}
              icon={<Mail />}
              delay={300}
            />
          </div>
        </div>
      </Container>
    </section>
  );
}
