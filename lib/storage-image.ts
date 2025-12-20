import type { SupabaseClient } from "@supabase/supabase-js";

export type StoredFile = {
  bucket: "avatars" | "applications" | "receipts";
  path: string;
};

export type ImageValue = StoredFile | string | null | undefined;

const ALLOWED_BUCKETS = new Set<StoredFile["bucket"]>([
  "avatars",
  "applications",
  "receipts",
]);

const isHttpUrl = (v: string) => /^https?:\/\//i.test(v);
const isLocal = (v: string) => v.startsWith("/");
const isDataUrl = (v: string) => v.startsWith("data:");

export function toPublicImageSrc(
  supabase: SupabaseClient,
  value: ImageValue,
  fallback: string
): string {
  if (!value) return fallback;

  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return fallback;
    if (isLocal(raw) || isHttpUrl(raw) || isDataUrl(raw)) return raw;
    return fallback;
  }

  if (!ALLOWED_BUCKETS.has(value.bucket) || !value.path) return fallback;

  const { data } = supabase.storage
    .from(value.bucket)
    .getPublicUrl(value.path);

  return data.publicUrl || fallback;
}
