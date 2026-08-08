import { NextResponse, type NextRequest } from "next/server";
import { readImage } from "@/lib/uploads";

export const runtime = "nodejs";

// GET /api/v1/uploads/[name] — serve a stored recipe image.
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ name: string }> },
): Promise<NextResponse> {
  const { name } = await ctx.params;
  const image = await readImage(name);
  if (!image) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Image not found" } },
      { status: 404 },
    );
  }
  return new NextResponse(new Uint8Array(image.bytes), {
    status: 200,
    headers: {
      "content-type": image.mime,
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
