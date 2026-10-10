import { AlertCircle, ArrowLeft, Check, Minus, RotateCcw } from "lucide-react";
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

function RestrictedPreview({
  handle,
  onRetry,
}: {
  handle: string;
  onRetry: () => void;
}) {
  const { t, i18n } = useTranslation("analyze");
  const { data, isPending } = useQuery({
    queryKey: ["restricted-profile-preview", handle],
    queryFn: () => getRestrictedProfilePreview({ data: { handle } }),
    staleTime: 60 * 60 * 1000,
    retry: false,
  });
  const profile = data?.profile ?? null;
  const stats = [
    { key: "followers", value: profile?.followers ?? null },
    { key: "following", value: profile?.following ?? null },
    { key: "posts", value: profile?.posts ?? null },
  ].filter((s): s is { key: string; value: number } => s.value !== null);
  const checkedAt = data?.verifiedAt
    ? new Intl.DateTimeFormat(i18n.resolvedLanguage === "en" ? "en-GB" : "pt-PT", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(data.verifiedAt))
    : null;

  const rows = [
    { key: "profileFound", available: true },
    { key: "basicData", available: stats.length > 0 },
    { key: "postsAvailable", available: false },
    { key: "metricsCalculated", available: false },
  ];

  return (
    <section
      aria-label={t("error.restricted.preview.label")}
      className="w-full rounded-lg border border-border-default bg-surface-primary p-5 text-left md:p-6"
    >
      <span className="text-eyebrow-sm text-content-tertiary">
        {t("error.restricted.preview.eyebrow")}
      </span>
      {profile?.fullName && (
        <p className="mt-2 font-sans text-base font-semibold text-content-primary">
          {profile.fullName}
        </p>
      )}
      <p className="font-sans text-sm text-content-secondary">@{handle}</p>

      {stats.length > 0 && (
        <dl className="mt-5 grid grid-cols-3 gap-3 border-y border-border-default py-4">
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
      )}

      <dl className="mt-5 divide-y divide-border-default border-y border-border-default">
        {rows.map((row) => (
          <div key={row.key} className="flex items-center justify-between gap-4 py-3">
            <dt className="font-sans text-sm text-content-secondary">
              {t(`error.restricted.preview.status.${row.key}`)}
            </dt>
            <dd className="flex shrink-0 items-center gap-2 font-sans text-xs font-semibold text-content-primary">
              {row.available ? (
                <Check className="size-4 text-status-success" aria-hidden="true" />
              ) : (
                <Minus className="size-4 text-content-tertiary" aria-hidden="true" />
              )}
              {t(
                row.available
                  ? "error.restricted.preview.status.confirmed"
                  : row.key === "basicData"
                    ? "error.restricted.preview.status.unavailable"
                    : row.key === "postsAvailable"
                      ? "error.restricted.preview.status.no"
                      : "error.restricted.preview.status.notCalculated",
              )}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-5">
        <h2 className="font-sans text-sm font-semibold text-content-primary">
          {t("error.restricted.preview.explanationTitle")}
        </h2>
        <p className="mt-2 font-sans text-sm leading-relaxed text-content-secondary">
          {t("error.restricted.preview.note")}
        </p>
        <p className="mt-3 font-sans text-xs leading-relaxed text-content-tertiary">
          {t("error.restricted.preview.noEstimates")}
        </p>
      </div>

      {checkedAt && (
        <p className="mt-5 font-sans text-xs text-content-tertiary">
          {t("error.restricted.preview.checkedAt", {
            date: checkedAt,
            source: t(`error.restricted.preview.source.${data?.source ?? "stored"}`),
          })}
        </p>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Button
          variant="primary"
          size="md"
          leftIcon={<RotateCcw />}
          onClick={onRetry}
          disabled={isPending}
        >
          {t("error.restricted.retry")}
        </Button>
        <Button variant="outline" size="md" leftIcon={<ArrowLeft />} asChild>
          <Link to="/">{t("error.restricted.cta")}</Link>
        </Button>
      </div>
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
    <div className="min-h-screen bg-background">
      <Container size="md" as="section" className="py-20 md:py-32">
        <div className="mx-auto flex max-w-xl flex-col items-center gap-6 text-center">
          <div className="flex size-12 items-center justify-center rounded-full border border-border-default bg-surface-secondary text-content-secondary">
            <AlertCircle className="size-5" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <span className="text-eyebrow-sm text-[0.625rem] text-content-tertiary">
              {isRestricted ? t("error.restricted.eyebrow") : t("error.eyebrow")}
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
                : isRestricted
                  ? t("error.restricted.body", { handle: previewHandle })
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
          {isRestricted && previewHandle && (
            <RestrictedPreview handle={previewHandle} onRetry={onRetry} />
          )}
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
            {(isCacheOnly || isDeadEnd) && !isRestricted && (
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
