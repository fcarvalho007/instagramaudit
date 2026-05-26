/**
 * Cartão que simula a vista de inbox (Gmail/Apple Mail) para o template
 * em edição: mostra remetente, assunto e preheader como apareceriam.
 */
import { Mail } from "lucide-react";

interface InboxPreviewCardProps {
  subject: string;
  preheader: string;
  senderName?: string;
}

export function InboxPreviewCard({
  subject,
  preheader,
  senderName = "InstaBench",
}: InboxPreviewCardProps) {
  const time = new Date().toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div
      className="flex items-start gap-3 rounded-md border bg-white px-3 py-2.5"
      style={{ borderColor: "rgb(var(--admin-border-default))" }}
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
        style={{ background: "rgb(var(--admin-button-dark))" }}
        aria-hidden
      >
        <Mail className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[12px] font-semibold text-admin-text-primary">
            {senderName}
          </span>
          <span className="shrink-0 text-[10px] text-admin-text-tertiary">{time}</span>
        </div>
        <p className="m-0 truncate text-[13px] font-medium text-admin-text-primary">
          {subject || <span className="text-admin-text-tertiary">(sem assunto)</span>}
        </p>
        <p className="m-0 truncate text-[11px] text-admin-text-tertiary">
          {preheader || "(sem preheader)"}
        </p>
      </div>
    </div>
  );
}