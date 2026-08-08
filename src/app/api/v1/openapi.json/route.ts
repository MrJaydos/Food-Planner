import { NextResponse } from "next/server";
import { buildOpenApiDocument } from "@/lib/openapi";

export const runtime = "nodejs";

// GET /api/v1/openapi.json — the machine-readable API description, served live
// so a client generator can point straight at a running instance. Public: it
// describes the shape of the API, not any household's data.
export function GET() {
  return NextResponse.json(buildOpenApiDocument(), {
    headers: { "cache-control": "public, max-age=300" },
  });
}
