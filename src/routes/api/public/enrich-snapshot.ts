/**
 * Async enrichment endpoint — job-table-driven, idempotent.
 *
 * Two modes:
 *   1. `{ snapshot_id: "uuid" }` — process all pending jobs for a snapshot
 *   2. `{ sweep: true }`        — pick oldest pending jobs and process them
 *
 * Protected by INTERNAL_API_TOKEN. Called fire-and-forget by the main
 * analysis endpoint and periodically by pg_cron as a safety net.
 */

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { patchSnapshotPayload, removePayloadKey, setEnrichmentStatusAtomic } from "@/lib/analysis/cache";
import { linkProviderCallsToEvent } from "@/lib/analysis/events";
import { runEnrichment } from "@/lib/enrichment/run-enrichment.server";
import type { EnrichmentType, EnrichmentJobRow } from "@/lib/enrichment/types";

const LOG = "[enrich-snapshot]";
const MAX_JOBS_PER_SWEEP = 10;

export const Route = createFileRoute("/api/public/enrich-snapshot")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        }),

      POST: async ({ request }) => {
        // Auth gate — accepts INTERNAL_API_TOKEN (Bearer) or apikey header (for pg_cron sweep)
        const internalToken = process.env.INTERNAL_API_TOKEN;
        const authHeader = request.headers.get("authorization") ?? "";
        const apikey = request.headers.get("apikey") ?? "";
        const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
        const validBearer = internalToken && authHeader === `Bearer ${internalToken}`;
        const validApikey = anonKey && apikey === anonKey;
        if (!validBearer && !validApikey) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        let body: { snapshot_id?: string; sweep?: boolean } = {};
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "invalid body" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        let jobs: EnrichmentJobRow[] = [];

        if (body.snapshot_id) {
          // Mode 1: process all pending jobs for a specific snapshot
          const { data, error } = await supabaseAdmin
            .from("enrichment_jobs")
            .select("*")
            .eq("snapshot_id", body.snapshot_id)
            .eq("status", "pending")
            .order("priority", { ascending: true });
          if (error) {
            console.error(`${LOG} query error`, error.message);
            return new Response(JSON.stringify({ error: error.message }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }
          jobs = (data ?? []) as EnrichmentJobRow[];
        } else if (body.sweep) {
          // Mode 2: sweep oldest pending jobs globally
          const { data, error } = await supabaseAdmin
            .from("enrichment_jobs")
            .select("*")
            .eq("status", "pending")
            .order("priority", { ascending: true })
            .order("created_at", { ascending: true })
            .limit(MAX_JOBS_PER_SWEEP);
          if (error) {
            console.error(`${LOG} sweep query error`, error.message);
            return new Response(JSON.stringify({ error: error.message }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }
          jobs = (data ?? []) as EnrichmentJobRow[];
        } else {
          return new Response(
            JSON.stringify({ error: "provide snapshot_id or sweep:true" }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        if (jobs.length === 0) {
          return new Response(
            JSON.stringify({ processed: 0 }),
            { headers: { "Content-Type": "application/json" } },
          );
        }

        let processed = 0;
        let succeeded = 0;
        let failed = 0;

        for (const job of jobs) {
          // Skip if max attempts reached
          if (job.attempts >= job.max_attempts) {
            await supabaseAdmin
              .from("enrichment_jobs")
              .update({
                status: "error",
                error_message: "max attempts reached",
                completed_at: new Date().toISOString(),
              })
              .eq("id", job.id);
            failed += 1;
            continue;
          }

          // Mark as running
          await supabaseAdmin
            .from("enrichment_jobs")
            .update({
              status: "running",
              attempts: job.attempts + 1,
              started_at: new Date().toISOString(),
            })
            .eq("id", job.id);

          // Load snapshot
          const { data: snapshot, error: snapErr } = await supabaseAdmin
            .from("analysis_snapshots")
            .select("*")
            .eq("id", job.snapshot_id)
            .single();

          if (snapErr || !snapshot) {
            console.error(`${LOG} snapshot not found`, job.snapshot_id);
            await supabaseAdmin
              .from("enrichment_jobs")
              .update({
                status: "error",
                error_message: "snapshot not found",
                completed_at: new Date().toISOString(),
              })
              .eq("id", job.id);
            failed += 1;
            continue;
          }

          // Run enrichment
          const result = await runEnrichment(
            job.enrichment_type as EnrichmentType,
            snapshot as any,
            job.analysis_event_id,
          );

          if (result.ok) {
            // Patch snapshot if there's a payload patch
            if (result.payloadPatch) {
              const patched = await patchSnapshotPayload(
                job.snapshot_id,
                result.payloadPatch,
              );
              if (!patched) {
                console.error(`${LOG} failed to patch snapshot for job`, job.id);
              }
            }

            // Distinguish silent skips with a reason (e.g. provider gate /
            // budget) from real successes so admin can audit them.
            const isSkip =
              result.payloadPatch === null &&
              typeof result.skipReason === "string" &&
              result.skipReason.length > 0;

            await setEnrichmentStatusAtomic(
              job.snapshot_id,
              job.enrichment_type,
              isSkip ? "skipped" : "success",
            );

            await supabaseAdmin
              .from("enrichment_jobs")
              .update({
                status: isSkip ? "skipped" : "success",
                completed_at: new Date().toISOString(),
                error_message: isSkip ? (result.skipReason as string) : null,
              })
              .eq("id", job.id);
            succeeded += 1;

            // After visual_cover succeeds, remove bulky base64 thumbnails
            if (!isSkip && job.enrichment_type === "visual_cover") {
              await removePayloadKey(job.snapshot_id, "_thumbnail_base64");
            }
          } else {
            const finalFailure = job.attempts + 1 >= job.max_attempts;
            // Update enrichment_status on final failure
            if (finalFailure) {
              await setEnrichmentStatusAtomic(job.snapshot_id, job.enrichment_type, "error");
            }

            await supabaseAdmin
              .from("enrichment_jobs")
              .update({
                status: finalFailure ? "error" : "pending",
                error_message: result.error ?? "unknown error",
                completed_at: new Date().toISOString(),
              })
              .eq("id", job.id);
            failed += 1;
          }

          processed += 1;
        }

        // Final provider call linkage for all jobs with an analysis_event_id
        const eventIds = new Set(
          jobs
            .filter((j) => j.analysis_event_id)
            .map((j) => j.analysis_event_id!),
        );
        for (const eventId of eventIds) {
          const handle = jobs.find((j) => j.analysis_event_id === eventId)?.handle;
          if (handle) {
            // Link any orphaned provider calls created during enrichment
            const oldestJob = jobs
              .filter((j) => j.analysis_event_id === eventId)
              .sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
            if (oldestJob) {
              await linkProviderCallsToEvent(
                handle,
                new Date(oldestJob.created_at),
                eventId,
              );
            }
          }
        }

        console.info(`${LOG} done`, { processed, succeeded, failed });
        return new Response(
          JSON.stringify({ processed, succeeded, failed }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});