import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin/session";
import {
  listBenchmarks,
  upsertBenchmark,
} from "@/lib/knowledge/queries.server";

const TIER = z.enum(["nano", "micro", "mid", "macro"]);
const FORMAT = z.enum(["reels", "carousels", "images"]);
const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "data ISO YYYY-MM-DD");

const UpsertSchema = z.object({
  id: z.string().uuid().optional(),
  tier: TIER,
  format: FORMAT,
  engagement_pct: z.number().min(0).max(100),
  sample_size: z.number().int().min(1),
  source_id: z.string().uuid().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  valid_from: DATE,
  valid_to: DATE.nullable().optional(),
  origin: z.enum(["manual", "system_suggested", "system_approved"]).optional(),
});

export const Route = createFileRoute("/api/admin/knowledge/benchmarks")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try { await requireAdminSession(); }
        catch (res) { if (res instanceof Response) return res; throw res; }
        const url = new URL(request.url);
        const formatParam = url.searchParams.get("format");
        try {
          const data = await listBenchmarks({
            format:
              formatParam === "reels" || formatParam === "carousels" || formatParam === "images"
                ? formatParam
                : "all",
          });
          return Response.json(data);
        } catch (err) {
          return Response.json(
            { error: err instanceof Error ? err.message : "unknown" },
            { status: 500 },
          );
        }
      },
      POST: async ({ request }) => {
        let user;
        try { user = await requireAdminSession(); }
        catch (res) { if (res instanceof Response) return res; throw res; }
        let body: unknown;
        try { body = await request.json(); }
        catch { return new Response("Invalid JSON", { status: 400 }); }
        const parsed = UpsertSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json({ error: parsed.error.flatten() }, { status: 400 });
        }
        try {
          const row = await upsertBenchmark(parsed.data, user.email);
          return Response.json(row);
        } catch (err) {
          return Response.json(
            { error: err instanceof Error ? err.message : "unknown" },
            { status: 500 },
          );
        }
      },
    },
  },
});
