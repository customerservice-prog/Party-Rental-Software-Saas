const DATA_IMAGE_RE = /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/i;

export function sanitizeProofImage(
  value: unknown,
  maxLength: number,
  label: string
): { ok: true; value: string | null | undefined } | { ok: false; error: string } {
  if (value === undefined) return { ok: true, value: undefined };
  if (value === null || value === "") return { ok: true, value: null };
  if (typeof value !== "string") return { ok: false, error: `${label} must be an image.` };
  const trimmed = value.trim();
  if (trimmed.length > maxLength) return { ok: false, error: `${label} is too large.` };
  if (!DATA_IMAGE_RE.test(trimmed)) return { ok: false, error: `${label} must be a PNG, JPEG or WebP image.` };
  return { ok: true, value: trimmed };
}
