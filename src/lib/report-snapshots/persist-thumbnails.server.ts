/**
 * Persiste thumbnails de posts e avatars de perfil no bucket público
 * `post-thumbnails` do Supabase Storage. Substitui as URLs do CDN do
 * Instagram (que recusam pedidos server-to-server com 403) por URLs
 * permanentes do nosso bucket.
 *
 * Server-only — usa o `supabaseAdmin` (service role).
 *
 * Best-effort: cada falha individual (403 do IG CDN, timeout, tipo MIME
 * inválido) é logada e o thumbnail correspondente fica `null`. O fallback
 * visual (ícone de formato, iniciais do avatar) já está implementado nos
 * componentes.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BUCKET = "post-thumbnails";
const CONCURRENCY = 4;
const FETCH_TIMEOUT_MS = 8000;
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const IG_HOSTS = [".cdninstagram.com", ".fbcdn.net"];

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function isIgCdnUrl(url: unknown): url is string {
  if (typeof url !== "string" || url.length === 0) return false;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    const h = u.hostname.toLowerCase();
    return IG_HOSTS.some((s) => h.endsWith(s));
  } catch {
    return false;
  }
}

function safeKeySegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
}

function extFromContentType(ct: string): string {
  if (ct.includes("png")) return "png";
  if (ct.includes("webp")) return "webp";
  return "jpg";
}

export type PersistFailureReason =
  | "ok"
  | "failed_403"
  | "failed_timeout"
  | "failed_invalid_content_type"
  | "failed_upload"
  | "failed_other";

export interface PersistOneResult {
  publicUrl: string | null;
  reason: PersistFailureReason;
}

/**
 * Faz fetch da imagem no CDN do Instagram com cabeçalhos credíveis e faz
 * upload para o bucket. Devolve `{ publicUrl, reason }`. Nunca lança.
 */
export async function persistOne(
  rawUrl: string,
  storagePath: string,
): Promise<PersistOneResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(rawUrl, {
      method: "GET",
      headers: {
        "User-Agent": UA,
        Referer: "https://www.instagram.com/",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,pt;q=0.8",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!res.ok) {
      return {
        publicUrl: null,
        reason: res.status === 403 ? "failed_403" : "failed_other",
      };
    }
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) {
      return { publicUrl: null, reason: "failed_invalid_content_type" };
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) {
      return { publicUrl: null, reason: "failed_invalid_content_type" };
    }
    const ext = extFromContentType(contentType);
    const finalPath = `${storagePath}.${ext}`;
    const { error: upErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(finalPath, buf, {
        upsert: true,
        contentType,
        cacheControl: "31536000",
      });
    if (upErr) {
      return { publicUrl: null, reason: "failed_upload" };
    }
    const { data } = supabaseAdmin.storage
      .from(BUCKET)
      .getPublicUrl(finalPath);
    return data.publicUrl
      ? { publicUrl: data.publicUrl, reason: "ok" }
      : { publicUrl: null, reason: "failed_upload" };
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    return {
      publicUrl: null,
      reason: name === "AbortError" ? "failed_timeout" : "failed_other",
    };
  } finally {
    clearTimeout(timer);
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  worker: (item: T, idx: number) => Promise<R>,
  limit: number,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function runner() {
    while (true) {
      const idx = cursor++;
      if (idx >= items.length) return;
      results[idx] = await worker(items[idx], idx);
    }
  }
  const runners = Array.from(
    { length: Math.min(limit, items.length) },
    () => runner(),
  );
  await Promise.all(runners);
  return results;
}

export interface PersistSummary {
  attempted: number;
  stored: number;
  failed_403: number;
  failed_timeout: number;
  failed_invalid_content_type: number;
  failed_upload: number;
  failed_other: number;
  avatar: "ok" | "fail" | "none";
}

function emptySummary(): PersistSummary {
  return {
    attempted: 0,
    stored: 0,
    failed_403: 0,
    failed_timeout: 0,
    failed_invalid_content_type: 0,
    failed_upload: 0,
    failed_other: 0,
    avatar: "none",
  };
}

function bump(summary: PersistSummary, reason: PersistFailureReason) {
  if (reason === "ok") {
    summary.stored += 1;
    return;
  }
  // TS-safe increment without index signature.
  switch (reason) {
    case "failed_403":
      summary.failed_403 += 1;
      break;
    case "failed_timeout":
      summary.failed_timeout += 1;
      break;
    case "failed_invalid_content_type":
      summary.failed_invalid_content_type += 1;
      break;
    case "failed_upload":
      summary.failed_upload += 1;
      break;
    case "failed_other":
      summary.failed_other += 1;
      break;
  }
}

/**
 * Aditivo, não destrutivo: escreve em `posts[*].thumbnail_storage_url` e
 * `profile.avatar_storage_url` quando o upload é bem-sucedido. O URL original
 * do CDN (`thumbnail_url`/`avatar_url`) NUNCA é alterado — o browser ainda
 * consegue carregá-lo mesmo quando o fetch server-to-server é 403.
 *
 * Devolve contadores estruturados para logging.
 */
export async function persistThumbnailsInPayload(
  cacheKey: string,
  payload: Record<string, unknown>,
): Promise<PersistSummary> {
  const folder = safeKeySegment(cacheKey);
  const summary = emptySummary();

  // Posts
  const postsRaw = (payload as { posts?: unknown }).posts;
  const posts = Array.isArray(postsRaw) ? (postsRaw as Record<string, unknown>[]) : [];

  const targets = posts
    .map((p, idx) => ({ post: p, idx }))
    .filter(({ post }) => isIgCdnUrl(post.thumbnail_url));
  summary.attempted = targets.length;

  await mapWithConcurrency(
    targets,
    async ({ post, idx }) => {
      const shortcodeRaw =
        typeof post.shortcode === "string" && post.shortcode.length > 0
          ? post.shortcode
          : typeof post.id === "string"
            ? post.id
            : `idx-${idx}`;
      const path = `${folder}/${safeKeySegment(shortcodeRaw)}`;
      const result = await persistOne(post.thumbnail_url as string, path);
      bump(summary, result.reason);
      // Aditivo: nunca tocamos em `thumbnail_url`.
      post.thumbnail_storage_url = result.publicUrl;
      return result.publicUrl;
    },
    CONCURRENCY,
  );

  // Avatar
  const profile = (payload as { profile?: Record<string, unknown> }).profile;
  if (profile && isIgCdnUrl(profile.avatar_url)) {
    const path = `${folder}/avatar`;
    const result = await persistOne(profile.avatar_url as string, path);
    profile.avatar_storage_url = result.publicUrl;
    summary.avatar = result.publicUrl ? "ok" : "fail";
  }

  return summary;
}