/**
 * GET /api/public/ig-thumb?url=<encoded cdninstagram url>
 *
 * Proxy server-side para imagens do Instagram CDN. O browser não consegue
 * carregar URLs `*.cdninstagram.com` diretamente (bloqueio cross-origin /
 * hotlinking), por isso o servidor faz o fetch com cabeçalhos credíveis e
 * devolve o binário ao cliente.
 *
 * Anti-SSRF: aceita apenas hostnames `*.cdninstagram.com` (e
 * `*.fbcdn.net`, usado às vezes pela mesma infraestrutura).
 *
 * Sem custos provider — não chama Apify, OpenAI nem DataForSEO.
 */

import { createFileRoute } from "@tanstack/react-router";

const ALLOWED_SUFFIXES = [".cdninstagram.com", ".fbcdn.net"];

function isAllowedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return ALLOWED_SUFFIXES.some((s) => h.endsWith(s));
}

export const Route = createFileRoute("/api/public/ig-thumb")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const target = url.searchParams.get("url");
        if (!target) {
          return new Response("missing url", { status: 400 });
        }

        let parsed: URL;
        try {
          parsed = new URL(target);
        } catch {
          return new Response("invalid url", { status: 400 });
        }

        if (parsed.protocol !== "https:" || !isAllowedHost(parsed.hostname)) {
          return new Response("forbidden host", { status: 400 });
        }

        try {
          const upstream = await fetch(parsed.toString(), {
            method: "GET",
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
              Referer: "https://www.instagram.com/",
              Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
              "Accept-Language": "en-US,en;q=0.9,pt;q=0.8",
            },
            redirect: "follow",
          });

          if (!upstream.ok || !upstream.body) {
            return new Response("upstream error", { status: 404 });
          }

          const contentType =
            upstream.headers.get("content-type") ?? "image/jpeg";
          if (!contentType.startsWith("image/")) {
            return new Response("not an image", { status: 404 });
          }

          return new Response(upstream.body, {
            status: 200,
            headers: {
              "Content-Type": contentType,
              "Cache-Control":
                "public, max-age=86400, s-maxage=604800, immutable",
              "X-Content-Type-Options": "nosniff",
            },
          });
        } catch {
          return new Response("fetch failed", { status: 502 });
        }
      },
    },
  },
});