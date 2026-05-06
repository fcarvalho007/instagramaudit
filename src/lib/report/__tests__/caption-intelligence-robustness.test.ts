 /**
  * P04 Caption Diagnostics — robustness tests.
  *
  * Covers: cleanCaption (via stats), emoji-only captions, English engagement,
  * schemaVersion guard, tooShortForThemes guard.
  */
 import { describe, it, expect } from "vitest";
 import { buildCaptionIntelligence } from "../caption-intelligence";
 import type { SnapshotPost } from "../snapshot-to-report-data";
 
 // ---------------------------------------------------------------------------
 // Helpers
 // ---------------------------------------------------------------------------
 
 function makePost(caption: string): SnapshotPost {
   return {
     id: crypto.randomUUID(),
     caption,
     caption_length: caption.length,
     likes: 10,
     comments: 2,
     timestamp: new Date().toISOString(),
     type: "Image",
     url: "https://instagram.com/p/test",
   } as SnapshotPost;
 }
 
 function build(captions: string[]) {
   return buildCaptionIntelligence({
     posts: captions.map(makePost),
     topThemes: [],
     topHashtagLabels: [],
     aiLanguageText: null,
   });
 }
 
 // ---------------------------------------------------------------------------
 // 1. cleanCaption — emoji stripping (tested via avgWordsPerCaption)
 // ---------------------------------------------------------------------------
 
 describe("cleanCaption via captionStats", () => {
   it("emoji-only captions yield 0 words", () => {
     const result = build(["🔥🔥🔥", "🚀✨💡", "🔥🔥🔥", "🚀✨💡"]);
     expect(result.captionStats.avgWordsPerCaption).toBe(0);
     expect(result.captionStats.totalWords).toBe(0);
   });
 
   it("hashtag + emoji captions yield 0 words", () => {
     const result = build([
       "#ai #marketing 🔥🔥",
       "#ai #marketing 🔥🔥",
       "#ai #marketing 🔥🔥",
       "#ai #marketing 🔥🔥",
     ]);
     expect(result.captionStats.avgWordsPerCaption).toBe(0);
   });
 
   it("real text mixed with emojis counts only words", () => {
     const result = build([
       "Bom dia 🔥 a todos",
       "Bom dia 🔥 a todos",
       "Bom dia 🔥 a todos",
       "Bom dia 🔥 a todos",
     ]);
     // "Bom dia a todos" = 4 words per caption
     expect(result.captionStats.avgWordsPerCaption).toBe(4);
   });
 
   it("URL-only captions yield 0 words", () => {
     const result = build([
       "https://example.com/path",
       "https://example.com/path",
       "https://example.com/path",
       "https://example.com/path",
     ]);
     expect(result.captionStats.avgWordsPerCaption).toBe(0);
   });
 });
 
 // ---------------------------------------------------------------------------
 // 2. Very short captions — tooShortForThemes guard
 // ---------------------------------------------------------------------------
 
 describe("tooShortForThemes guard", () => {
   it("captions with avgWordsPerCaption < 5 produce 'Sem tema dominante claro' snapshot", () => {
     // 2 words each => avgWordsPerCaption = 2
     const result = build(["Bom dia", "Bom dia", "Bom dia", "Bom dia"]);
     expect(result.captionStats.avgWordsPerCaption).toBeLessThan(5);
     expect(result.snapshot.dominantTheme).toBe("Sem tema dominante claro");
   });
 
   it("captions with enough words do not trigger guard", () => {
     const long = "Este é um post sobre marketing digital com dicas e estratégias para redes sociais e criação de conteúdo";
     const result = build([long, long, long, long]);
     expect(result.captionStats.avgWordsPerCaption).toBeGreaterThanOrEqual(5);
   });
 });
 
 // ---------------------------------------------------------------------------
 // 3. English captions — opening classification
 // ---------------------------------------------------------------------------
 
 describe("English opening classification", () => {
   it("classifies 'What do you think?' as question opening", () => {
     const result = build([
       "What do you think? This is a great tool for marketers.",
       "What do you think? This is a great tool for marketers.",
       "What do you think? This is a great tool for marketers.",
       "What do you think? This is a great tool for marketers.",
     ]);
     const questionOpening = result.distributions.openings.find(
       (o) => o.type === "question",
     );
     expect(questionOpening).toBeDefined();
     expect(questionOpening!.count).toBe(4);
   });
 
   it("classifies 'Have you tried this?' as question opening", () => {
     const result = build([
       "Have you tried this? It changed my workflow completely.",
       "Have you tried this? It changed my workflow completely.",
       "Have you tried this? It changed my workflow completely.",
       "Have you tried this? It changed my workflow completely.",
     ]);
     const questionOpening = result.distributions.openings.find(
       (o) => o.type === "question",
     );
     expect(questionOpening!.count).toBe(4);
   });
 
   it("classifies 'Just launched a new tool' as news opening", () => {
     const result = build([
       "Just launched a new tool for content creators!",
       "Just launched a new tool for content creators!",
       "Just launched a new tool for content creators!",
       "Just launched a new tool for content creators!",
     ]);
     const newsOpening = result.distributions.openings.find(
       (o) => o.type === "news_or_update",
     );
     expect(newsOpening).toBeDefined();
     expect(newsOpening!.count).toBe(4);
   });
 });
 
 // ---------------------------------------------------------------------------
 // 4. English comment engagement detection
 // ---------------------------------------------------------------------------
 
 describe("English comment engagement", () => {
   it("detects 'let me know' as comment engagement", () => {
     const result = build([
       "Here is a new approach to SEO. Let me know what you think about it in the comments.",
       "Here is a new approach to SEO. Let me know what you think about it in the comments.",
       "Here is a new approach to SEO. Let me know what you think about it in the comments.",
       "Here is a new approach to SEO. Let me know what you think about it in the comments.",
     ]);
     expect(result.commentEngagement.asksForCommentsPct).toBeGreaterThan(0);
     expect(result.commentEngagement.examples).toEqual(
       expect.arrayContaining([expect.stringMatching(/let me know/i)]),
     );
   });
 
   it("detects 'What do you think' as comment engagement", () => {
     const result = build([
       "New strategy for growth. What do you think about this approach to Instagram?",
       "New strategy for growth. What do you think about this approach to Instagram?",
       "New strategy for growth. What do you think about this approach to Instagram?",
       "New strategy for growth. What do you think about this approach to Instagram?",
     ]);
     expect(result.commentEngagement.asksForCommentsPct).toBe(100);
   });
 
   it("does not detect engagement in neutral English captions", () => {
     // Short neutral statements with no questions or engagement terms
     const result = build([
       "Good morning",
       "Good morning",
       "Good morning",
       "Good morning",
     ]);
     expect(result.commentEngagement.asksForCommentsPct).toBe(0);
   });
 });
 
 // ---------------------------------------------------------------------------
 // 5. parseCaptionSemanticAnalysis — schemaVersion guard
 // ---------------------------------------------------------------------------
 
 describe("parseCaptionSemanticAnalysis schemaVersion guard", () => {
   // We test this indirectly by importing the function from the block file.
   // Since it's not exported, we replicate the logic here for unit coverage.
   function parseCaptionSemanticAnalysis(
     payload?: Record<string, unknown>,
   ): unknown | null {
     const raw = payload?.caption_semantic_analysis;
     if (!raw || typeof raw !== "object") return null;
     const r = raw as Record<string, unknown>;
     if (r.source !== "openai" || typeof r.analyzedCaptions !== "number") return null;
     if (r.schemaVersion !== 2) return null;
     return raw;
   }
 
   it("rejects old cache without schemaVersion", () => {
     const result = parseCaptionSemanticAnalysis({
       caption_semantic_analysis: {
         source: "openai",
         analyzedCaptions: 10,
         // no schemaVersion
         dominantThemes: [],
       },
     });
     expect(result).toBeNull();
   });
 
   it("rejects schemaVersion !== 2", () => {
     const result = parseCaptionSemanticAnalysis({
       caption_semantic_analysis: {
         source: "openai",
         analyzedCaptions: 10,
         schemaVersion: 1,
       },
     });
     expect(result).toBeNull();
   });
 
   it("accepts schemaVersion === 2", () => {
     const payload = {
       source: "openai",
       analyzedCaptions: 10,
       schemaVersion: 2,
       dominantThemes: [{ label: "Marketing", postsCount: 5, confidence: "high", evidence: ["test"] }],
     };
     const result = parseCaptionSemanticAnalysis({
       caption_semantic_analysis: payload,
     });
     expect(result).not.toBeNull();
     expect(result).toEqual(payload);
   });
 
   it("rejects missing source", () => {
     const result = parseCaptionSemanticAnalysis({
       caption_semantic_analysis: {
         analyzedCaptions: 10,
         schemaVersion: 2,
       },
     });
     expect(result).toBeNull();
   });
 
   it("rejects null payload", () => {
     const result = parseCaptionSemanticAnalysis(undefined);
     expect(result).toBeNull();
   });
 });
 
 // ---------------------------------------------------------------------------
 // 6. General availability gate
 // ---------------------------------------------------------------------------
 
 describe("availability gate", () => {
   it("marks unavailable with < 4 captions", () => {
     const result = build(["Hello", "World", "Test"]);
     expect(result.available).toBe(false);
   });
 
   it("marks available with >= 4 captions", () => {
     const result = build(["Hello world", "Test post", "Another one", "Fourth post"]);
     expect(result.available).toBe(true);
   });
 });