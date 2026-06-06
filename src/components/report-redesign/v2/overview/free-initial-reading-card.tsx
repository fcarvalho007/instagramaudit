import type { ReactNode } from "react";

export interface FreeInitialReadingCardProps {
  engagementRate: number;
  engagementBenchmark: number;
  postingFrequencyWeekly: number;
  cadenceSufficient: boolean;
  dominantFormat: string | null;
  dominantFormatShare: number;
  hasRecurringHashtags: boolean;
}

function formatPct(n: number): string {
  return `${n.toFixed(n >= 10 ? 1 : 2).replace(/\.?0+$/, "")}%`;
}

function formatWeekly(n: number): string {
  if (n >= 10) return `${Math.round(n)}`;
  return n.toFixed(1).replace(/\.0$/, "");
}

/**
 * Deterministic, AI-free editorial reading for the Free/Public report.
 * Renders immediately above the Engagement card. Reads only metrics already
 * present on `result.data.keyMetrics` + `enriched.cadence` + `topHashtags`.
 * Never reads aiInsightsV2, visual_cover, caption_semantic or comment intel.
 */
export function FreeInitialReadingCard({
  engagementRate,
  engagementBenchmark,
  postingFrequencyWeekly,
  cadenceSufficient,
  dominantFormat,
  dominantFormatShare,
  hasRecurringHashtags,
}: FreeInitialReadingCardProps) {
  const benchmarkAvailable = engagementBenchmark > 0;
  const engagementDefined = engagementRate > 0 && benchmarkAvailable;
  const cadenceDefined =
    cadenceSufficient && postingFrequencyWeekly > 0;
  const formatDefined =
    typeof dominantFormat === "string" &&
    dominantFormat.length > 0 &&
    dominantFormatShare > 0;

  const engagementOk = engagementDefined && engagementRate >= engagementBenchmark;
  const cadenceOk = cadenceDefined && postingFrequencyWeekly >= 3;
  const formatOverdependent = formatDefined && dominantFormatShare >= 70;
  const formatDiversified =
    formatDefined && dominantFormatShare > 0 && dominantFormatShare < 60;

  let verdict = "Leitura preliminar do perfil";
  if (cadenceDefined && engagementDefined) {
    if (cadenceOk && engagementOk) verdict = "Perfil consistente, envolvimento alinhado";
    else if (cadenceOk && !engagementOk) verdict = "Cadência forte, sinal fraco";
    else if (!cadenceOk && engagementOk) verdict = "Boa resposta, ritmo irregular";
    else verdict = "Perfil pouco activo, envolvimento baixo";
  }

  // Explanatory paragraph (deterministic template).
  const paragraphParts: string[] = [];
  if (cadenceDefined) {
    paragraphParts.push(
      `Este perfil publica em média ${formatWeekly(postingFrequencyWeekly)} vezes por semana`,
    );
  } else {
    paragraphParts.push("Este perfil tem uma cadência ainda pouco clara");
  }
  if (engagementDefined) {
    const dir = engagementOk ? "acima" : "abaixo";
    paragraphParts.push(
      `com uma taxa de envolvimento de ${formatPct(engagementRate)}, ${dir} do benchmark de ${formatPct(engagementBenchmark)}`,
    );
  } else if (engagementRate > 0) {
    paragraphParts.push(
      `com uma taxa de envolvimento de ${formatPct(engagementRate)}`,
    );
  }
  let paragraph = paragraphParts.join(", ") + ".";
  if (formatDefined) {
    paragraph += ` O formato dominante é ${dominantFormat} (${Math.round(dominantFormatShare)}%).`;
  }

  // Positive / limiting signals.
  const positives: string[] = [];
  if (cadenceOk) positives.push("Ritmo de publicação consistente");
  if (engagementOk) positives.push("Envolvimento acima do benchmark");
  if (formatDiversified) positives.push("Mistura equilibrada de formatos");
  if (hasRecurringHashtags) positives.push("Uso recorrente de hashtags próprias");

  const limits: string[] = [];
  if (cadenceDefined && !cadenceOk) limits.push("Ritmo irregular ou pouco frequente");
  if (engagementDefined && !engagementOk) limits.push("Envolvimento abaixo do benchmark");
  if (formatOverdependent) limits.push("Dependência excessiva de um formato");
  if (!hasRecurringHashtags) limits.push("Sem hashtags recorrentes identificáveis");

  return (
    <section
      aria-label="Leitura inicial do perfil"
      className="rounded-2xl border border-default bg-surface-card px-5 py-6 md:px-7 md:py-7"
    >
      <p className="text-eyebrow-sm text-content-tertiary">VISÃO GERAL</p>
      <h3 className="mt-2 text-lg font-semibold text-content-primary md:text-xl">
        Leitura inicial do perfil
      </h3>
      <p className="mt-3 text-sm font-medium text-content-primary md:text-base">
        {verdict}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-content-secondary md:text-[15px]">
        {paragraph}
      </p>

      <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MetricCell
          label="Cadência"
          value={
            cadenceDefined
              ? `${formatWeekly(postingFrequencyWeekly)} / sem`
              : "—"
          }
          hint={cadenceDefined ? null : "Amostra reduzida"}
        />
        <MetricCell
          label="Envolvimento"
          value={engagementRate > 0 ? formatPct(engagementRate) : "—"}
          hint={
            benchmarkAvailable
              ? `Benchmark ${formatPct(engagementBenchmark)}`
              : null
          }
        />
        <MetricCell
          label="Formato dominante"
          value={
            formatDefined
              ? `${dominantFormat}`
              : "—"
          }
          hint={
            formatDefined ? `${Math.round(dominantFormatShare)}% dos posts` : null
          }
        />
      </dl>

      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
        <SignalList
          title="O que funciona"
          tone="positive"
          items={positives}
          emptyLabel="Sem sinais positivos claros nesta amostra."
        />
        <SignalList
          title="O que limita"
          tone="negative"
          items={limits}
          emptyLabel="Sem sinais negativos claros nesta amostra."
        />
      </div>
    </section>
  );
}

function MetricCell({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string | null;
}) {
  return (
    <div className="rounded-xl bg-surface-muted px-4 py-3">
      <dt className="text-eyebrow-sm text-content-tertiary">{label}</dt>
      <dd className="mt-1 text-base font-semibold tabular-nums text-content-primary md:text-lg">
        {value}
      </dd>
      {hint ? (
        <p className="mt-0.5 text-xs text-content-tertiary">{hint}</p>
      ) : null}
    </div>
  );
}

function SignalList({
  title,
  tone,
  items,
  emptyLabel,
}: {
  title: string;
  tone: "positive" | "negative";
  items: string[];
  emptyLabel: string;
}) {
  const dotClass =
    tone === "positive" ? "bg-[var(--report-primary,#0077B6)]" : "bg-[#BA7517]";
  return (
    <div>
      <p className="text-eyebrow-sm text-content-tertiary">{title}</p>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-content-tertiary">{emptyLabel}</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {items.map((it) => (
            <li
              key={it}
              className="flex items-start gap-2 text-sm text-content-secondary md:text-[15px]"
            >
              <span
                aria-hidden
                className={`mt-[7px] inline-block h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`}
              />
              <span>{it as ReactNode}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}