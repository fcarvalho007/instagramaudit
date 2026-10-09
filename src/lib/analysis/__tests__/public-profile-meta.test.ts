import { describe, expect, it } from "vitest";

import { parseCompactCount, parsePublicProfileMeta } from "../public-profile-meta";

const html = (title: string, description: string) => `<html><head>
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" /></head></html>`;

const REAL = html(
  "+ENSINO +FORMA&#xc7;&#xc3;O | Educa&#xe7;&#xe3;o Online Certificada (&#064;maisensinomaisformacao) &#x2022; Instagram photos and videos",
  "2,781 Followers, 763 Following, 751 Posts - See Instagram photos and videos from +ENSINO +FORMA&#xc7;&#xc3;O (&#064;maisensinomaisformacao)",
);

describe("parsePublicProfileMeta", () => {
  it("reads name and counters from the real page markup", () => {
    expect(parsePublicProfileMeta(REAL, "maisensinomaisformacao")).toEqual({
      handle: "maisensinomaisformacao",
      fullName: "+ENSINO +FORMAÇÃO | Educação Online Certificada",
      followers: 2781,
      following: 763,
      posts: 751,
    });
  });

  it("parses K and M suffixes", () => {
    expect(parseCompactCount("12.5K")).toBe(12500);
    expect(parseCompactCount("1.2M")).toBe(1_200_000);
    expect(parseCompactCount("2,781")).toBe(2781);
  });

  it("returns null when the page describes a different handle", () => {
    expect(parsePublicProfileMeta(REAL, "outro.perfil")).toBeNull();
  });

  it("returns null for a login wall without profile tags", () => {
    expect(parsePublicProfileMeta("<html><title>Login</title></html>", "x")).toBeNull();
  });
});
