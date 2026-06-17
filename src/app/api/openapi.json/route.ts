import { NextResponse } from "next/server";
import { openApiDocument } from "@/lib/openapi";

// Serves the machine-readable OpenAPI 3.1 document.
export const runtime = "nodejs";

export function GET() {
  return NextResponse.json(openApiDocument, {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
