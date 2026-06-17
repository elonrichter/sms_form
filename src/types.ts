// Shared types for the subscribe contract (SPEC 01 §4).

// Body the browser POSTs to the internal Next.js route (no token, no IP, no ts).
export interface SubscribeRequestBody {
  first_name: string;
  last_name: string;
  country: string;
  phone_e164: string;
  consent_terms: boolean;
  consent_marketing: boolean;
  consent_text_snapshot: string;
  form_url: string;
  // Per-attempt UUID so retries don't double-write at the Aggregator.
  idempotency_key?: string;
  // Optional anti-abuse fields.
  captcha_token?: string;
  // Honeypot — must be empty for a human submission.
  hp_field?: string;
}

// Normalized response the route returns to the browser (SPEC 01 §4.1.6).
export interface SubscribeResponse {
  success: boolean;
  message?: string;
  // Present on success; lets the UI show the "already subscribed" variant.
  duplicate?: boolean;
  status?: string;
}
