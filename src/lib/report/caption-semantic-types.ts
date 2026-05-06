/**
 * Caption Semantic Analysis — types for OpenAI-powered caption interpretation.
 *
 * Phase 1: deterministic extraction (existing caption-intelligence.ts).
 * Phase 2: OpenAI semantic layer for themes, intent, and diagnostics.
 */

export interface CaptionSemanticTheme {
  label: string;
  explanation: string;
  postsCount: number;
  evidence: string[];
  confidence: "high" | "medium" | "low";
}

export interface CaptionSemanticIntent {
  primary: string;
  secondary?: string;
  explanation: string;
}

export interface CaptionSemanticCommentEngagement {
  asksForCommentsCount: number;
  asksForCommentsPct: number;
  strategyLabel: "active" | "occasional" | "passive";
  examples: string[];
  explanation: string;
}

export interface CaptionSemanticExpression {
  expression: string;
  count: number;
  meaning: string;
  risk?: string;
}

export interface CaptionSemanticDiagnostic {
  main: string;
  works: string;
  critical: string;
  watch: string;
}

export interface CaptionSemanticHookQuality {
  rating: "strong" | "moderate" | "weak";
  explanation: string;
}

export interface CaptionSemanticBrandVoice {
  rating: "consistent" | "mixed" | "inconsistent";
  explanation: string;
}

export interface CaptionSemanticFormulaicPatterns {
  hasFormulas: boolean;
  examples: string[];
  explanation: string;
}

export interface CaptionSemanticAnalysis {
  source: "openai";
  analyzedCaptions: number;
  dominantThemes: CaptionSemanticTheme[];
  contentIntent: CaptionSemanticIntent;
  commentEngagement: CaptionSemanticCommentEngagement;
  recurringExpressionsInterpretation: CaptionSemanticExpression[];
  diagnostic: CaptionSemanticDiagnostic;
  hookQuality?: CaptionSemanticHookQuality;
  brandVoice?: CaptionSemanticBrandVoice;
  formulaicPatterns?: CaptionSemanticFormulaicPatterns;
}
