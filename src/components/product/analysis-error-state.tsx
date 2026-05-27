import { AlertCircle, ArrowLeft, RotateCcw } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/container";

interface AnalysisErrorStateProps {
  message?: string;
  errorCode?: string;
  onRetry: () => void;
}

// Persists a retry counter across remounts within the same tab so we can
// surface an extra hint after repeated failures without touching the
// (locked) route component.
const ERROR_MOUNT_KEY = "ib_analyze_error_mounts";
function bumpErrorMounts(): number {
  if (typeof window === "undefined") return 1;
  try {
    const current = Number(window.sessionStorage.getItem(ERROR_MOUNT_KEY) ?? "0");
    const next = (Number.isFinite(current) ? current : 0) + 1;
    window.sessionStorage.setItem(ERROR_MOUNT_KEY, String(next));
    return next;
  } catch {
    return 1;
  }
}

export function AnalysisErrorState({
  message,
  errorCode,
  onRetry,
}: AnalysisErrorStateProps) {
  const { t } = useTranslation("analyze");
  const upperCode = errorCode?.toUpperCase();
  const isCacheOnly = upperCode === "CACHE_ONLY_NO_DATA";
  // Personal-account case: the profile is public but Instagram's public
  // endpoint doesn't expose its feed. Retrying won't help and burns Apify
  // credits, so suppress the retry button and only offer a way back.
  const isPersonalNoFeed = upperCode === "PROFILE_PERSONAL_NO_FEED";
  const mountsRef = useRef<number>(0);
  if (mountsRef.current === 0) {
    mountsRef.current = bumpErrorMounts();
  }
  const showHint = mountsRef.current >= 2 && !isCacheOnly && !isPersonalNoFeed;

  // Clear the counter once the user navigates away successfully.
  useEffect(() => {
    return () => {
      // Do nothing on unmount — the counter is intentionally sticky per tab.
    };
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #F6FAFF 0%, #FFFFFF 100%)" }}>
      <Container size="md" as="section" className="py-20 md:py-32">
        <div className="mx-auto flex max-w-md flex-col items-center gap-6 text-center">
          <div className="flex size-12 items-center justify-center rounded-full border border-border-default bg-surface-secondary text-content-secondary">
            <AlertCircle className="size-5" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <span className="text-eyebrow-sm text-[0.625rem] text-content-tertiary">
              {t("error.eyebrow")}
            </span>
            <h1 className="font-display text-2xl md:text-3xl font-medium text-content-primary tracking-tight">
              {isCacheOnly
                ? t("error.cacheOnly.title")
                : isPersonalNoFeed
                  ? t("error.personalNoFeed.title")
                  : t("error.title")}
            </h1>
            <p className="font-sans text-sm text-content-secondary leading-relaxed">
              {isCacheOnly
                ? t("error.cacheOnly.body")
                : (message ?? t("error.fallback"))}
            </p>
            {showHint && (
              <p className="font-sans text-xs text-content-tertiary leading-relaxed pt-1">
                {t("error.retry_hint", {
                  defaultValue:
                    "O perfil pode ser privado, inexistente ou estar temporariamente indisponível. Verifica o nome e tenta novamente.",
                })}
              </p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {!isPersonalNoFeed && (
              <Button
                variant="primary"
                size="md"
                leftIcon={<RotateCcw />}
                onClick={onRetry}
              >
                {t("error.retry")}
              </Button>
            )}
            {(isCacheOnly || isPersonalNoFeed) && (
              <Button
                variant="outline"
                size="md"
                leftIcon={<ArrowLeft />}
                asChild
              >
                <Link to="/">
                  {isPersonalNoFeed
                    ? t("error.personalNoFeed.cta")
                    : t("error.back")}
                </Link>
              </Button>
            )}
          </div>
        </div>
      </Container>
    </div>
  );
}
