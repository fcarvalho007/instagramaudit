/**
 * Client-safe types for the Socialinsider Instagram reference dataset.
 * The runtime reader lives in `socialinsider-context.server.ts` and uses
 * `supabaseAdmin`; only these types may cross into client bundles.
 */

export interface SocialinsiderFormatRef {
  postsPerMonth: number | null;
  engagementPct: number | null;
  sourceName: string;
  sourceUrl: string | null;
  dataRange: { from: string; to: string | null };
}

export interface SocialinsiderInstagramContext {
  reel: SocialinsiderFormatRef | null;
  carousel: SocialinsiderFormatRef | null;
  image: SocialinsiderFormatRef | null;
}