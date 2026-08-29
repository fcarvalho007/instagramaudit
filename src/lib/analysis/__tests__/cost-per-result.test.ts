import { describe, expect, it, afterEach } from "vitest";
import { estimateApifyCost, getApifyCostPerResultUsd } from "../cost";

describe("Apify cost per result", () => {
  afterEach(() => {
    delete process.env.APIFY_COST_PER_RESULT_USD;
  });

  it("defaults to the Free plan list price", () => {
    expect(getApifyCostPerResultUsd()).toBe(0.0027);
  });

  it("bills one item for a details run regardless of embedded posts", () => {
    expect(
      estimateApifyCost({ profilesReturned: 1, postsReturned: 12, billedResults: 1 }),
    ).toBe(0.0027);
  });

  it("bills every post item for a posts run", () => {
    expect(
      estimateApifyCost({ profilesReturned: 1, postsReturned: 54, billedResults: 55 }),
    ).toBeCloseTo(0.1485, 5);
  });

  it("stays under the monthly hard cap for a 90d analysis", () => {
    const ninetyDays = estimateApifyCost({
      profilesReturned: 1,
      postsReturned: 54,
      billedResults: 55,
    });
    expect(ninetyDays).toBeLessThan(4.75);
  });

  it("honours the env override", () => {
    process.env.APIFY_COST_PER_RESULT_USD = "0.004";
    expect(estimateApifyCost({ profilesReturned: 0, postsReturned: 0, billedResults: 10 })).toBe(0.04);
  });
});
