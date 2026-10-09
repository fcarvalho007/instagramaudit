import { AlertCircle, ArrowLeft, RotateCcw } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/container";
import { getRestrictedProfilePreview } from "@/lib/analysis/restricted-profile.functions";

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

function formatCount(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
}

function RestrictedPreview({ handle }: { handle: string }) {
  const { t } = useTranslation("analyze");
  const { data } = useQuery({
    queryKey: ["restricted-profile-preview", handle],
    queryFn: () => getRestrictedProfilePreview({ data: { handle } }),
    staleTime: 60 * 60 * 1000,
    retry: false,
  });
  if (!data) return null;
  const stats = [
    { key: "followers", value: data.followers },
    { key: "following", value: data.following },
    { key: "posts", value: data.posts },
  ].filter((s): s is { key: string; value: number } => s.value !== null);
  if (stats.length === 0) return null;

  return (
    <section
      aria-label={t("error.restricted.preview.label")}
      className="w-full rounded-xl border border-border-default bg-surface-primary p-5 text-left"
    >
      <span className="text-eyebrow-sm text-content-tertiary">
        {t("error.restricted.preview.eyebrow")}
      </span>
      {data.fullName && (
        <p className="mt-2 font-sans text-base font-semibold text-content-primary">
          {data.fullName}
        </p>
      )}
      <p className="font-sans text-sm text-content-secondary">@{data.handle}</p>
      <dl className="mt-4 grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.key}>
            <dd className="font-sans text-xl font-bold tabular-nums text-content-primary">
              {formatCount(s.value)}
            </dd>
            <dt className="font-sans text-xs text-content-tertiary">
              {t(`error.restricted.preview.${s.key}`)}
            </dt>
          </div>
        ))}
      </dl>
      <p className="mt-4 font-sans text-xs leading-relaxed text-content-tertiary">
        {t("error.restricted.preview.note")}
      </p>
    </section>
  );
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
  // Restricted profile: Instagram hides it from logged-out readers, so a
  // retry cannot succeed — same treatment as the personal no-feed case.
  const isRestricted = upperCode === "PROFILE_RESTRICTED";
  const isDeadEnd = isPersonalNoFeed || isRestricted;
  const params = useParams({ strict: false }) as { username?: string };
  const previewHandle = params.username?.replace(/^@/, "").toLowerCase();
  const mountsRef = useRef<number>(0);
  if (mountsRef.current === 0) {
    mountsRef.current = bumpErrorMounts();
  }
  const showHint = mountsRef.current >= 2 && !isCacheOnly && !isDeadEnd;

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
                : isRestricted
                  ? t("error.restricted.title")
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
          {isRestricted && previewHandle && <RestrictedPreview handle={previewHandle} />}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {!isDeadEnd && (
              <Button
                variant="primary"
                size="md"
                leftIcon={<RotateCcw />}
                onClick={onRetry}
              >
                {t("error.retry")}
              </Button>
            )}
            {(isCacheOnly || isDeadEnd) && (
              <Button
                variant="outline"
                size="md"
                leftIcon={<ArrowLeft />}
                asChild
              >
                <Link to="/">
                  {isRestricted
                    ? t("error.restricted.cta")
                    : isPersonalNoFeed
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
