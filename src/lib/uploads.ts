import { randomBytes } from "node:crypto";
import { mkdir, writeFile, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { env } from "./env";

const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

function uploadRoot(): string {
  return path.resolve(env.uploadDir);
}

export function isAllowedImageType(mime: string): boolean {
  return mime in ALLOWED;
}

export async function saveImage(
  bytes: Buffer,
  mime: string,
): Promise<{ filename: string; url: string }> {
  const ext = ALLOWED[mime];
  if (!ext) throw new Error("unsupported_type");
  const root = uploadRoot();
  await mkdir(root, { recursive: true });
  const filename = `${randomBytes(16).toString("hex")}.${ext}`;
  await writeFile(path.join(root, filename), bytes);
  return { filename, url: `/api/v1/uploads/${filename}` };
}

const SAFE_NAME = /^[a-f0-9]{32}\.(jpg|png|webp|gif)$/;

export async function readImage(
  filename: string,
): Promise<{ bytes: Buffer; mime: string } | null> {
  if (!SAFE_NAME.test(filename)) return null; // reject traversal / odd names
  const ext = filename.split(".").pop()!;
  const mime = Object.entries(ALLOWED).find(([, e]) => e === ext)?.[0];
  if (!mime) return null;
  const full = path.join(uploadRoot(), filename);
  try {
    const s = await stat(full);
    if (!s.isFile()) return null;
    const bytes = await readFile(full);
    return { bytes, mime };
  } catch {
    return null;
  }
}
