import { afterEach, vi } from "vitest";

// Baseline env so modules that read brand/aggregator config resolve in tests.
// Individual tests override with vi.stubEnv(...) and restore via unstubAllEnvs.
process.env.AGGREGATOR_API_URL ??= "https://aggregator.test";
process.env.AGGREGATOR_API_TOKEN ??= "tok_test";
process.env.BRAND_NAME ??= "Richmond Balance";
process.env.BRAND_SLUG ??= "richmondbalance";
process.env.SMS_TERMS_URL ??= "https://richmondbalance.com/sms-terms";
process.env.PRIVACY_URL ??= "https://richmondbalance.com/privacy";
process.env.CONSENT_TEXT_VERSION ??= "richmondbalance-v1";
process.env.DEFAULT_COUNTRY ??= "US";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
