// OpenAPI 3.1 description of the public API surface. Served as JSON at
// /api/openapi.json and rendered with Swagger UI at /api/docs.
//
// PROCESS RULE (see BOTS.md / CODING_GUIDELINES.md): every new or changed API
// route MUST be reflected here in the same change, and an openapi test must
// assert the route is documented.

export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "SMS Subscription Form API",
    version: "1.0.0",
    description:
      "Internal, same-origin API for the TCPA-compliant SMS opt-in form. The " +
      "browser POSTs to /api/subscribe; the server attaches the secret " +
      "Aggregator bearer token and forwards the consent event. The token is " +
      "never exposed to the client.",
  },
  servers: [{ url: "/", description: "Same-origin (the deployed brand domain)" }],
  tags: [
    { name: "subscribe", description: "SMS opt-in submission" },
    { name: "meta", description: "API documentation" },
  ],
  paths: {
    "/api/subscribe": {
      post: {
        tags: ["subscribe"],
        summary: "Submit an SMS opt-in",
        description:
          "Validates the submission server-side (names, E.164 phone, both " +
          "consent checkboxes, consent-text snapshot integrity), then forwards " +
          "to the Aggregator with an Idempotency-Key. Honeypot hits are silently " +
          "accepted. Rate-limited per IP. No phone numbers are logged.",
        operationId: "createSubscription",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SubscribeRequest" },
            },
          },
        },
        responses: {
          "200": {
            description:
              "Accepted (or honeypot silently dropped). `duplicate: true` means " +
              "the number was already subscribed.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SubscribeSuccess" },
              },
            },
          },
          "400": {
            description: "Malformed JSON body.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SubscribeFailure" },
              },
            },
          },
          "422": {
            description:
              "Validation failed (names, phone, consent, captcha, or snapshot skew).",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SubscribeFailure" },
              },
            },
          },
          "429": {
            description: "Rate limit exceeded for the client IP.",
            headers: {
              "Retry-After": {
                description: "Seconds until the next attempt is allowed.",
                schema: { type: "integer" },
              },
            },
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SubscribeFailure" },
              },
            },
          },
          "500": {
            description: "Server misconfigured (missing required env).",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SubscribeFailure" },
              },
            },
          },
          "502": {
            description: "Aggregator unreachable, timed out, or errored.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SubscribeFailure" },
              },
            },
          },
        },
      },
    },
    "/api/openapi.json": {
      get: {
        tags: ["meta"],
        summary: "This OpenAPI document",
        operationId: "getOpenApi",
        responses: { "200": { description: "OpenAPI 3.1 JSON." } },
      },
    },
    "/api/docs": {
      get: {
        tags: ["meta"],
        summary: "Swagger UI",
        operationId: "getDocs",
        responses: { "200": { description: "Swagger UI HTML page." } },
      },
    },
  },
  components: {
    schemas: {
      SubscribeRequest: {
        type: "object",
        required: [
          "first_name",
          "last_name",
          "country",
          "phone_e164",
          "consent_terms",
          "consent_marketing",
          "consent_text_snapshot",
        ],
        properties: {
          first_name: { type: "string", minLength: 1, maxLength: 60, example: "Jane" },
          last_name: { type: "string", minLength: 1, maxLength: 60, example: "Doe" },
          country: { type: "string", enum: ["US", "CA"], example: "US" },
          phone_e164: {
            type: "string",
            pattern: "^\\+1\\d{10}$",
            description: "E.164; the server re-normalizes and re-validates.",
            example: "+14158675309",
          },
          consent_terms: { type: "boolean", example: true },
          consent_marketing: { type: "boolean", example: true },
          consent_text_snapshot: {
            type: "string",
            description:
              "Exact disclosure text shown beside the SMS-consent checkbox. The " +
              "server re-derives the canonical text and rejects mismatches.",
          },
          form_url: { type: "string", format: "uri", example: "https://sms.brand.com/" },
          idempotency_key: {
            type: "string",
            format: "uuid",
            description: "Per-attempt key forwarded as the Idempotency-Key header.",
          },
          captcha_token: {
            type: "string",
            description: "Cloudflare Turnstile token (required only when configured).",
          },
          hp_field: {
            type: "string",
            description: "Honeypot — must be empty for a human submission.",
          },
        },
      },
      SubscribeSuccess: {
        type: "object",
        required: ["success"],
        properties: {
          success: { type: "boolean", example: true },
          status: { type: "string", example: "opted_in" },
          duplicate: { type: "boolean", example: false },
        },
      },
      SubscribeFailure: {
        type: "object",
        required: ["success"],
        properties: {
          success: { type: "boolean", example: false },
          message: {
            type: "string",
            description: "Friendly, user-safe message. Raw error codes are never surfaced.",
            example: "Something went wrong on our end. Please try again in a moment.",
          },
        },
      },
    },
  },
} as const;

export type OpenApiDocument = typeof openApiDocument;
