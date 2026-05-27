import { describe, expect, it } from "vitest";
import { parseFullName } from "../parse-full-name";

describe("parseFullName", () => {
  it("splits a typical two-word name", () => {
    expect(parseFullName("Ana Marques")).toEqual({
      full_name: "Ana Marques",
      first_name: "Ana",
      last_name: "Marques",
    });
  });

  it("keeps every word after the first as last_name", () => {
    expect(parseFullName("Ana Rita Marques Silva")).toEqual({
      full_name: "Ana Rita Marques Silva",
      first_name: "Ana",
      last_name: "Rita Marques Silva",
    });
  });

  it("trims and collapses whitespace", () => {
    expect(parseFullName("  João   Pedro  ")).toEqual({
      full_name: "João Pedro",
      first_name: "João",
      last_name: "Pedro",
    });
  });

  it("returns null last_name for a single-word name", () => {
    expect(parseFullName("Élia")).toEqual({
      full_name: "Élia",
      first_name: "Élia",
      last_name: null,
    });
  });

  it("preserves hyphens and apostrophes", () => {
    expect(parseFullName("Mary-Jane O'Connor")).toEqual({
      full_name: "Mary-Jane O'Connor",
      first_name: "Mary-Jane",
      last_name: "O'Connor",
    });
  });

  it("returns empty parts for empty or whitespace input", () => {
    expect(parseFullName("")).toEqual({
      full_name: "",
      first_name: "",
      last_name: null,
    });
    expect(parseFullName("   ")).toEqual({
      full_name: "",
      first_name: "",
      last_name: null,
    });
    expect(parseFullName(null)).toEqual({
      full_name: "",
      first_name: "",
      last_name: null,
    });
  });
});