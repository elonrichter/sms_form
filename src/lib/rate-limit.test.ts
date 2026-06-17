import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { rateLimit, clientIpFrom } from "@/lib/rate-limit";

describe("rateLimit", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("allows up to the limit then blocks", () => {
    const key = "test-a";
    expect(rateLimit(key, 2, 60_000).allowed).toBe(true);
    expect(rateLimit(key, 2, 60_000).allowed).toBe(true);
    const third = rateLimit(key, 2, 60_000);
    expect(third.allowed).toBe(false);
    expect(third.retryAfterSec).toBeGreaterThan(0);
  });

  it("reports remaining budget", () => {
    const r = rateLimit("test-b", 5, 60_000);
    expect(r.remaining).toBe(4);
  });

  it("frees up after the window passes", () => {
    const key = "test-c";
    rateLimit(key, 1, 1_000);
    expect(rateLimit(key, 1, 1_000).allowed).toBe(false);
    vi.advanceTimersByTime(1_500);
    expect(rateLimit(key, 1, 1_000).allowed).toBe(true);
  });
});

describe("clientIpFrom", () => {
  it("takes the first x-forwarded-for entry", () => {
    const h = new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(clientIpFrom(h)).toBe("1.2.3.4");
  });
  it("falls back to x-real-ip then 'unknown'", () => {
    expect(clientIpFrom(new Headers({ "x-real-ip": "9.9.9.9" }))).toBe("9.9.9.9");
    expect(clientIpFrom(new Headers())).toBe("unknown");
  });
});
