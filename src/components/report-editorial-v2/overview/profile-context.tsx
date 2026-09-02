import { StatusPill } from "../primitives/status-pill";
import type { EditorialOverviewData } from "./overview-data";

const nf = new Intl.NumberFormat("pt-PT");

/**
 * Coluna de contexto: identidade real do perfil e janela de análise.
 * Todos os valores vêm dos dados de produção — nada é escrito à mão.
 */
export function ProfileContext({
  profile,
  windowLabel,
}: {
  profile: EditorialOverviewData["profile"];
  windowLabel: string | null;
}) {
  return (
    <div className="flex flex-col gap-[var(--ev2-s3)]">
      <div className="flex min-w-0 items-center gap-[12px]">
        {profile.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt={`Fotografia de perfil de @${profile.username}`}
            loading="lazy"
            className="size-[48px] shrink-0 rounded-full border border-[var(--ev2-hair-2)] object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="grid size-[48px] shrink-0 place-items-center rounded-full border border-[var(--ev2-hair-2)] bg-[var(--ev2-blue-4)] text-[16px] text-[var(--ev2-blue)]"
          >
            {profile.username.slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-[16px] font-semibold text-[var(--ev2-ink)]">
            @{profile.username}
          </p>
          {profile.fullName ? (
            <p className="truncate text-[13px] text-[var(--ev2-ink-3)]">
              {profile.fullName}
            </p>
          ) : null}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-[var(--ev2-s2)] border-t border-[var(--ev2-hair)] pt-[var(--ev2-s2)]">
        <div>
          <dt className="text-[12px] uppercase tracking-[0.12em] text-[var(--ev2-ink-3)]">
            Seguidores
          </dt>
          <dd className="ev2-tabular text-[20px] text-[var(--ev2-ink)]">
            {nf.format(profile.followers)}
          </dd>
        </div>
        <div>
          <dt className="text-[12px] uppercase tracking-[0.12em] text-[var(--ev2-ink-3)]">
            Publicações analisadas
          </dt>
          <dd className="ev2-tabular text-[20px] text-[var(--ev2-ink)]">
            {nf.format(profile.postsAnalyzed)}
          </dd>
        </div>
      </dl>

      <div className="flex flex-wrap items-center gap-[8px]">
        {profile.tierLabel ? (
          <StatusPill tone="neutral" label={`Escalão ${profile.tierLabel}`} />
        ) : null}
        {windowLabel ? (
          <span className="text-[13px] text-[var(--ev2-ink-2)]">
            Janela: {windowLabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}
