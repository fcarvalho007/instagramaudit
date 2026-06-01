/**
 * Política central de retenção de relatórios + cache.
 *
 * Source of truth única: nenhum outro ficheiro do projecto deve definir TTLs
 * de relatórios ou snapshots. Importar daqui.
 *
 * Distinção semântica (mesmo valor hoje, podem divergir no futuro):
 *
 *   REPORT_RETENTION_DAYS — durante quanto tempo um relatório gerado fica
 *     acessível ao utilizador como "histórico revisitável".
 *
 *   CACHE_TTL_DAYS — durante quanto tempo um snapshot é considerado
 *     suficientemente fresco para evitar uma nova chamada ao provider
 *     (Apify) e ser servido directamente da BD.
 */

/** Janela de acesso ao relatório gerado. */
export const REPORT_RETENTION_DAYS = 15;

/**
 * Source of truth dinâmica (lazy): chave `report_retention_days` em
 * `app_config`. Helper async disponível para futuras server functions que
 * queiram ler de runtime. **Não ligado** ainda aos consumidores actuais —
 * `REPORT_RETENTION_DAYS` continua a ser a constante usada em testes e
 * paths síncronos. Fallback = 15 caso a leitura falhe.
 */
export async function getReportRetentionDays(): Promise<number> {
  try {
    const { readAppConfigValue, parseConfigInt } = await import(
      "@/lib/config/app-config.server"
    );
    const raw = await readAppConfigValue(
      "report_retention_days",
      String(REPORT_RETENTION_DAYS),
    );
    return parseConfigInt(raw, REPORT_RETENTION_DAYS);
  } catch {
    return REPORT_RETENTION_DAYS;
  }
}

/**
 * TTL do snapshot de cache. Hoje igual à retenção do relatório, mas
 * mantido como constante separada para permitir divergência futura
 * (ex.: cache curta + retenção longa) sem refactor.
 */
export const CACHE_TTL_DAYS = REPORT_RETENTION_DAYS;

const MS_PER_DAY = 86_400_000;
const MS_PER_HOUR = 3_600_000;

export const REPORT_RETENTION_MS = REPORT_RETENTION_DAYS * MS_PER_DAY;
export const CACHE_TTL_MS = CACHE_TTL_DAYS * MS_PER_DAY;

/**
 * Política de frescura (Junho 2026):
 *
 *  - Snapshots com idade `< CACHE_REUSE_MAX_HOURS` (24h) são servidos da
 *    cache sem chamar o provider.
 *  - Acima dessa janela, o endpoint público corre uma análise nova
 *    automaticamente; falha → fallback ao snapshot existente com aviso.
 *  - Entre `REFRESH_BUTTON_AFTER_HOURS` (12h) e `CACHE_REUSE_MAX_HOURS`
 *    (24h) a UI mostra um CTA "Actualizar análise" para refresh manual.
 *
 * Estas constantes substituem o TTL de 15 dias **só para a decisão
 * cache-vs-fresh**. `REPORT_RETENTION_MS` continua a controlar:
 *   - acesso histórico ao relatório,
 *   - janela de fallback `isWithinStaleWindow`.
 */
export const CACHE_REUSE_MAX_HOURS = 24;
export const CACHE_REUSE_MAX_MS = CACHE_REUSE_MAX_HOURS * MS_PER_HOUR;

export const REFRESH_BUTTON_AFTER_HOURS = 12;
export const REFRESH_BUTTON_AFTER_MS = REFRESH_BUTTON_AFTER_HOURS * MS_PER_HOUR;

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

/**
 * Devolve a data exacta em que um relatório criado em `createdAt` expira.
 * Usar para derivar `expires_at` quando a tabela não o persiste (ex.:
 * `report_requests`).
 */
export function getReportExpiresAt(createdAt: string | Date): Date {
  const created = toDate(createdAt);
  return new Date(created.getTime() + REPORT_RETENTION_MS);
}

/**
 * `true` quando o relatório/snapshot já passou da janela de retenção.
 * `expiresAt = null` é tratado como "ainda não expirado" (defensivo —
 * preferimos não bloquear acesso por falta de metadata).
 */
export function isReportExpired(
  expiresAt: string | Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (expiresAt === null || expiresAt === undefined) return false;
  const expires = toDate(expiresAt);
  if (!Number.isFinite(expires.getTime())) return false;
  return expires.getTime() <= now.getTime();
}

/**
 * Aliases semânticos para `report_snapshots`. Hoje partilham a mesma
 * janela `REPORT_RETENTION_DAYS` mas mantêm assinatura própria para
 * permitir divergência futura sem refactor dos call sites.
 */
export function getReportSnapshotExpiresAt(createdAt: string | Date): Date {
  return getReportExpiresAt(createdAt);
}

export function isReportSnapshotExpired(
  expiresAt: string | Date | null | undefined,
  now: Date = new Date(),
): boolean {
  return isReportExpired(expiresAt, now);
}

/** Mensagem human-readable usada em banners / empty states. */
export function formatRetentionMessage(): string {
  return `Os relatórios ficam disponíveis durante ${REPORT_RETENTION_DAYS} dias após a geração.`;
}