import { useEffect, useState } from "react";
import { Check, Linkedin, Link2, Mail, MessageCircle, Share2 } from "lucide-react";
import { toast } from "sonner";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import type { AdapterResult } from "@/lib/report/snapshot-to-report-data";
import { buildShareMessage } from "./share-message";

interface ShareReportPopoverProps {
  result: AdapterResult;
  /** Override do URL (opcional). Por defeito, `window.location.href`. */
  url?: string;
  /** Variante visual do botão trigger. */
  variant?: "primary" | "ghost";
  /** Texto do trigger (defeito: "Partilhar"). */
  triggerLabel?: string;
  className?: string;
}

/**
 * Popover de partilha unificado: WhatsApp · LinkedIn · Email · Copiar.
 *
 * Mostra uma mensagem-teaser determinística (engagement, posicionamento,
 * cadência) construída a partir do próprio relatório. Cada canal é um
 * `<a>` semântico, abrindo num gesto limpo do utilizador (sem
 * `window.open` antecipado, evitando bloqueios de popup).
 */
export function ShareReportPopover({
  result,
  url,
  variant = "ghost",
  triggerLabel = "Partilhar",
  className,
}: ShareReportPopoverProps) {
  const [resolvedUrl, setResolvedUrl] = useState(url ?? "");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (url) {
      setResolvedUrl(url);
      return;
    }
    if (typeof window !== "undefined") {
      setResolvedUrl(window.location.href);
    }
  }, [url]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const message = buildShareMessage({ result, url: resolvedUrl });

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(message.textWithUrl)}`;
  const linkedinHref = resolvedUrl
    ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(resolvedUrl)}`
    : "";
  const mailtoHref = `mailto:?subject=${encodeURIComponent(message.emailSubject)}&body=${encodeURIComponent(message.textWithUrl)}`;

  async function handleCopy() {
    if (!resolvedUrl) return;
    const payload = message.textWithUrl;
    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard?.writeText &&
        window.isSecureContext !== false
      ) {
        await navigator.clipboard.writeText(payload);
      } else {
        const ta = document.createElement("textarea");
        ta.value = payload;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.top = "-1000px";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        if (!ok) throw new Error("execCommand-failed");
      }
      setCopied(true);
      toast.success("Mensagem copiada para a área de transferência.");
    } catch {
      toast.error("Não foi possível copiar. Selecciona o texto manualmente.");
    }
  }

  const triggerClass =
    variant === "primary"
      ? cn(
          "inline-flex items-center justify-center gap-2 rounded-full",
          "bg-accent-primary text-surface-base border border-accent-primary",
          "px-6 py-3 text-sm font-semibold min-h-[44px]",
          "transition-colors duration-200",
          "hover:bg-accent-luminous hover:border-accent-luminous",
        )
      : cn(
          "inline-flex items-center justify-center gap-2 rounded-full",
          "bg-transparent text-content-primary border border-border-subtle/50",
          "px-5 py-3 text-sm font-medium min-h-[44px]",
          "transition-colors duration-200",
          "hover:border-accent-primary/60 hover:text-accent-primary",
        );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={cn(triggerClass, className)}>
          <Share2 className="h-4 w-4" aria-hidden="true" />
          <span>{triggerLabel}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(92vw,360px)] p-4 space-y-3 border-border-subtle/60 bg-surface-base/98 backdrop-blur-sm"
      >
        <div className="space-y-1">
          <p className="text-eyebrow-sm text-content-tertiary">
            Partilhar este relatório
          </p>
          <p className="text-sm text-content-secondary leading-relaxed">{message.text}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <ChannelLink
            href={whatsappHref}
            label="WhatsApp"
            icon={<MessageCircle className="h-4 w-4" aria-hidden="true" />}
          />
          <ChannelLink
            href={linkedinHref}
            label="LinkedIn"
            icon={<Linkedin className="h-4 w-4" aria-hidden="true" />}
            disabled={!resolvedUrl}
          />
          <ChannelLink
            href={mailtoHref}
            label="Email"
            icon={<Mail className="h-4 w-4" aria-hidden="true" />}
            sameTab
          />
          <button
            type="button"
            onClick={handleCopy}
            disabled={!resolvedUrl}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-lg",
              "border border-border-subtle/60 bg-surface-secondary/40",
              "px-3 py-2.5 text-xs font-medium text-content-primary",
              "transition-colors duration-200",
              "hover:border-accent-primary/60 hover:text-accent-primary",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            {copied ? (
              <Check className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Link2 className="h-4 w-4" aria-hidden="true" />
            )}
            <span>{copied ? "Copiado" : "Copiar"}</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ChannelLink({
  href,
  label,
  icon,
  disabled,
  sameTab,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  sameTab?: boolean;
}) {
  if (disabled || !href) {
    return (
      <span
        aria-disabled="true"
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-border-subtle/60 bg-surface-secondary/40 px-3 py-2.5 text-xs font-medium text-content-tertiary opacity-50"
      >
        {icon}
        <span>{label}</span>
      </span>
    );
  }
  return (
    <a
      href={href}
      target={sameTab ? undefined : "_blank"}
      rel={sameTab ? undefined : "noopener noreferrer"}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg",
        "border border-border-subtle/60 bg-surface-secondary/40",
        "px-3 py-2.5 text-xs font-medium text-content-primary",
        "transition-colors duration-200",
        "hover:border-accent-primary/60 hover:text-accent-primary",
      )}
    >
      {icon}
      <span>{label}</span>
    </a>
  );
}
