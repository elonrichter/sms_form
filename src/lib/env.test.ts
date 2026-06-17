import { describe, it, expect, vi } from "vitest";
import {
  getServerEnv,
  getPublicBrandRuntime,
  MissingEnvError,
} from "@/lib/env";

describe("getServerEnv", () => {
  it("resolves secrets and strips trailing slashes from the URL", () => {
    vi.stubEnv("AGGREGATOR_API_URL", "https://api.test/");
    const env = getServerEnv();
    expect(env.aggregatorUrl).toBe("https://api.test");
    expect(env.aggregatorToken).toBe("tok_test");
    expect(env.consentTextVersion).toBe("richmondbalance-v1");
  });

  it("throws when a required secret is missing (fail closed)", () => {
    vi.stubEnv("AGGREGATOR_API_TOKEN", "");
    expect(() => getServerEnv()).toThrow(MissingEnvError);
  });

  it("throws when the aggregator URL is not a valid absolute URL", () => {
    vi.stubEnv("AGGREGATOR_API_URL", "not-a-url");
    expect(() => getServerEnv()).toThrow(MissingEnvError);
  });

  it("throws when CONSENT_TEXT_VERSION is missing", () => {
    vi.stubEnv("CONSENT_TEXT_VERSION", "");
    expect(() => getServerEnv()).toThrow(MissingEnvError);
  });
});

describe("getPublicBrandRuntime", () => {
  it("resolves brand name, terms/privacy URLs and default country", () => {
    const rt = getPublicBrandRuntime();
    expect(rt.brandName).toBe("Richmond Balance");
    expect(rt.termsUrl).toBe("https://richmondbalance.com/sms-terms");
    expect(rt.privacyUrl).toBe("https://richmondbalance.com/privacy");
    expect(rt.defaultCountry).toBe("US");
  });

  it("fails closed when the Terms URL is unset (compliance-locked link)", () => {
    vi.stubEnv("SMS_TERMS_URL", "");
    expect(() => getPublicBrandRuntime()).toThrow(MissingEnvError);
  });

  it("rejects a non-http(s) Privacy URL", () => {
    vi.stubEnv("PRIVACY_URL", "javascript:alert(1)");
    expect(() => getPublicBrandRuntime()).toThrow(MissingEnvError);
  });
});
