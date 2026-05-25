// Normalização isomórfica de inputs do Instagram para um handle limpo.
// Aceita username puro, @username, /username/, e URLs instagram.com/...
// Devolve "" quando o input não corresponde a um perfil válido.

const HANDLE_REGEX = /^[a-z0-9._]{1,30}$/;

const RESERVED_SEGMENTS = new Set([
  "p",
  "reel",
  "reels",
  "tv",
  "stories",
  "story",
  "explore",
  "accounts",
  "directory",
  "about",
  "developer",
  "developers",
  "legal",
  "press",
  "api",
  "web",
  "ads",
  "blog",
  "help",
  "session",
  "challenge",
  "oauth",
]);

const INSTAGRAM_HOSTS = new Set([
  "instagram.com",
  "www.instagram.com",
  "m.instagram.com",
]);

function stripZeroWidth(s: string): string {
  return s.replace(/[\u200B-\u200D\uFEFF]/g, "");
}

/**
 * Normaliza qualquer input razoável do utilizador para um handle de Instagram
 * em lowercase, ou devolve `""` se o input não for um perfil válido.
 *
 * Aceita:
 *  - "chatgptricks"
 *  - "@chatgptricks"
 *  - "/chatgptricks/"
 *  - "instagram.com/chatgptricks"
 *  - "www.instagram.com/chatgptricks/"
 *  - "https://www.instagram.com/chatgptricks/?hl=en"
 *
 * Rejeita (devolve ""):
 *  - string vazia
 *  - URLs cujo host não seja instagram.com
 *  - paths reservados (/p/, /reel/, /stories/, /explore/, ...)
 *  - caracteres inválidos após normalização
 */
export function normalizeInstagramHandle(input: string): string {
  if (typeof input !== "string") return "";
  let s = stripZeroWidth(input).trim();
  if (!s) return "";

  const looksLikeUrl = /:\/\//.test(s) || /^(?:www\.|m\.)?instagram\.com(?:\/|$)/i.test(s);

  if (looksLikeUrl) {
    // Garante prefixo de protocolo para o construtor URL
    const withProto = /:\/\//.test(s) ? s : `https://${s}`;
    let u: URL;
    try {
      u = new URL(withProto);
    } catch {
      return "";
    }
    const host = u.hostname.toLowerCase();
    if (!INSTAGRAM_HOSTS.has(host)) return "";
    const segments = u.pathname.split("/").filter(Boolean);
    if (segments.length === 0) return "";
    s = segments[0]!;
  } else {
    // Limpa @ e / nas pontas e fica só com o primeiro segmento.
    s = s.replace(/^@+/, "").replace(/^\/+/, "").replace(/\/+$/, "");
    s = s.split("/")[0] ?? "";
  }

  s = s.toLowerCase();

  if (!s) return "";
  if (RESERVED_SEGMENTS.has(s)) return "";
  if (!HANDLE_REGEX.test(s)) return "";

  return s;
}