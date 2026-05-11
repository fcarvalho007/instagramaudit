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
 * TTL do snapshot de cache. Hoje igual à retenção do relatório, mas
 * mantido como constante separada para permitir divergência futura
 * (ex.: cache curta + retenção longa) sem refactor.
 */
export const CACHE_TTL_DAYS = REPORT_RETENTION_DAYS;

const MS_PER_DAY = 86_400_000;

export const REPORT_RETENTION_MS = REPORT_RETENTION_DAYS * MS_PER_DAY;
export const CACHE_TTL_MS = CACHE_TTL_DAYS * MS_PER_DAY;

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

/** Mensagem human-readable usada em banners / empty states. */
export function formatRetentionMessage(): string {
  return `Os relatórios ficam disponíveis durante ${REPORT_RETENTION_DAYS} dias após a geração.`;
}