import { handler, requireAuth, ok, errors } from "@/lib/http";
import { saveImage, isAllowedImageType, MAX_UPLOAD_BYTES } from "@/lib/uploads";

export const runtime = "nodejs";

// POST /api/v1/uploads — multipart form with `file`; returns { url }.
export const POST = handler(async (req) => {
  await requireAuth(req);

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return errors.badRequest("Expected a file field named 'file'.");
  }
  if (!isAllowedImageType(file.type)) {
    return errors.badRequest("Only JPEG, PNG, WebP or GIF images are allowed.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return errors.badRequest("Image is too large (max 8MB).");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const { url } = await saveImage(bytes, file.type);
  return ok({ url });
});
