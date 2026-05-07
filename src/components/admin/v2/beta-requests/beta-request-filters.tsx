/**
 * Status filter pills for the beta requests table.
 */

const STATUSES = [
  { value: "", label: "Todos" },
  { value: "pending_review", label: "Pendente" },
  { value: "approved", label: "Aprovado" },
  { value: "rejected", label: "Rejeitado" },
  { value: "processing", label: "Em processamento" },
  { value: "completed", label: "Concluído" },
  { value: "archived", label: "Arquivado" },
  { value: "failed", label: "Falhou" },
] as const;

interface BetaRequestFiltersProps {
  status: string;
  onStatusChange: (status: string) => void;
}

export function BetaRequestFilters({ status, onStatusChange }: BetaRequestFiltersProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {STATUSES.map((s) => {
        const active = status === s.value;
        return (
          <button
            key={s.value}
            onClick={() => onStatusChange(s.value)}
            className="inline-flex items-center rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all duration-150"
            style={{
              backgroundColor: active ? "#FFFFFF" : "rgba(255,255,255,0.45)",
              color: active ? "#2C2C2A" : "#6B6B66",
              border: active ? "1px solid rgba(255,255,255,0.7)" : "1px solid rgba(255,255,255,0.5)",
              boxShadow: active ? "0 1px 3px rgba(44,44,42,0.1)" : "none",
            }}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}