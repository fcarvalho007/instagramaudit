import { describe, expect, it } from "vitest";

import { extractUsername } from "@/components/landing/hero-action-bar";

describe("extractUsername", () => {
  it.each([
    ["chatgptricks", "chatgptricks"],
    ["/chatgptricks/", "chatgptricks"],
    ["@chatgptricks", "chatgptricks"],
    ["  @/chatgptricks/  ", "chatgptricks"],
    ["https://www.instagram.com/chatgptricks/", "chatgptricks"],
    ["https://instagram.com/chatgptricks/?igsh=xyz", "chatgptricks"],
    ["instagram.com/chatgptricks/reels/123", "chatgptricks"],
    ["HTTPS://WWW.Instagram.com/ChatGPTricks/", "chatgptricks"],
    ["", ""],
    ["   ", ""],
    ["instagram.com/reel/XYZ123", ""],
    ["https://instagram.com/p/ABC/", ""],
  ])("normaliza %j → %j", (input, expected) => {
    expect(extractUsername(input)).toBe(expected);
  });
});