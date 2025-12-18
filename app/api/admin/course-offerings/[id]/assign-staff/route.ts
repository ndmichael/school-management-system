import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ErrorResponse = { error: string };

type AssignedRow = {
  staff_profile_id: string;
};

type StaffItem = {
  profile_id: string; // this is what we assign
  staff_id: string;
  designation: string | null;
  status: string | null;
  profile: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
};

type GetResponse = {
  assigned_staff_profile_ids: string[];
  eligible_staff: StaffItem[];
};

type PostBody = {
  staff_profile_ids: string[]; // array of profiles.id
};

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function isPostBody(v: unknown): v is PostBody {
  if (typeof v !== "object" || v === null) return false;
  if (!("staff_profile_ids" in v)) return false;
  const ids = (v as { staff_profile_ids?: unknown }).staff_profile_ids;
  return Array.isArray(ids) && ids.every((x) => typeof x === "string");
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: offeringId } = await ctx.params;

  if (!isUuid(offeringId)) {
    return NextResponse.json<ErrorResponse>({ error: "Invalid offering id" }, { status: 400 });
  }

  // 1) assigned profile ids
  const { data: assigned, error: assignedErr } = await supabaseAdmin
    .from("course_offering_staff")
    .select("staff_profile_id")
    .eq("course_offering_id", offeringId)
    .returns<AssignedRow[]>();

  if (assignedErr) {
    return NextResponse.json<ErrorResponse>(
      { error: assignedErr.message || "Failed to load assigned staff" },
      { status: 500 },
    );
  }

  const assignedProfileIds = (assigned ?? []).map((r) => r.staff_profile_id);

  // 2) eligible staff = active staff rows + their profiles
  const { data: staff, error: staffErr } = await supabaseAdmin
    .from("staff")
    .select(
      `
      profile_id,
      staff_id,
      designation,
      status,
      profiles:profile_id (
        id,
        first_name,
        last_name,
        email
      )
    `
    )
    .eq("status", "active")
    .order("staff_id", { ascending: true })
    .returns<Array<{
      profile_id: string;
      staff_id: string;
      designation: string | null;
      status: string | null;
      profiles: { id: string; full_name: string | null; email: string | null } | null;
    }>>();

  if (staffErr) {
    return NextResponse.json<ErrorResponse>(
      { error: staffErr.message || "Failed to load staff" },
      { status: 500 },
    );
  }

  const eligible: StaffItem[] = (staff ?? []).map((s) => ({
    profile_id: s.profile_id,
    staff_id: s.staff_id,
    designation: s.designation,
    status: s.status,
    profile: s.profiles
      ? { id: s.profiles.id, full_name: s.profiles.full_name, email: s.profiles.email }
      : null,
  }));

  return NextResponse.json<GetResponse>({
    assigned_staff_profile_ids: assignedProfileIds,
    eligible_staff: eligible,
  });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: offeringId } = await ctx.params;

  if (!isUuid(offeringId)) {
    return NextResponse.json<ErrorResponse>({ error: "Invalid offering id" }, { status: 400 });
  }

  let raw: unknown;
  try {
    raw = (await req.json()) as unknown;
  } catch {
    return NextResponse.json<ErrorResponse>({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isPostBody(raw)) {
    return NextResponse.json<ErrorResponse>(
      { error: "Body must be: { staff_profile_ids: string[] }" },
      { status: 422 },
    );
  }

  const staffProfileIds = raw.staff_profile_ids
    .map((x) => x.trim())
    .filter((x) => isUuid(x));

  if (staffProfileIds.length === 0) {
    return NextResponse.json<ErrorResponse>(
      { error: "No valid staff_profile_ids provided" },
      { status: 422 },
    );
  }

  // Safety: ensure these profiles belong to ACTIVE staff
  const { data: activeStaff, error: activeErr } = await supabaseAdmin
    .from("staff")
    .select("profile_id")
    .in("profile_id", staffProfileIds)
    .eq("status", "active");

  if (activeErr) {
    return NextResponse.json<ErrorResponse>(
      { error: activeErr.message || "Failed to validate staff" },
      { status: 500 },
    );
  }

  const activeProfileIds = new Set((activeStaff ?? []).map((r) => (r as { profile_id: string }).profile_id));
  const filtered = staffProfileIds.filter((id) => activeProfileIds.has(id));

  if (filtered.length === 0) {
    return NextResponse.json<ErrorResponse>(
      { error: "Selected staff are not eligible (must be active)" },
      { status: 422 },
    );
  }

  const rows = filtered.map((profileId) => ({
    course_offering_id: offeringId,
    staff_profile_id: profileId,
  }));

  const { error: upsertErr } = await supabaseAdmin
    .from("course_offering_staff")
    .upsert(rows, {
      onConflict: "course_offering_id,staff_profile_id",
      ignoreDuplicates: true,
    });

  if (upsertErr) {
    return NextResponse.json<ErrorResponse>(
      { error: upsertErr.message || "Failed to assign staff" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
