import { describe, it, expect } from "vitest";

import ptLanding from "../locales/pt/landing.json";
import ptAnalyze from "../locales/pt/analyze.json";
import ptErrors from "../locales/pt/errors.json";

/**
 * Ronda 3.5 — no estado anónimo, antes de existir `profile_relationship`,
 * a copy não pode assumir que o perfil analisado é do utilizador.
 */
const FORBIDDEN = [
  /\bo teu perfil\b/i,
  /\ba tua conta\b/i,
  /\bos teus seguidores\b/i,
  /\ba tua marca\b/i,
  /\bo teu conte[úu]do\b/i,
];

function collect(value: unknown, path: string, out: Array<[string, string]>) {
  if (typeof value === "string") {
    out.push([path, value]);
    return;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      collect(v, path ? `${path}.${k}` : k, out);
    }
  }
}

describe("copy anónima sem linguagem de posse", () => {
  it.each([
    ["landing", ptLanding],
    ["analyze", ptAnalyze],
    ["errors", ptErrors],
  ])("%s", (name, bundle) => {
    const strings: Array<[string, string]> = [];
    collect(bundle, "", strings);
    const offenders = strings.filter(([, text]) =>
      FORBIDDEN.some((re) => re.test(text)),
    );
    expect(
      offenders.map(([p, t]) => `${name}.${p}: ${t}`),
      "copy assume posse do perfil no estado anónimo",
    ).toEqual([]);
  });
});
