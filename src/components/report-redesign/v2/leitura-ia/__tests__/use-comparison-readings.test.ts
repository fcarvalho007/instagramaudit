import { describe, it, expect } from "vitest";
import { selectComparisonReadings } from "../use-comparison-readings";
import { COMPARISON_READINGS_KEY } from "@/lib/comparison-readings/types";

describe("selectComparisonReadings", () => {
  it("returns null for missing payload", () => {
    expect(selectComparisonReadings(null)).toBeNull();
    expect(selectComparisonReadings({})).toBeNull();
  });

  it("returns null for malformed cache", () => {
    expect(
      selectComparisonReadings({
        [COMPARISON_READINGS_KEY]: { totally: "wrong" },
      }),
    ).toBeNull();
  });

  it("returns null when status is failed", () => {
    expect(
      selectComparisonReadings({
        [COMPARISON_READINGS_KEY]: {
          version: "1",
          model: "m",
          prompt_version: "v1",
          evidence_hash: "h",
          competitor_handle: "c",
          window: null,
          generated_at: new Date().toISOString(),
          status: "failed",
          readings: null,
          error: "boom",
        },
      }),
    ).toBeNull();
  });

  it("returns parsed readings when status is ready", () => {
    const out = selectComparisonReadings({
      [COMPARISON_READINGS_KEY]: {
        version: "1",
        model: "m",
        prompt_version: "v1",
        evidence_hash: "h",
        competitor_handle: "c",
        window: null,
        generated_at: new Date().toISOString(),
        status: "ready",
        readings: {
          version: "1",
          language: "pt-PT",
          global_summary: {
            headline: "H",
            key_reading: "K",
            confidence: "medium",
          },
          cards: [
            {
              card_id: "engagement",
              headline: "Eng",
              key_reading: "kk",
              evidence_points: [],
              recommendation: null,
              confidence: "low",
              caveats: [],
            },
          ],
        },
      },
    });
    expect(out).not.toBeNull();
    expect(out!.byCard.engagement?.headline).toBe("Eng");
    expect(out!.global.headline).toBe("H");
  });
});