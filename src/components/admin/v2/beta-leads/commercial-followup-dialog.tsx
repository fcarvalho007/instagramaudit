/**
 * CommercialFollowupDialog
 *
 * Confirmation dialog before sending the `commercial-followup` template
 * to a lead. Shows recipient, handle, detected intent, pricing preference,
 * subject and a body preview rendered locally from `renderCommercialFollowup`.
 *
 * Pure presentation — the parent owns the network call.
 */

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AdminBadge } from "../admin-badge";
import { renderCommercialFollowup } from "@/lib/email/templates";
import { interpretFeedback } from "@/lib/admin/feedback-intent";
import type { EnrichedLead } from "@/lib/admin/kanban-columns";
import { PRICING_PREFERENCE_LABELS } from "@/lib/feedback/feedback-schema";

interface CommercialFollowupDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lead: EnrichedLead;
  loading: boolean;
  onConfirm: () => void;
}

const PREVIEW_LIMIT = 600;

export function CommercialFollowupDialog({
  open,
  onOpenChange,
  lead,
  loading,
  onConfirm,
}: CommercialFollowupDialogProps) {
  const [expanded, setExpanded] = useState(false);

  const intent = interpretFeedback(lead.feedback);
  const pricingRaw = lead.feedback?.pricing_preference ?? null;
  const pricingLabel = pricingRaw
    ? (PRICING_PREFERENCE_LABELS[pricingRaw] ?? pricingRaw)
    : null;

  const firstName = lead.name?.trim().split(/\s+/)[0] ?? null;
  const rendered = useMemo(
    () =>
      renderCommercialFollowup({
        firstName,
        instagramHandle: lead.handle,
        pricingOption: pricingRaw,
        reportUrl:
          typeof window !== "undefined" && lead.handle
            ? `${window.location.origin}/analyze/${encodeURIComponent(lead.handle)}`
            : null,
        replyToEmail: null,
      }),
    [firstName, lead.handle, pricingRaw],
  );

  const text = rendered.text ?? "";
  const showToggle = text.length > PREVIEW_LIMIT;
  const visibleText = expanded || !showToggle ? text : `${text.slice(0, PREVIEW_LIMIT)}…`;

  const intentAccent =
    intent.intent === "alto" ? "revenue" : intent.intent === "medio" ? "signal" : "neutral";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Enviar follow-up comercial</DialogTitle>
          <DialogDescription>
            Pré-visualiza antes de enviar. Sem pressão — convida o lead a responder.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-[13px] text-admin-text-primary">
          <div className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1.5">
            <span className="admin-meta">Destinatário</span>
            <span className="font-medium break-all">{lead.email}</span>

            <span className="admin-meta">Handle</span>
            <span>{lead.handle ? `@${lead.handle}` : "—"}</span>

            <span className="admin-meta">Intenção</span>
            <span>
              <AdminBadge variant={intentAccent}>{intent.label}</AdminBadge>
            </span>

            <span className="admin-meta">Preço preferido</span>
            <span>{pricingLabel ?? "—"}</span>

            <span className="admin-meta">Assunto</span>
            <span className="font-medium">{rendered.subject}</span>
          </div>

          <div>
            <div className="admin-meta mb-1.5">Pré-visualização</div>
            <div
              className="rounded-md border border-admin-text-primary/10 bg-admin-surface-muted px-3 py-2.5 text-[12.5px] leading-[1.55] whitespace-pre-wrap font-sans text-admin-text-secondary max-h-[260px] overflow-y-auto"
            >
              {visibleText}
            </div>
            {showToggle && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="mt-1.5 text-[12px] text-admin-signal-700 hover:underline"
              >
                {expanded ? "Mostrar menos" : "Ver email completo"}
              </button>
            )}
          </div>

          <p className="text-[12px] text-admin-text-tertiary">
            Em sucesso: regista <code>commercial_followup_sent</code>, marca{" "}
            <em>contacted_at</em> e move o estado para{" "}
            <strong>
              {intent.intent === "alto" ? "Potencial cliente" : "Interessado"}
            </strong>
            . Em falha: regista <code>commercial_followup_failed</code> e mantém o estado.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={loading}>
            {loading ? "A enviar…" : "Enviar follow-up"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}