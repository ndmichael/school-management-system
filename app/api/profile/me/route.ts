// app/api/profile/me/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type StoredFile = { bucket: string; path: string };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function cleanString(v: unknown, max = 300): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  return s.length > max ? s.slice(0, max) : s;
}

function isStoredFile(v: unknown): v is StoredFile {
  if (!isRecord(v)) return false;
  return typeof v.bucket === "string" && typeof v.path === "string";
}

function sanitizeAvatarFile(v: unknown): StoredFile | null {
  if (!v) return null;
  if (!isStoredFile(v)) return null;

  // Strict: only allow avatars bucket for profile photos
  if (v.bucket !== "avatars") return null;

  const path = v.path.trim().replace(/^\/+/, "");
  if (!path) return null;

  return { bucket: "avatars", path };
}

export async function GET() {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, first_name, middle_name, last_name, email, phone, address, state_of_origin, lga_of_origin, avatar_file, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  return NextResponse.json({ profile });
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: unknown = await req.json().catch(() => null);
  if (!isRecord(body)) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  // ✅ Whitelist ONLY these fields
  const phone = "phone" in body ? cleanString(body.phone, 40) : undefined;
  const address = "address" in body ? cleanString(body.address, 500) : undefined;
  const state = "state_of_origin" in body ? cleanString(body.state_of_origin, 80) : undefined;
  const lga = "lga_of_origin" in body ? cleanString(body.lga_of_origin, 80) : undefined;

  const avatar_file =
    "avatar_file" in body ? sanitizeAvatarFile(body.avatar_file) : undefined;

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (phone !== undefined) patch.phone = phone;
  if (address !== undefined) patch.address = address;
  if (state !== undefined) patch.state_of_origin = state;
  if (lga !== undefined) patch.lga_of_origin = lga;

  // allow clearing avatar by sending null
  if (avatar_file !== undefined) patch.avatar_file = avatar_file;

  const { data: profile, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", user.id)
    .select("id, first_name, middle_name, last_name, email, phone, address, state_of_origin, lga_of_origin, avatar_file, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ profile });
}
