import { normalizeProfile, computeContentSummary, enrichPosts } from "@/lib/analysis/normalize";
export function canonicalFixture() {
  const make = (username: string, followersCount: number, likes: number) => {
    const raw = Array.from({ length: 12 }, (_, i) => ({
      id: `${username}-${i}`,
      shortCode: `post${i}`,
      type: "Video",
      caption: `Uma publicação concreta #exemplo ${i}`,
      likesCount: likes,
      commentsCount: 2,
      timestamp: new Date(Date.UTC(2026, 8, 9 - i, 12)).toISOString(),
      url: `https://www.instagram.com/p/post${i}/`,
    }));
    const profile = normalizeProfile({
      username,
      fullName: username,
      followersCount,
      verified: false,
      biography: "Bio",
    } as never)!;
    return {
      success: true,
      profile,
      content_summary: computeContentSummary(raw, followersCount),
      ...enrichPosts(raw, followersCount),
    };
  };
  return {
    ...make("alpha", 1000, 20),
    analysis_window_end: "2026-09-10T12:00:00Z",
    analysis_window: "30d",
    competitors: [make("beta", 2000, 30), make("gamma", 1500, 10)],
  };
}
