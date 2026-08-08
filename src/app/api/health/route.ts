import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Healthcheck used by Docker/Coolify. Reports app liveness and DB connectivity.
export async function GET() {
  const started = Date.now();
  let database = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = true;
  } catch {
    database = false;
  }

  const body = {
    status: database ? "ok" : "degraded",
    database,
    uptime: process.uptime(),
    latencyMs: Date.now() - started,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(body, { status: database ? 200 : 503 });
}
