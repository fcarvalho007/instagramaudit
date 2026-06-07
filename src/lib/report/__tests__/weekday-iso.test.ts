import { describe, it, expect } from "vitest";
import { remapUtcCountsToIso } from "../weekday-iso";

describe("remapUtcCountsToIso", () => {
  it("remaps Sun..Sat to Mon..Sun", () => {
    // utc: [Sun, Mon, Ter, Qua, Qui, Sex, Sáb] = [1,2,3,4,5,6,7]
    // iso: [Mon, Ter, Qua, Qui, Sex, Sáb, Dom] = [2,3,4,5,6,7,1]
    expect(remapUtcCountsToIso([1, 2, 3, 4, 5, 6, 7])).toEqual([2, 3, 4, 5, 6, 7, 1]);
  });

  it("preserves all-zero arrays", () => {
    expect(remapUtcCountsToIso([0, 0, 0, 0, 0, 0, 0])).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it("defaults missing slots to 0 when input is shorter", () => {
    // utc[0]=Sun=5 -> iso[6]=5; rest stay 0.
    expect(remapUtcCountsToIso([5])).toEqual([0, 0, 0, 0, 0, 0, 5]);
  });

  it("clamps negatives, NaN and non-finite to 0", () => {
    expect(
      remapUtcCountsToIso([-1, Number.NaN, Number.POSITIVE_INFINITY, 4, 0, 0, 0]),
    ).toEqual([0, 0, 4, 0, 0, 0, 0]);
  });

  it("returns a fresh zero array for null/undefined/non-array input", () => {
    expect(remapUtcCountsToIso(null)).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(remapUtcCountsToIso(undefined)).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it("floors fractional counts", () => {
    expect(remapUtcCountsToIso([2.9, 0, 0, 0, 0, 0, 0])).toEqual([0, 0, 0, 0, 0, 0, 2]);
  });
});