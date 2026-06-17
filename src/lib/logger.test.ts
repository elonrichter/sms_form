import { describe, it, expect, vi } from "vitest";
import { redact, logInfo, logError } from "@/lib/logger";

describe("redact (PII safety)", () => {
  it("masks phone-like sequences in strings", () => {
    expect(redact("call +14158675309 now")).not.toContain("4158675309");
    expect(redact("+14158675309")).toContain("[redacted-number]");
  });
  it("masks phone-like sequences inside objects", () => {
    const out = redact({ phone_e164: "+14158675309" });
    expect(out).not.toContain("4158675309");
  });
  it("leaves non-phone text intact", () => {
    expect(redact("hello world")).toBe("hello world");
  });
});

describe("logInfo / logError", () => {
  it("writes redacted output, never raw phone digits", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logInfo("forwarded +14158675309");
    expect(spy).toHaveBeenCalledOnce();
    expect(String(spy.mock.calls[0][0])).not.toContain("4158675309");
  });
  it("logError redacts meta too", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logError("failed", { phone: "+14158675309" });
    expect(String(spy.mock.calls[0][0])).not.toContain("4158675309");
  });
});
