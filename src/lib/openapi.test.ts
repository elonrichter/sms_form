import { describe, it, expect } from "vitest";
import { openApiDocument } from "@/lib/openapi";

describe("openApiDocument", () => {
  it("is OpenAPI 3.1", () => {
    expect(openApiDocument.openapi).toBe("3.1.0");
  });

  it("documents the subscribe route with all response codes", () => {
    const op = openApiDocument.paths["/api/subscribe"].post;
    expect(op).toBeDefined();
    const codes = Object.keys(op.responses);
    for (const c of ["200", "400", "422", "429", "500", "502"]) {
      expect(codes).toContain(c);
    }
  });

  it("documents the meta routes (self-describing)", () => {
    expect(openApiDocument.paths["/api/openapi.json"]).toBeDefined();
    expect(openApiDocument.paths["/api/docs"]).toBeDefined();
  });

  it("requires the consent fields in the request schema", () => {
    const req = openApiDocument.components.schemas.SubscribeRequest.required;
    expect(req).toContain("consent_terms");
    expect(req).toContain("consent_marketing");
    expect(req).toContain("consent_text_snapshot");
    expect(req).toContain("phone_e164");
  });
});
