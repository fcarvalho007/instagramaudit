import { useMemo, useState } from "react";

import { Link, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  CalendarClock,
  Coins,
  Download,
  Lock,
  Menu,
  MoreHorizontal,
  Share2,
  UserPlus,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { PUBLIC_PRODUCTS } from "@/lib/payments/products";
import type { AdapterResult } from "@/lib/report/snapshot-to-report-data";
import type { ReportPageActions } from "@/components/report/report-page";
import { ShareReportPopover } from "@/components/report-share/share-popover";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ConsumeCreditDialog } from "@/components/report-redesign/v2/consume-credit-dialog";
import { usePremiumCta } from "@/components/report-redesign/v2/premium-cta-context";
import { useReportExploreActions } from "@/components/report-redesign/v2/use-report-explore-actions";
import {
  scrollToBlock,
  useActiveBlock,
} from "@/components/report-redesign/v2/use-active-block";

import { buildChromeSections } from "./chrome-sections";

interface EditorialReportChromeProps {
  result: AdapterResult;
  actions?: ReportPageActions;
  premiumUnlocked: boolean;
  leadCaptured: boolean;
  competitorHandles?: string[];
  isAdminPreview?: boolean;
  /** Janela observada actualmente, em dias, tal como o relatório a reporta. */
  currentWindowDays?: number | null;
}

/**
 * Chrome de navegação e acções do Editorial V2.
 *
 * Só apresentação: reutiliza as acções de produção (créditos, período,
 * concorrente, CTA Pro, PDF, partilha) através dos hooks existentes. Não
 * cria regras de negócio, entitlements, preços, endpoints nem eventos
 * novos.
 */
export function EditorialReportChrome({
  result,
  actions,
  premiumUnlocked,
  leadCaptured,
  competitorHandles = [],
  isAdminPreview = false,
  currentWindowDays,
}: EditorialReportChromeProps) {
  const { t } = useTranslation("report");
  const { handlePremiumAccessClick } = usePremiumCta();
  const [sheetOpen, setSheetOpen] = useState(false);

  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });
  // As acções de período/concorrente só existem no relatório vivo
  // (`/analyze/:username`). Em vistas históricas são omitidas — nunca
  // simuladas.
  const isLiveReport = pathname.startsWith("/analyze/");

  const sections = useMemo(
    () => buildChromeSections({ premiumUnlocked, leadCaptured }),
    [premiumUnlocked, leadCaptured],
  );
  const ids = useMemo(() => sections.map((s) => s.id), [sections]);
  const active = useActiveBlock(ids);
  const activeIndex = Math.max(
    0,
    sections.findIndex((s) => s.id === active),
  );
  const activeSection = sections[activeIndex];
  const progress = sections.length
    ? Math.round(((activeIndex + 1) / sections.length) * 100)
    : 0;

  const handle = result.data.profile.username;
  const avatarUrl = result.enriched?.profile?.avatarUrl ?? null;

  const explore = useReportExploreActions({
    premiumUnlocked,
    competitorCount: competitorHandles.length,
    primaryHandle: handle,
    existingCompetitors: competitorHandles,
    isAdminPreview,
    // Mantém a pré-visualização Editorial V2 durante a navegação interna.
    preserveSearch: { report_design: "editorial_v2" },
  });

  // URL canónico — nunca partilha o parâmetro de pré-visualização.
  const canonicalUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${window.location.pathname}`
      : undefined;

  const goTo = (id: string) => {
    setSheetOpen(false);
    scrollToBlock(id);
  };

  return (
    <>
      <div className="ev2-chrome" data-ev2-chrome="">
        <div className="ev2-chrome__inner">
          {/* Identidade compacta do perfil */}
          <div className="ev2-chrome__identity">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="ev2-chrome__avatar"
                loading="lazy"
              />
            ) : null}
            <div className="min-w-0 hidden xs:block">
              <p className="ev2-chrome__handle">@{handle}</p>
              {typeof currentWindowDays === "number" ? (
                <p className="ev2-chrome__window">
                  {t("nav.explore.period_label")} · {currentWindowDays}d
                </p>
              ) : null}
            </div>
          </div>

          {/* Navegação por secções (desktop) */}
          <nav
            aria-label={t("nav.sections_aria", {
              defaultValue: "Secções do relatório",
            })}
            className="ev2-chrome__tabs"
          >
            {sections.map((section) => {
              const isActive = section.id === active;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => goTo(section.id)}
                  aria-current={isActive ? "true" : undefined}
                  className={cn("ev2-chrome__tab", isActive && "is-active")}
                >
                  <span className="ev2-chrome__tab-num">
                    {section.displayNumber}
                  </span>
                  <span className="truncate">{section.label}</span>
                  {section.access === "locked" ? (
                    <Lock className="size-3 shrink-0" aria-hidden="true" />
                  ) : null}
                </button>
              );
            })}
          </nav>

          {/* Acções */}
          <div className="ev2-chrome__actions">
            {isLiveReport ? (
              <>
                <button
                  type="button"
                  onClick={() =>
                    premiumUnlocked
                      ? explore.onPeriodPaidClick(30)
                      : handlePremiumAccessClick("sidebar_period")
                  }
                  className="ev2-chrome__btn"
                >
                  <CalendarClock className="size-3.5" aria-hidden="true" />
                  <span className="hidden lg:inline">
                    {t("nav.explore.period_label")}
                  </span>
                  {!premiumUnlocked ? (
                    <Lock className="size-3" aria-hidden="true" />
                  ) : null}
                </button>
                <button
                  type="button"
                  onClick={explore.onAddCompetitor}
                  disabled={explore.atMax}
                  className="ev2-chrome__btn"
                >
                  <UserPlus className="size-3.5" aria-hidden="true" />
                  <span className="hidden lg:inline">
                    {t("nav.explore.add_competitor_short")}
                  </span>
                  {!premiumUnlocked ? (
                    <Lock className="size-3" aria-hidden="true" />
                  ) : null}
                </button>
              </>
            ) : null}

            {!premiumUnlocked ? (
              <button
                type="button"
                onClick={() => handlePremiumAccessClick("sidebar_main_cta")}
                className="ev2-chrome__cta"
              >
                {t("nav.unlock_cta", { defaultValue: "Desbloquear Pro" })} ·{" "}
                {PUBLIC_PRODUCTS.report_full_9.priceLabel}
              </button>
            ) : null}

            <EditorialActionsMenu
              result={result}
              actions={actions}
              premiumUnlocked={premiumUnlocked}
              balance={explore.balance}
              canonicalUrl={canonicalUrl}
            />

            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="ev2-chrome__btn ev2-chrome__menu-btn"
              aria-label={t("nav.sections_aria", {
                defaultValue: "Secções do relatório",
              })}
            >
              <Menu className="size-4" aria-hidden="true" />
              <span className="ev2-chrome__mobile-label">
                {activeSection
                  ? `${activeSection.displayNumber} · ${activeSection.label}`
                  : ""}
              </span>
            </button>
          </div>
        </div>

        <div
          className="ev2-chrome__progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          aria-label={t("nav.progress_aria", {
            defaultValue: "Progresso de leitura",
          })}
        >
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Selector de secções em mobile */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="ev2-chrome__sheet">
          <SheetHeader>
            <SheetTitle>
              {t("nav.sections_aria", { defaultValue: "Secções do relatório" })}
            </SheetTitle>
          </SheetHeader>
          <ul className="ev2-chrome__sheet-list">
            {sections.map((section) => (
              <li key={section.id}>
                <button
                  type="button"
                  onClick={() => goTo(section.id)}
                  aria-current={section.id === active ? "true" : undefined}
                  className={cn(
                    "ev2-chrome__sheet-item",
                    section.id === active && "is-active",
                  )}
                >
                  <span className="ev2-chrome__tab-num">
                    {section.displayNumber}
                  </span>
                  <span className="flex-1 text-left">{section.label}</span>
                  {section.access === "locked" ? (
                    <Lock className="size-3.5" aria-hidden="true" />
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </SheetContent>
      </Sheet>

      {premiumUnlocked ? (
        <ConsumeCreditDialog
          open={explore.dialogOpen}
          onOpenChange={explore.setDialogOpen}
          intent={explore.intent}
          balance={explore.balance}
          onConfirm={explore.onConfirmConsume}
          onOpenCached={(i) => explore.onConfirmConsume(i, { forceRefresh: false })}
          periodCacheState={explore.periodCacheState}
          submitting={explore.submitting}
          errorMessage={explore.errorMessage}
          primaryHandle={handle}
          existingCompetitors={competitorHandles}
          competitorMax={explore.competitorMax}
          onEmptyFeedback={explore.onBuyCredits}
        />
      ) : null}
    </>
  );
}

function EditorialActionsMenu({
  result,
  actions,
  premiumUnlocked,
  balance,
  canonicalUrl,
}: {
  result: AdapterResult;
  actions?: ReportPageActions;
  premiumUnlocked: boolean;
  balance: number;
  canonicalUrl?: string;
}) {
  const { t } = useTranslation("report");
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="ev2-chrome__btn"
          aria-label={t("hero.actions.more", { defaultValue: "Mais acções" })}
        >
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60 p-1.5">
        {actions?.onExportPdf ? (
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              actions.onExportPdf?.();
            }}
            disabled={actions.pdfDisabled || actions.pdfBusy}
            className="ev2-chrome__menu-item"
          >
            <Download className="size-4" aria-hidden="true" />
            {t("hero.actions.pdf")}
          </button>
        ) : null}

        <ShareReportPopover
          result={result}
          url={canonicalUrl}
          customTrigger={
            <button type="button" className="ev2-chrome__menu-item">
              <Share2 className="size-4" aria-hidden="true" />
              {t("hero.actions.share")}
            </button>
          }
        />

        {premiumUnlocked ? (
          <p className="ev2-chrome__menu-meta">
            <Coins className="size-4" aria-hidden="true" />
            {t("nav.explore.credits_balance", {
              count: balance,
              defaultValue: "{{count}} créditos disponíveis",
            })}
          </p>
        ) : null}

        <Link
          to="/app"
          className="ev2-chrome__menu-item"
          onClick={() => setOpen(false)}
        >
          <X className="size-4 opacity-0" aria-hidden="true" />
          {t("nav.account", { defaultValue: "A minha conta" })}
        </Link>
      </PopoverContent>
    </Popover>
  );
}
