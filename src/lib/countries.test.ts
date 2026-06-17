import { describe, it, expect } from "vitest";
import {
  COUNTRIES,
  isSupportedCountry,
  getCountry,
  dialCodeFor,
} from "@/lib/countries";

describe("countries", () => {
  it("supports only US and CA for validation", () => {
    expect(isSupportedCountry("US")).toBe(true);
    expect(isSupportedCountry("CA")).toBe(true);
    expect(isSupportedCountry("GB")).toBe(false);
  });

  it("enables US/CA and disables out-of-scope countries", () => {
    expect(getCountry("US")?.enabled).toBe(true);
    expect(getCountry("CA")?.enabled).toBe(true);
    expect(getCountry("GB")?.enabled).toBe(false);
  });

  it("resolves dial codes with a +1 fallback", () => {
    expect(dialCodeFor("US")).toBe("+1");
    expect(dialCodeFor("GB")).toBe("+44");
    expect(dialCodeFor("ZZ")).toBe("+1");
  });

  it("returns undefined for unknown country", () => {
    expect(getCountry("ZZ")).toBeUndefined();
  });

  it("lists US first (default-friendly order)", () => {
    expect(COUNTRIES[0].code).toBe("US");
  });
});
