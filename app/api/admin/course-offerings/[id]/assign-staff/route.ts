import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ErrorResponse = { error: string };

type AssignedRow = {
  staff_id: string; // UUID
};

type StaffItem = {
  id: string; // staff.id (UUID)
  staff_code: string; // staff.staff_id (TEXT, display)
  profile_id: string;
  designation: string | null;
  status: string | null;
  profile: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    main_role: string;
  } | null;
};

type GetResponse = {
  assigned_staff_ids: string[]; // UUIDs
  eligible_staff: StaffItem[];
};

type PostBody = {
  staff_ids: string[]; // UUIDs
};

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/* ======================= GET ======================= */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: offeringId } = await ctx.params;
  if (!isUuid(offeringId)) {
    return NextResponse.json<ErrorResponse>({ error: "Invalid offering id" }, { status: 400 });
  }

  // Assigned staff UUIDs
  const { data: assigned } = await supabaseAdmin
    .from("course_offering_staff")
    .select("staff_id")
    .eq("course_offering_id", offeringId)
    .returns<AssignedRow[]>();

  const assignedStaffIds = (assigned ?? []).map((r) => r.staff_id);

  // Eligible = active + academic
  const { data: staff, error } = await supabaseAdmin
    .from("staff")
    .select(
      `
      id,
      staff_id,
      profile_id,
      designation,
      status,
      profiles:profile_id (
        id,
        first_name,
        last_name,
        email,
        main_role
      )
    `
    )
    .eq("status", "active")
    .eq("profiles.main_role", "academic_staff")
    .order("staff_id", { ascending: true });

  if (error) {
    return NextResponse.json<ErrorResponse>({ error: error.message }, { status: 500 });
  }

  const eligible: StaffItem[] = (staff ?? []).map((s) => {
    const p = Array.isArray(s.profiles) ? s.profiles[0] : null;

    return {
      id: s.id,
      staff_code: s.staff_id,
      profile_id: s.profile_id,
      designation: s.designation,
      status: s.status,
      profile: p
        ? {
            id: p.id,
            first_name: p.first_name,
            last_name: p.last_name,
            email: p.email,
            main_role: p.main_role,
          }
        : null,
    };
  });

  return NextResponse.json<GetResponse>({
    assigned_staff_ids: assignedStaffIds,
    eligible_staff: eligible,
  });
}

/* ======================= POST ======================= */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: offeringId } = await ctx.params;
  if (!isUuid(offeringId)) {
    return NextResponse.json<ErrorResponse>({ error: "Invalid offering id" }, { status: 400 });
  }

  const body = (await req.json()) as PostBody;
  const staffIds = (body.staff_ids ?? []).filter(isUuid);

  if (staffIds.length === 0) {
    return NextResponse.json<ErrorResponse>(
      { error: "No valid staff UUIDs provided" },
      { status: 422 }
    );
  }

  // Validate academic + active
  const { data: validStaff } = await supabaseAdmin
    .from("staff")
    .select(`id, profiles:profile_id ( main_role )`)
    .in("id", staffIds)
    .eq("status", "active")
    .eq("profiles.main_role", "academic_staff");

  const validSet = new Set((validStaff ?? []).map((s) => s.id));
  const filtered = staffIds.filter((id) => validSet.has(id));

  if (filtered.length === 0) {
    return NextResponse.json<ErrorResponse>(
      { error: "Selected staff are not eligible" },
      { status: 422 }
    );
  }

  const rows = filtered.map((staffUuid) => ({
    course_offering_id: offeringId,
    staff_id: staffUuid,
  }));

  const { error } = await supabaseAdmin
    .from("course_offering_staff")
    .upsert(rows, {
      onConflict: "course_offering_id,staff_id",
    });

  if (error) {
    return NextResponse.json<ErrorResponse>({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
