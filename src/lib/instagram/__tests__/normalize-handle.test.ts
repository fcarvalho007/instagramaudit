import { describe, expect, it } from "vitest";

import { normalizeInstagramHandle } from "@/lib/instagram/normalize-handle";

describe("normalizeInstagramHandle", () => {
  describe("aceita variações válidas", () => {
    it.each([
      ["chatgptricks"],
      ["@chatgptricks"],
      ["/chatgptricks/"],
      ["  @chatgptricks  "],
      ["@ChatGPTricks"],
      ["instagram.com/chatgptricks"],
      ["instagram.com/chatgptricks/"],
      ["www.instagram.com/chatgptricks/"],
      ["https://www.instagram.com/chatgptricks/"],
      ["https://www.instagram.com/chatgptricks/?hl=en"],
      ["https://instagram.com/chatgptricks/?igsh=xyz"],
      ["HTTPS://WWW.Instagram.com/ChatGPTricks/"],
      ["m.instagram.com/chatgptricks"],
    ])("normaliza %j → 'chatgptricks'", (input) => {
      expect(normalizeInstagramHandle(input)).toBe("chatgptricks");
    });

    it("mantém ponto e underscore válidos", () => {
      expect(normalizeInstagramHandle("frederico.m.carvalho")).toBe("frederico.m.carvalho");
      expect(normalizeInstagramHandle("@user_name.01")).toBe("user_name.01");
    });
  });

  describe("rejeita inputs inválidos", () => {
    it.each([
      [""],
      ["   "],
      ["@@"],
      ["foo bar"],
      ["nome com espaço"],
      ["handle/com/coisa estranha"],
      ["a".repeat(31)],
      ["https://tiktok.com/@chatgptricks"],
      ["https://twitter.com/chatgptricks"],
      ["https://facebook.com/chatgptricks"],
      ["instagram.com/p/ABC123"],
      ["https://instagram.com/p/ABC/"],
      ["instagram.com/reel/xyz"],
      ["instagram.com/reels/xyz"],
      ["instagram.com/stories/foo"],
      ["instagram.com/explore"],
      ["instagram.com/accounts/login"],
      ["https://www.instagram.com/"],
    ])("devolve '' para %j", (input) => {
      expect(normalizeInstagramHandle(input)).toBe("");
    });
  });
});