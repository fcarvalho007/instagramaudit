/**
 * POST /api/public/inline-feedback
 *
 * Captura feedback rápido (1–5 emojis) entre blocos do relatório.
 * Público (sem auth) — protegido por:
 * - validação Zod estrita (handle slug, enum block, rating 1..5)
 * - rate-limit in-memory por (handle + ipHash) — 1 req / 3s
 * - grava ip_hash e user_agent truncado
 */

import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "node:crypto";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function ipHash(ip: string | null): string | null {
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

function clientIp(request: Request): string | null {
  const xf = request.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() ?? null;
  return request.headers.get("cf-connecting-ip") ?? null;
}

const recent = new Map<string, number>();
const RATE_WINDOW_MS = 3_000;

function rateLimited(key: string): boolean {
  const now = Date.now();
  const last = recent.get(key);
  if (last && now - last < RATE_WINDOW_MS) return true;
  recent.set(key, now);
  if (recent.size > 1000) {
    for (const [k, t] of recent) {
      if (now - t > RATE_WINDOW_MS * 4) recent.delete(k);
    }
  }
  return false;
}

const InlineFeedbackSchema = z.object({
  handle: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-zA-Z0-9._-]+$/),
  snapshot_id: z.string().uuid().nullable().optional(),
  block: z.enum(["overview", "diagnostic", "performance", "content"]),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1).max(500).optional(),
});

export const Route = createFileRoute("/api/public/inline-feedback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return json({ ok: false, code: "INVALID_PAYLOAD" }, 400);
        }

        const parsed = InlineFeedbackSchema.safeParse(raw);
        if (!parsed.success) {
          return json({ ok: false, code: "INVALID_PAYLOAD" }, 400);
        }
        const { handle, snapshot_id, block, rating, comment } = parsed.data;

        const ip = clientIp(request);
        const ip_hash = ipHash(ip);
        const hasComment = typeof comment === "string" && comment.length > 0;
        const rateKey = `${handle}:${ip_hash ?? "anon"}`;
        // Só rate-limit em votos sem comentário. Comentários são acções
        // intencionais e seguem-se quase sempre ao clique do emoji.
        if (!hasComment && rateLimited(rateKey)) {
          // Resposta opaca para não revelar bloqueio.
          return json({ ok: true });
        }

        const userAgent =
          request.headers.get("user-agent")?.slice(0, 255) ?? null;

        // Caminho 1 — comentário: tentar anexar ao registo recente de
        // rating do mesmo (handle, block, ip_hash) sem comentário.
        if (hasComment) {
          const since = new Date(Date.now() - 15 * 60_000).toISOString();
          let targetId: string | null = null;
          if (ip_hash) {
            const { data: recentRow } = await supabaseAdmin
              .from("inline_report_feedback")
              .select("id")
              .eq("handle", handle)
              .eq("block", block)
              .eq("ip_hash", ip_hash)
              .is("comment", null)
              .gte("created_at", since)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            targetId = recentRow?.id ?? null;
          }

          if (targetId) {
            const { error: updateErr } = await supabaseAdmin
              .from("inline_report_feedback")
              .update({ comment, user_agent: userAgent })
              .eq("id", targetId);
            if (updateErr) {
              return json({ ok: false, code: "WRITE_FAILED" }, 500);
            }
            return json({ ok: true });
          }

          // Fallback — sem rating prévio, grava novo registo com comentário.
          const { error: insertErr } = await supabaseAdmin
            .from("inline_report_feedback")
            .insert({
              handle,
              snapshot_id: snapshot_id ?? null,
              block,
              rating,
              comment,
              user_agent: userAgent,
              ip_hash,
            });
          if (insertErr) {
            return json({ ok: false, code: "WRITE_FAILED" }, 500);
          }
          return json({ ok: true });
        }

        // Caminho 2 — só rating.
        const { error } = await supabaseAdmin
          .from("inline_report_feedback")
          .insert({
            handle,
            snapshot_id: snapshot_id ?? null,
            block,
            rating,
            comment: null,
            user_agent: userAgent,
            ip_hash,
          });

        if (error) {
          return json({ ok: false, code: "WRITE_FAILED" }, 500);
        }
        return json({ ok: true });
      },
    },
  },
});