import { useTranslation } from "react-i18next";
import { Image as ImageIcon, Info, Loader2, MessageCircle } from "lucide-react";

import type { AdapterResult, SnapshotPayload } from "@/lib/report/snapshot-to-report-data";
import { useVariantFeatures } from "@/lib/report/report-variant";
import { classifyBrandReply } from "@/components/report-redesign/v2/report-comment-intelligence";

import { ReportBand } from "../primitives/report-band";
import { SectionIntro } from "../primitives/section-intro";
import { ObservationBlock } from "../primitives/observation-block";
import { ReadingBlock } from "../primitives/reading-block";
import { EDITORIAL_V2_DISPLAY_NUMBERS } from "../section-metadata";
import { useReveal } from "../overview/use-count-up";
import {
  buildConversationObservations,
  buildConversationReading,
  buildEditorialConversationsData,
  type EditorialConversationsData,
} from "./conversations-data";

// ─────────────────────────────────────────────────────────────────────
// Cópia dependente do estado real — nunca implica leitura de comentários
// quando não houve texto de comentários disponível.
// ─────────────────────────────────────────────────────────────────────

export function conversationsIntro(data: EditorialConversationsData): {
  title: string;
  subtitle: string;
} {
  switch (data.state) {
    case "intelligence":
      return {
        title: "O que revelam os comentários",
        subtitle:
          "Analisamos os comentários públicos disponíveis para identificar perguntas, objeções e sinais de intenção.",
      };
    case "counts_only":
      return {
        title: "A resposta da audiência",
        subtitle:
          "Esta secção mostra a resposta pública observável nas publicações analisadas.",
      };
    case "zero_confirmed":
      return {
        title: "A resposta da audiência",
        subtitle:
          "Esta secção mostra a resposta pública observável nas publicações analisadas.",
      };
    default:
      return {
        title: "A resposta da audiência",
        subtitle:
          "Não há dados fiáveis de comentários para as publicações desta janela.",
      };
  }
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-[10px] border p-[var(--ev2-s3)]"
      style={{ background: "var(--ev2-surface)", borderColor: "var(--ev2-hair)" }}
    >
      {children}
    </div>
  );
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ev2-ink-3)]">
      {children}
    </p>
  );
}

function NoticeCard({
  title,
  body,
  processing = false,
}: {
  title: string;
  body: string;
  processing?: boolean;
}) {
  return (
    <div
      className="flex items-start gap-[10px] rounded-[10px] border p-[var(--ev2-s3)]"
      style={{ background: "var(--ev2-surface-2)", borderColor: "var(--ev2-hair)" }}
    >
      {processing ? (
        <Loader2
          aria-hidden="true"
          className="mt-[2px] size-[15px] shrink-0 animate-spin text-[var(--ev2-ink-3)] motion-reduce:animate-none"
        />
      ) : (
        <Info aria-hidden="true" className="mt-[2px] size-[15px] shrink-0 text-[var(--ev2-ink-3)]" />
      )}
      <div className="min-w-0">
        <p className="text-[14px] font-medium text-[var(--ev2-ink)]">{title}</p>
        <p className="mt-[4px] text-[13px] leading-[1.6] text-[var(--ev2-ink-2)]">{body}</p>
      </div>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex min-w-0 items-baseline justify-between gap-[var(--ev2-s2)]">
      <span className="min-w-0 truncate text-[14px] text-[var(--ev2-ink-2)]">{label}</span>
      <span className="ev2-tabular shrink-0 text-[15px] font-semibold text-[var(--ev2-ink)]">
        {value}
      </span>
    </li>
  );
}

function PostThumb({
  url,
  alt,
}: {
  url: string | null;
  alt: string;
}) {
  return (
    <div
      className="size-[56px] shrink-0 overflow-hidden rounded-[6px] border"
      style={{ background: "var(--ev2-hair)", borderColor: "var(--ev2-hair-2)" }}
    >
      {url ? (
        <img src={url} alt={alt} loading="lazy" className="size-full object-cover" />
      ) : (
        <span className="flex size-full items-center justify-center" aria-label={`${alt} sem imagem disponível`}>
          <ImageIcon aria-hidden="true" className="size-[16px] text-[var(--ev2-ink-4)]" />
        </span>
      )}
    </div>
  );
}

/**
 * 05 — Conversas (Editorial V2, Fase F).
 *
 * Apresentação pura. Reutiliza o enriquecimento de produção já persistido
 * e as contagens reais do snapshot. Nunca converte dados em falta em zero,
 * nunca dispara enriquecimento e nunca inventa insights.
 */
export function EditorialConversations({
  result,
  payload,
}: {
  result: AdapterResult;
  payload?: SnapshotPayload;
}) {
  const { t } = useTranslation("report");
  const features = useVariantFeatures();
  const showTechnicalDetail = features.debugLabels !== "hidden";
  const { ref, revealed } = useReveal<HTMLDivElement>();

  const data = buildEditorialConversationsData(result, payload);
  const intro = conversationsIntro(data);
  const observations = buildConversationObservations(data);
  const reading = buildConversationReading(data);
  const ci = data.intelligence;

  const excerptGroups: Array<{ key: string; label: string; items: Array<{ username: string; text: string }> }> =
    ci?.classifiedExcerpts
      ? (
          [
            ["questions", "Perguntas"],
            ["praise", "Elogios"],
            ["complaints", "Queixas"],
            ["buyingIntent", "Intenção de compra"],
          ] as const
        )
          .map(([key, label]) => ({
            key,
            label,
            items: (ci.classifiedExcerpts?.[key] ?? []).slice(0, 2),
          }))
          .filter((g) => g.items.length > 0)
      : [];

  const signals = ci
    ? (
        [
          ["Perguntas", ci.questionsFromAudienceCount],
          ["Elogios", ci.praiseCount],
          ["Queixas", ci.complaintOrIssueCount],
          ["Intenção de compra", ci.buyingIntentCount],
          ["Spam", ci.spamOrLowQualityCount],
        ] as const
      ).filter(([, count]) => count > 0)
    : [];

  return (
    <ReportBand
      id="conversas"
      labelledBy="ev2-conversas-title"
      context={
        <div className="flex flex-col gap-[var(--ev2-s3)]">
          <SectionIntro
            displayNumber={EDITORIAL_V2_DISPLAY_NUMBERS["conversas"]}
            title={intro.title}
            subtitle={intro.subtitle}
            headingId="ev2-conversas-title"
            headingLevel={2}
          />
          <p className="max-w-[46ch] text-[13px] leading-[1.6] text-[var(--ev2-ink-3)]">
            {t("comments.scope_note")}
          </p>
        </div>
      }
    >
      <div
        ref={ref}
        data-revealed={revealed ? "true" : "false"}
        className="flex flex-col gap-[var(--ev2-s4)] transition-[opacity,transform] duration-700 ease-[cubic-bezier(.16,1,.3,1)] motion-reduce:transition-none data-[revealed=false]:translate-y-[14px] data-[revealed=false]:opacity-0"
      >
        {/* ── Estado: zero confirmado ── */}
        {data.state === "zero_confirmed" ? (
          <Card>
            <p className="ev2-tabular text-[64px] leading-none text-[var(--ev2-ink)]">0</p>
            <p className="mt-[var(--ev2-s2)] max-w-[52ch] text-[15px] leading-[1.6] text-[var(--ev2-ink-2)]">
              Nenhuma das {data.counts.postsWithKnownCount} publicações analisadas
              recebeu comentários públicos.
            </p>
          </Card>
        ) : null}

        {/* ── Estado: dados indisponíveis ── */}
        {data.state === "unavailable" ? (
          <NoticeCard
            processing={data.unavailableReason === "processing"}
            title={
              data.unavailableReason === "processing"
                ? "Análise das conversas em curso"
                : "Análise das conversas indisponível"
            }
            body={
              data.unavailableReason === "processing"
                ? "Estamos a recolher os comentários públicos desta amostra. Esta secção fica completa assim que terminar."
                : "Não há dados de comentários fiáveis para esta amostra. Isto não significa que as publicações não tenham comentários."
            }
          />
        ) : null}

        {/* ── Métricas factuais (contagens reais) ── */}
        {data.state === "counts_only" || data.state === "intelligence" ? (
          <Card>
            <CardLabel>Resposta observada</CardLabel>
            <ul className="mt-[var(--ev2-s3)] flex flex-col gap-[var(--ev2-s2)]">
              <MetricRow
                label="Comentários públicos observados"
                value={String(data.counts.totalComments)}
              />
              <MetricRow
                label="Publicações com comentários"
                value={`${data.counts.postsWithComments} de ${data.counts.postsWithKnownCount}`}
              />
              {data.counts.averageComments !== null ? (
                <MetricRow
                  label="Média por publicação"
                  value={data.counts.averageComments.toLocaleString("pt-PT")}
                />
              ) : null}
            </ul>
            {data.counts.mostCommentedPost ? (
              <div className="mt-[var(--ev2-s3)] flex items-center gap-[var(--ev2-s2)] border-t pt-[var(--ev2-s3)]" style={{ borderColor: "var(--ev2-hair)" }}>
                <PostThumb
                  url={data.counts.mostCommentedPost.thumbnailUrl}
                  alt={`Publicação de ${data.counts.mostCommentedPost.date || "data desconhecida"}`}
                />
                <div className="min-w-0">
                  <p className="text-[12px] uppercase tracking-[0.14em] text-[var(--ev2-ink-3)]">
                    Publicação mais comentada
                  </p>
                  <p className="mt-[2px] text-[14px] text-[var(--ev2-ink)]">
                    <span className="ev2-tabular font-semibold">
                      {data.counts.mostCommentedPost.commentsCount}
                    </span>{" "}
                    comentários
                    {data.counts.mostCommentedPost.date
                      ? ` · ${data.counts.mostCommentedPost.date}`
                      : ""}
                  </p>
                </div>
              </div>
            ) : null}
          </Card>
        ) : null}

        {/* ── Estado B: sem enriquecimento ── */}
        {data.state === "counts_only" ? (
          <NoticeCard
            processing={data.unavailableReason === "processing"}
            title="Análise aprofundada das conversas indisponível"
            body="Conhecemos o número de comentários, mas o conteúdo dos comentários não foi analisado para este relatório. Não é possível afirmar que perguntas, objeções ou sinais de intenção existem ou não."
          />
        ) : null}

        {/* ── Estado C: enriquecimento real ── */}
        {data.state === "intelligence" && ci ? (
          <>
            <Card>
              <CardLabel>Resposta da marca</CardLabel>
              <p className="mt-[var(--ev2-s2)] text-[14px] font-medium text-[var(--ev2-ink)]">
                {classifyBrandReply(ci, t).config.label}
              </p>
              <p className="mt-[6px] max-w-[62ch] text-[14px] leading-[1.65] text-[var(--ev2-ink-2)]">
                {classifyBrandReply(ci, t).config.editorial}
              </p>
              {data.repliesMeasurable ? (
                <ul className="mt-[var(--ev2-s3)] flex flex-col gap-[var(--ev2-s2)] border-t pt-[var(--ev2-s3)]" style={{ borderColor: "var(--ev2-hair)" }}>
                  <MetricRow label="Respostas da marca" value={String(ci.ownerRepliesCount)} />
                  <MetricRow label="Taxa de resposta" value={`${ci.ownerReplyRatePct}%`} />
                  {ci.sampleReplies > 0 ? (
                    <MetricRow label="Respostas em thread" value={String(ci.sampleReplies)} />
                  ) : null}
                </ul>
              ) : (
                <p className="mt-[var(--ev2-s3)] border-t pt-[var(--ev2-s3)] text-[13px] leading-[1.6] text-[var(--ev2-ink-3)]" style={{ borderColor: "var(--ev2-hair)" }}>
                  {t("comments.replies_not_measurable.body")}
                </p>
              )}
            </Card>

            {excerptGroups.length > 0 ? (
              <Card>
                <CardLabel>Voz da audiência</CardLabel>
                <ul className="mt-[var(--ev2-s3)] flex flex-col gap-[var(--ev2-s3)]">
                  {excerptGroups.map((group) =>
                    group.items.map((item, i) => (
                      <li key={`${group.key}-${i}`} className="min-w-0">
                        <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--ev2-ink-3)]">
                          {group.label}
                        </p>
                        <p className="mt-[4px] break-words text-[15px] leading-[1.65] text-[var(--ev2-ink-2)]">
                          &ldquo;{item.text}&rdquo;
                        </p>
                        <p className="mt-[2px] text-[12px] text-[var(--ev2-ink-3)]">
                          @{item.username}
                        </p>
                      </li>
                    )),
                  )}
                </ul>
              </Card>
            ) : null}

            {signals.length > 0 ? (
              <Card>
                <CardLabel>Sinais observados</CardLabel>
                <ul className="mt-[var(--ev2-s3)] flex flex-col gap-[var(--ev2-s2)]">
                  {signals.map(([label, count]) => (
                    <MetricRow key={label} label={label} value={String(count)} />
                  ))}
                </ul>
              </Card>
            ) : null}

            {Array.isArray(ci.topConversationPosts) && ci.topConversationPosts.length > 0 ? (
              <Card>
                <CardLabel>Publicações com mais conversa</CardLabel>
                <ul className="mt-[var(--ev2-s3)] flex flex-col gap-[var(--ev2-s3)]">
                  {ci.topConversationPosts.map((post) => (
                    <li key={post.postUrl} className="flex min-w-0 items-start gap-[var(--ev2-s2)]">
                      <PostThumb url={post.thumbnailUrl ?? null} alt="Publicação com conversa" />
                      <div className="min-w-0">
                        <p className="ev2-tabular text-[13px] text-[var(--ev2-ink-3)]">
                          {post.audienceCommentsCount} comentários da audiência
                          {data.repliesMeasurable
                            ? ` · ${post.ownerRepliesCount} respostas da marca`
                            : ""}
                        </p>
                        <p className="mt-[4px] break-words text-[14px] leading-[1.6] text-[var(--ev2-ink-2)]">
                          {post.summary}
                        </p>
                        {post.topAudienceComment ? (
                          <p className="mt-[4px] break-words text-[13px] leading-[1.6] text-[var(--ev2-ink-3)]">
                            &ldquo;{post.topAudienceComment.text}&rdquo; — @
                            {post.topAudienceComment.username}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}

            {ci.recommendedConversationAction ? (
              <Card>
                <CardLabel>Próxima acção</CardLabel>
                <p className="mt-[var(--ev2-s2)] max-w-[62ch] text-[15px] leading-[1.65] text-[var(--ev2-ink-2)]">
                  {ci.recommendedConversationAction}
                </p>
              </Card>
            ) : null}

            {ci.limitations.length > 0 ? (
              <div className="flex flex-col gap-[6px]">
                {ci.limitations.map((l) => (
                  <p key={l} className="text-[12px] leading-[1.6] text-[var(--ev2-ink-3)]">
                    {l}
                  </p>
                ))}
              </div>
            ) : null}
          </>
        ) : null}

        {/* Detalhe técnico apenas em internal_lab, tal como em produção. */}
        {showTechnicalDetail && data.unavailableReason ? (
          <p className="text-[12px] text-[var(--ev2-ink-3)]">
            <MessageCircle aria-hidden="true" className="mr-[6px] inline size-[13px]" />
            comment_intelligence.reason: {data.unavailableReason}
          </p>
        ) : null}

        <ObservationBlock statements={observations} />
        {reading ? (
          <ReadingBlock hypothesis={reading.hypothesis} confidence={reading.confidence} />
        ) : null}
      </div>
    </ReportBand>
  );
}
