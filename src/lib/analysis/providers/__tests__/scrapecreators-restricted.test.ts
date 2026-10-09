import { describe, expect, it } from "vitest";

import { mapProfile, restrictedInfo } from "../scrapecreators.server";

// Real response observed for @maisensinomaisformacao on 09/10/2026.
const RESTRICTED = {
  success: true,
  credits_remaining: 24998,
  credits_charged: 1,
  handle: "maisensinomaisformacao",
  userId: null,
  error: "not_found",
  errorStatus: 404,
  message: "Profile is restricted",
};

describe("ScrapeCreators restricted profile", () => {
  it("flags the profile as restricted and returns no row", () => {
    expect(mapProfile(RESTRICTED)).toBeNull();
    expect(restrictedInfo(RESTRICTED)).toEqual({
      unavailableReason: "restricted",
      unavailableMessage: "Profile is restricted",
    });
  });

  it("does not flag a plain missing profile", () => {
    expect(restrictedInfo({ success: true, error: "not_found" })).toEqual({});
  });
});
