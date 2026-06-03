import { cn } from "@/lib/utils";

export type QualObjective =
  | "improve_content"
  | "growth_diagnostic"
  | "brand_strategy"
  | "competitor_compare"
  | "other";

export type QualOwnership = "mine" | "my_brand" | "client" | "competitor";

export interface QualificationValue {
  objective: QualObjective | null;
  objective_other: string;
  profile_ownership: QualOwnership | null;
}

const OBJECTIVES: { value: QualObjective; label: string }[] = [
  { value: "improve_content", label: "Melhorar conteúdo" },
  { value: "growth_diagnostic", label: "Perceber porque o perfil não cresce" },
  { value: "brand_strategy", label: "Preparar estratégia para uma marca ou cliente" },
  { value: "competitor_compare", label: "Comparar com concorrentes" },
  { value: "other", label: "Outro" },
];

const OWNERSHIPS: { value: QualOwnership; label: string }[] = [
  { value: "mine", label: "É meu" },
  { value: "my_brand", label: "Minha marca" },
  { value: "client", label: "Cliente" },
  { value: "competitor", label: "Concorrente / benchmark" },
];

interface Props {
  value: QualificationValue;
  onChange: (next: QualificationValue) => void;
}

export function QualificationForm({ value, onChange }: Props) {
  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="text-sm font-semibold text-content-primary mb-3">
          Qual é o principal objectivo deste diagnóstico?
        </legend>
        <div className="space-y-2">
          {OBJECTIVES.map((opt) => (
            <RadioRow
              key={opt.value}
              name="objective"
              label={opt.label}
              checked={value.objective === opt.value}
              onChange={() => onChange({ ...value, objective: opt.value })}
            />
          ))}
        </div>
        {value.objective === "other" ? (
          <input
            type="text"
            placeholder="Conta-nos em poucas palavras"
            value={value.objective_other}
            maxLength={200}
            onChange={(e) =>
              onChange({ ...value, objective_other: e.target.value })
            }
            className="mt-3 w-full rounded-lg border border-border-default bg-white px-3 py-2 text-base text-content-primary placeholder:text-content-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/30"
          />
        ) : null}
      </fieldset>

      <fieldset>
        <legend className="text-sm font-semibold text-content-primary mb-3">
          Este perfil é teu, da tua marca, de um cliente ou de um concorrente?
        </legend>
        <div className="space-y-2">
          {OWNERSHIPS.map((opt) => (
            <RadioRow
              key={opt.value}
              name="ownership"
              label={opt.label}
              checked={value.profile_ownership === opt.value}
              onChange={() =>
                onChange({ ...value, profile_ownership: opt.value })
              }
            />
          ))}
        </div>
      </fieldset>
    </div>
  );
}

function RadioRow({
  name,
  label,
  checked,
  onChange,
}: {
  name: string;
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-white px-3 py-3 cursor-pointer transition-colors",
        checked
          ? "border-accent-primary ring-1 ring-accent-primary/30"
          : "border-border-default hover:border-content-tertiary",
      )}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="size-4 accent-accent-primary"
      />
      <span className="text-sm text-content-primary">{label}</span>
    </label>
  );
}