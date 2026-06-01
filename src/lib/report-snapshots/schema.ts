/**
 * Zod schema for the immutable historical report payload.
 *
 * Keep this minimal: only fields required to render the historical report.
 * Anything provider-specific or pipeline-state belongs in `analysis_snapshots`,
 * not here.
 */
import { z } from "zod";

const httpsUrl = z
  .string()
  .refine((v) => !v.startsWith("data:"), "base64 data URLs are forbidden");

const ProfileSchema = z.object({
  username: z.string(),
  display_name: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  is_business: z.boolean().optional(),
  is_verified: z.boolean().optional(),
  followers_count: z.number().nullable().optional(),
  following_count: z.number().nullable().optional(),
  posts_count: z.number().nullable().optional(),
  avatar_url: httpsUrl.nullable().optional(),
});

const PostSchema = z.object({
  id: z.string().optional(),
  shortcode: z.string().optional(),
  permalink: z.string().optional(),
  format: z.string().optional(),
  taken_at_iso: z.string().optional(),
  weekday: z.number().nullable().optional(),
  hour_local: z.number().nullable().optional(),
  caption: z.string().optional(),
  caption_length: z.number().optional(),
  hashtags: z.array(z.string()).optional(),
  mentions: z.array(z.string()).optional(),
  likes: z.number().nullable().optional(),
  comments: z.number().nullable().optional(),
  video_views: z.number().nullable().optional(),
  video_duration: z.number().nullable().optional(),
  engagement_pct: z.number().nullable().optional(),
  thumbnail_url: httpsUrl.nullable().optional(),
  thumbnail_storage_url: httpsUrl.nullable().optional(),
  is_pinned: z.boolean().nullable().optional(),
});

export const ReportPayloadV1Schema = z.object({
  schema_version: z.literal("report.v1"),
  algorithm_version: z.string(),
  generated_at: z.string(),
  handle: z.string(),
  network: z.string().default("instagram"),
  competitors: z.array(z.string()).default([]),
  language: z.string().default("pt-PT"),
  profile: ProfileSchema,
  metrics: z.record(z.string(), z.unknown()).default({}),
  format_stats: z.record(z.string(), z.unknown()).optional(),
  content_summary: z.record(z.string(), z.unknown()).optional(),
  posts: z.array(PostSchema).max(30),
  competitor_summaries: z.array(z.record(z.string(), z.unknown())).optional(),
  insights: z.record(z.string(), z.unknown()).optional(),
  data_provenance: z.record(z.string(), z.unknown()).optional(),
});

export type ReportPayloadV1 = z.infer<typeof ReportPayloadV1Schema>;

export const REPORT_PAYLOAD_SCHEMA_VERSION = "report.v1" as const;
export const REPORT_VERSION_FREE_V1 = "free.v1" as const;
export const ALGORITHM_VERSION_V1 = "analysis.v1" as const;