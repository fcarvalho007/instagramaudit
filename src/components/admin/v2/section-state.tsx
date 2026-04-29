/**
 * Estados genéricos para secções com `useQuery`: skeleton, erro, vazio.
 * Usar dentro de qualquer componente que migre de mock para dados reais.
 */

import { AlertTriangle, Inbox } from "lucide-react";

interface SectionSkeletonProps {
  /** Número de linhas de placeholder a desenhar. */
  rows?: number;
  /** Altura de cada linha em px. */
  rowHeight?: number;
  /** Mensagem opcional a mostrar se o carregamento se prolongar. */
  message?: string;
}

export function SectionSkeleton({
  rows = 3,
  rowHeight = 36,
  message,
}: SectionSkeletonProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="rounded-lg bg-admin-surface-muted/40 p-4"
    >
      <div className="flex flex-col gap-2">
        {Array.from({ length: rows }).map((_, idx) => (
          <div
            key={idx}
            className="animate-pulse rounded bg-admin-border/60"
            style={{ height: rowHeight }}
          />
        ))}
      </div>
      {message ? (
        <p className="m-0 mt-3 text-[12px] text-admin-text-tertiary">
          {message}
        </p>
      ) : null}
    </div>
  );
}

interface SectionErrorProps {
  error: { message?: string } | string | null | undefined;
  onRetry?: () => void;
}

export function SectionError({ error, onRetry }: SectionErrorProps) {
  const message =
    typeof error === "string"
      ? error
      : error?.message ?? "Erro desconhecido ao carregar.";
  return (
    <div
      role="alert"
      style={{
        background: "#FCEBEB",
        border: "1px solid #E24B4A",
        padding: 12,
        borderRadius: 8,
        color: "#791F1F",
        fontSize: 12,
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
      }}
    >
      <AlertTriangle size={14} strokeWidth={2.25} style={{ marginTop: 2 }} />
      <div style={{ flex: 1 }}>
        <strong style={{ fontWeight: 600 }}>Erro ao carregar:</strong>{" "}
        <span>{message}</span>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="ml-3 underline hover:no-underline"
            style={{ color: "#791F1F", fontWeight: 500 }}
          >
            Tentar novamente
          </button>
        ) : null}
      </div>
    </div>
  );
}

interface SectionEmptyProps {
  message?: string;
}

export function SectionEmpty({
  message = "Sem dados ainda — primeira sincronização decorre à meia-noite UTC.",
}: SectionEmptyProps) {
  return (
    <div
      role="status"
      style={{
        textAlign: "center",
        padding: "40px 24px",
        color: "#888780",
        fontSize: 13,
      }}
    >
      <Inbox
        size={20}
        strokeWidth={1.5}
        style={{ display: "inline-block", marginBottom: 8, opacity: 0.6 }}
      />
      <p className="m-0">{message}</p>
    </div>
  );
}
