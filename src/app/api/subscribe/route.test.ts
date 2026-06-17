import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST, GET } from "./route";
import { consentSnapshot } from "@/lib/disclosure";

// Canonical snapshot the server will re-derive (matches setup.ts brand env).
const SNAP = consentSnapshot({
  brandName: "Richmond Balance",
  termsUrl: "https://richmondbalance.com/sms-terms",
  privacyUrl: "https://richmondbalance.com/privacy",
});

const validBody = {
  first_name: "Jane",
  last_name: "Doe",
  country: "US",
  phone_e164: "+14158675309",
  consent_terms: true,
  consent_marketing: true,
  consent_text_snapshot: SNAP,
  form_url: "https://sms.brand.test/",
};

let ipCounter = 0;
function makeReq(body: unknown, ip?: string): Request {
  ipCounter += 1;
  const addr = ip ?? `10.0.${(ipCounter >> 8) & 255}.${ipCounter & 255}`;
  return new Request("http://localhost/api/subscribe", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": addr,
      "user-agent": "vitest",
    },
    body: JSON.stringify(body),
  });
}

function mockFetch(payload: unknown, init: { status?: number; ok?: boolean } = {}) {
  const status = init.status ?? 200;
  const fn = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(payload), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fn);
  return fn;
}

beforeEach(() => {
  ipCounter = Math.floor(Math.random() * 50_000); // isolate per-test IP buckets
});

describe("POST /api/subscribe", () => {
  it("silently accepts honeypot hits without forwarding", async () => {
    const fn = mockFetch({ success: true });
    const res = await POST(makeReq({ ...validBody, hp_field: "bot" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true });
    expect(fn).not.toHaveBeenCalled();
  });

  it("rejects an empty body with 422", async () => {
    mockFetch({ success: true });
    const res = await POST(makeReq({}));
    expect(res.status).toBe(422);
  });

  it("rejects an invalid phone with 422", async () => {
    mockFetch({ success: true });
    const res = await POST(makeReq({ ...validBody, phone_e164: "123" }));
    expect(res.status).toBe(422);
  });

  it("rejects a tampered consent snapshot with 422", async () => {
    mockFetch({ success: true });
    const res = await POST(makeReq({ ...validBody, consent_text_snapshot: "tampered" }));
    expect(res.status).toBe(422);
  });

  it("rejects when a consent box is unchecked", async () => {
    mockFetch({ success: true });
    const res = await POST(makeReq({ ...validBody, consent_marketing: false }));
    expect(res.status).toBe(422);
  });

  it("forwards a valid submission with token + idempotency key and no PII extras", async () => {
    const fn = mockFetch({ success: true, status: "opted_in" });
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true, status: "opted_in" });

    expect(fn).toHaveBeenCalledTimes(1);
    const [url, opts] = fn.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
    expect(url).toBe("https://aggregator.test/v1/subscriptions");
    expect(opts.headers["Authorization"]).toBe("Bearer tok_test");
    expect(opts.headers["Idempotency-Key"]).toBeTruthy();

    const sent = JSON.parse(opts.body as string);
    expect(sent.phone_e164).toBe("+14158675309");
    expect(sent.brand_slug).toBe("richmondbalance");
    expect(sent.consent_text_version).toBe("richmondbalance-v1");
    expect(sent.consent_text_snapshot).toBe(SNAP);
    expect(sent).not.toHaveProperty("ip_address");
    expect(sent).not.toHaveProperty("occurred_at");
  });

  it("surfaces a duplicate as a friendly success variant", async () => {
    mockFetch({ success: true, status: "opted_in", duplicate: true });
    const res = await POST(makeReq(validBody));
    expect(await res.json()).toMatchObject({ success: true, duplicate: true });
  });

  it("maps an aggregator 5xx to 502 with a generic message", async () => {
    mockFetch({ success: false, error: { code: "X" } }, { status: 500 });
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(JSON.stringify(body)).not.toContain("X"); // raw codes never leak
  });

  it("maps a network failure to 502", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(502);
  });

  it("returns 500 when a required secret is missing (fail closed)", async () => {
    vi.stubEnv("AGGREGATOR_API_TOKEN", "");
    mockFetch({ success: true });
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(500);
  });

  it("rate-limits a single IP after the threshold", async () => {
    mockFetch({ success: true });
    const ip = "203.0.113.7";
    const codes: number[] = [];
    for (let i = 0; i < 7; i += 1) {
      // tampered snapshot keeps each call cheap (422) but still counts toward the limit
      const res = await POST(makeReq({ ...validBody, consent_text_snapshot: "x" }, ip));
      codes.push(res.status);
    }
    expect(codes).toContain(429);
  });
});

describe("GET /api/subscribe", () => {
  it("is not allowed", () => {
    expect(GET().status).toBe(405);
  });
});
