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

/**
 * Faz fetch da imagem no CDN do Instagram com cabeçalhos credíveis e faz
 * upload para o bucket. Devolve o URL público estável ou `null` em caso
 * de falha.
 */
async function persistOne(
  rawUrl: string,
  storagePath: string,
): Promise<string | null> {
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
      console.warn(
        `[persist-thumbnails] upstream ${res.status} for ${storagePath}`,
      );
      return null;
    }
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) {
      console.warn(
        `[persist-thumbnails] non-image content-type ${contentType} for ${storagePath}`,
      );
      return null;
    }
    const buf = await res.arrayBuffer();
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
      console.warn(
        `[persist-thumbnails] upload error for ${finalPath}: ${upErr.message}`,
      );
      return null;
    }
    const { data } = supabaseAdmin.storage
      .from(BUCKET)
      .getPublicUrl(finalPath);
    return data.publicUrl ?? null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[persist-thumbnails] fetch failed for ${storagePath}: ${msg}`);
    return null;
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

/**
 * Reescreve in-place o `normalized_payload`:
 *  - `posts[*].thumbnail_url` (se for URL do CDN do IG) → URL do bucket.
 *  - `profile.avatar_url` (se for URL do CDN do IG) → URL do bucket.
 *
 * Mantém URLs já persistidas ou de outros domínios intactas.
 * Devolve um resumo para logs.
 */
export async function persistThumbnailsInPayload(
  cacheKey: string,
  payload: Record<string, unknown>,
): Promise<{ posts_total: number; posts_success: number; avatar_success: boolean | null }> {
  const folder = safeKeySegment(cacheKey);

  // Posts
  const postsRaw = (payload as { posts?: unknown }).posts;
  const posts = Array.isArray(postsRaw) ? (postsRaw as Record<string, unknown>[]) : [];

  const targets = posts
    .map((p, idx) => ({ post: p, idx }))
    .filter(({ post }) => isIgCdnUrl(post.thumbnail_url));

  const postResults = await mapWithConcurrency(
    targets,
    async ({ post, idx }) => {
      const shortcodeRaw =
        typeof post.shortcode === "string" && post.shortcode.length > 0
          ? post.shortcode
          : typeof post.id === "string"
            ? post.id
            : `idx-${idx}`;
      const path = `${folder}/${safeKeySegment(shortcodeRaw)}`;
      const publicUrl = await persistOne(post.thumbnail_url as string, path);
      if (publicUrl) {
        post.thumbnail_url = publicUrl;
      } else {
        post.thumbnail_url = null;
      }
      return Boolean(publicUrl);
    },
    CONCURRENCY,
  );

  // Avatar
  const profile = (payload as { profile?: Record<string, unknown> }).profile;
  let avatarSuccess: boolean | null = null;
  if (profile && isIgCdnUrl(profile.avatar_url)) {
    const path = `${folder}/avatar`;
    const publicUrl = await persistOne(profile.avatar_url as string, path);
    if (publicUrl) {
      profile.avatar_url = publicUrl;
      avatarSuccess = true;
    } else {
      profile.avatar_url = null;
      avatarSuccess = false;
    }
  }

  return {
    posts_total: targets.length,
    posts_success: postResults.filter(Boolean).length,
    avatar_success: avatarSuccess,
  };
}