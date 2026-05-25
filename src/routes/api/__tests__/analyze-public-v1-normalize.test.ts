import { describe, expect, it } from "vitest";
import { z } from "zod";

import { normalizeInstagramHandle } from "@/lib/instagram/normalize-handle";

// Replica o usernameSchema exato usado em src/routes/api/analyze-public-v1.ts
// para validar contratos sem importar o módulo de rota (que arrasta deps de servidor).
const usernameSchema = z
  .string()
  .transform((v) => normalizeInstagramHandle(v))
  .pipe(z.string().regex(/^[a-z0-9._]{1,30}$/));

describe("analyze-public-v1 · usernameSchema", () => {
  it.each([
    "chatgptricks",
    "@chatgptricks",
    "/chatgptricks/",
    "instagram.com/chatgptricks",
    "https://www.instagram.com/chatgptricks/?hl=en",
    "HTTPS://WWW.Instagram.com/ChatGPTricks/",
  ])("aceita variação válida %j", (input) => {
    const r = usernameSchema.safeParse(input);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe("chatgptricks");
  });

  it.each([
    "",
    "   ",
    "https://tiktok.com/@chatgptricks",
    "instagram.com/p/ABC123",
    "instagram.com/reel/xyz",
    "instagram.com/stories/foo",
    "instagram.com/explore",
    "nome com espaço",
  ])("rejeita input inválido %j", (input) => {
    const r = usernameSchema.safeParse(input);
    expect(r.success).toBe(false);
  });
});