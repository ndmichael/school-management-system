import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// --------------------
// Types
// --------------------
type StaffUnit = "admissions" | "bursary" | "exams";
type StaffStatus = "active" | "inactive" | "suspended";
type MainRole = "admin" | "academic_staff" | "non_academic_staff" | "student";

type DepartmentRow = { id: string; code: string | null };

function parseUnit(v: unknown): StaffUnit | null {
  if (v === "admissions" || v === "bursary" || v === "exams") return v;
  return null;
}

function parseRole(v: unknown): MainRole | null {
  if (v === "admin" || v === "academic_staff" || v === "non_academic_staff" || v === "student")
    return v;
  return null;
}

function parseStatus(v: unknown): StaffStatus | null {
  if (v === "active" || v === "inactive" || v === "suspended") return v;
  return null;
}

function isDuplicateAuthMessage(msg: string) {
  const m = msg.toLowerCase();
  return (
    m.includes("already registered") ||
    m.includes("already exists") ||
    m.includes("user already registered") ||
    m.includes("duplicate")
  );
}

function getBaseUrl(req: Request) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "http";

  if (!host) return "http://localhost:3000";

  const isLocal = host.includes("localhost") || host.startsWith("127.0.0.1");
  const scheme = isLocal ? "http" : proto;

  return `${scheme}://${host}`;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function cleanText(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t : null;
}

function cleanEmail(v: unknown): string | null {
  const t = cleanText(v);
  return t ? t.toLowerCase() : null;
}

function asIsoDate(v: unknown): string | null {
  const t = cleanText(v);
  if (!t) return null;
  // Accept YYYY-MM-DD only (matches HTML date input)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  return t;
}

function isValidUuid(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

async function requireAdmin(): Promise<NextResponse | null> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("main_role")
    .eq("id", userData.user.id)
    .maybeSingle<{ main_role: string }>();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!profile || profile.main_role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}

// =====================================================
// GET — list staff (filters + joins)
// =====================================================
export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { searchParams } = new URL(req.url);

  const search = searchParams.get("search")?.trim() ?? "";
  const roleParam = searchParams.get("role") ?? "";
  const statusParam = searchParams.get("status") ?? "";
  const unitParam = searchParams.get("unit") ?? "";

  const role = roleParam && roleParam !== "all" ? parseRole(roleParam) : null;
  const status = statusParam && statusParam !== "all" ? parseStatus(statusParam) : null;
  const unit = unitParam && unitParam !== "all" ? parseUnit(unitParam) : null;

  if (roleParam && roleParam !== "all" && !role) return NextResponse.json({ error: "Invalid role filter" }, { status: 400 });
  if (statusParam && statusParam !== "all" && !status) return NextResponse.json({ error: "Invalid status filter" }, { status: 400 });
  if (unitParam && unitParam !== "all" && !unit) return NextResponse.json({ error: "Invalid unit filter" }, { status: 400 });

  let query = supabaseAdmin
    .from("staff")
    .select(
      `
      *,
      profiles:profile_id!inner(*),
      departments(*)
    `
    )
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(`staff_id.ilike.%${search}%,designation.ilike.%${search}%,specialization.ilike.%${search}%`);
  }

  if (role) query = query.eq("profiles.main_role", role);
  if (status) query = query.eq("status", status);
  if (unit) query = query.eq("unit", unit);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ staff: data ?? [] });
}

// =====================================================
// POST — create staff (Invite → PROFILE → STAFF)
// Rules mirrored from UI:
// - unit required ONLY for non_academic_staff
// - department_id + hire_date required ONLY for academic_staff
// =====================================================
export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (guard) return guard;

  let createdAuthUserId: string | null = null;

  try {
    const body = (await req.json()) as unknown;

    if (!isRecord(body)) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const first_name = cleanText(body.first_name) ?? "";
    const middle_name = cleanText(body.middle_name);
    const last_name = cleanText(body.last_name) ?? "";
    const email = cleanEmail(body.email) ?? "";

    const phone = cleanText(body.phone); // required by your UX/API
    const gender = cleanText(body.gender);
    const date_of_birth = asIsoDate(body.date_of_birth);
    const nin = cleanText(body.nin);
    const address = cleanText(body.address);

    const state_of_origin = cleanText(body.state_of_origin);
    const lga_of_origin = cleanText(body.lga_of_origin);
    const religion = cleanText(body.religion);

    const main_role = parseRole(body.main_role);

    const designation = cleanText(body.designation); // required by your UX
    const specialization = cleanText(body.specialization);

    const department_id_raw = body.department_id;
    const department_id = isValidUuid(department_id_raw) ? department_id_raw : null;

    const hire_date = asIsoDate(body.hire_date);

    const unit = parseUnit(body.unit);

    // --------------------
    // Base required fields
    // --------------------
    if (!first_name || !last_name || !email || !main_role) {
      return NextResponse.json(
        { error: "Missing required fields: first_name, last_name, email, main_role" },
        { status: 400 }
      );
    }

    if (!phone) {
      return NextResponse.json({ error: "phone is required" }, { status: 400 });
    }

    if (!gender) {
      return NextResponse.json({ error: "gender is required" }, { status: 400 });
    }

    if (!designation) {
      return NextResponse.json({ error: "designation is required" }, { status: 400 });
    }

    // Prevent creating wrong roles via this endpoint
    if (main_role !== "academic_staff" && main_role !== "non_academic_staff") {
      return NextResponse.json({ error: "main_role must be academic_staff or non_academic_staff" }, { status: 400 });
    }

    // --------------------
    // Role-specific rules
    // --------------------
    if (main_role === "non_academic_staff") {
      if (!unit) {
        return NextResponse.json(
          { error: "unit is required for non_academic_staff (admissions | bursary | exams)" },
          { status: 400 }
        );
      }
      // Do not accept academic fields for non-academic (avoid silent bad data)
      // We allow them in payload but we will write nulls.
    }

    if (main_role === "academic_staff") {
      if (!hire_date) {
        return NextResponse.json({ error: "hire_date is required for academic_staff (YYYY-MM-DD)" }, { status: 400 });
      }
      if (!department_id) {
        return NextResponse.json({ error: "department_id is required for academic_staff (uuid)" }, { status: 400 });
      }
      // Academic should never have unit
      // We will enforce null on insert.
    }

    const redirectTo = new URL("/callback", getBaseUrl(req)).toString();

    // 1) INVITE AUTH USER
    const { data: inviteRes, error: inviteErr } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: { onboarding_status: "pending", main_role },
        redirectTo,
      });

    if (inviteErr) {
      const msg = inviteErr.message ?? "Invite failed";
      const isDup = isDuplicateAuthMessage(msg);
      return NextResponse.json(
        { error: isDup ? "User already exists" : msg },
        { status: isDup ? 409 : 400 }
      );
    }

    const user = inviteRes?.user;
    if (!user?.id) {
      return NextResponse.json({ error: "Auth invite failed (no user id)" }, { status: 400 });
    }
    createdAuthUserId = user.id;

    // 2) CREATE PROFILE (profiles has no unit; unit stays in staff)
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: createdAuthUserId,
        first_name,
        middle_name: middle_name ?? null,
        last_name,
        email,
        phone,
        gender,
        date_of_birth,
        nin,
        address,
        state_of_origin,
        lga_of_origin,
        religion,
        main_role,
        onboarding_status: "pending",
      })
      .select("id")
      .single<{ id: string }>();

    if (profileErr || !profile) {
      await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
      createdAuthUserId = null;
      return NextResponse.json(
        { error: profileErr?.message ?? "Failed to create profile" },
        { status: 400 }
      );
    }

    // 3) STAFF ID GENERATION
    let deptCode = "GEN";

    // Only academic has department_id by rule
    const deptIdForCode = main_role === "academic_staff" ? department_id : null;

    if (deptIdForCode) {
      const { data: dept } = await supabaseAdmin
        .from("departments")
        .select("id,code")
        .eq("id", deptIdForCode)
        .maybeSingle<DepartmentRow>();

      if (dept?.code) deptCode = dept.code;
    }

    const year = hire_date ? new Date(hire_date).getFullYear() : new Date().getFullYear();
    const yy = String(year).slice(-2);

    const baseCountQuery = supabaseAdmin
      .from("staff")
      .select("id", { count: "exact", head: true })
      .like("staff_id", `%/${yy}/%`);

    const countQuery = deptIdForCode
      ? baseCountQuery.eq("department_id", deptIdForCode)
      : baseCountQuery.is("department_id", null);

    const { count, error: countErr } = await countQuery;

    if (countErr) {
      await supabaseAdmin.from("profiles").delete().eq("id", profile.id);
      await supabaseAdmin.auth.admin.deleteUser(profile.id);
      createdAuthUserId = null;
      return NextResponse.json({ error: countErr.message }, { status: 400 });
    }

    const seq = String((count ?? 0) + 1).padStart(4, "0");
    const staff_id = `STF/${deptCode}/${yy}/${seq}`;

    // 4) CREATE STAFF (role-safe writes)
    const staffInsert = {
      profile_id: profile.id,
      staff_id,
      designation, // required already
      specialization: specialization ?? null,
      department_id: main_role === "academic_staff" ? department_id : null,
      hire_date: main_role === "academic_staff" ? hire_date : null,
      status: "active" as const,
      unit: main_role === "non_academic_staff" ? unit : null,
    };

    const { data: staff, error: staffErr } = await supabaseAdmin
      .from("staff")
      .insert(staffInsert)
      .select()
      .single();

    if (staffErr || !staff) {
      await supabaseAdmin.from("profiles").delete().eq("id", profile.id);
      await supabaseAdmin.auth.admin.deleteUser(profile.id);
      createdAuthUserId = null;
      return NextResponse.json(
        { error: staffErr?.message ?? "Failed to create staff record" },
        { status: 400 }
      );
    }

    // 5) ACTIVATE PROFILE
    await supabaseAdmin.from("profiles").update({ onboarding_status: "active" }).eq("id", profile.id);

    return NextResponse.json({
      success: true,
      staffId: (staff as { staff_id?: string }).staff_id ?? null,
      inviteQueued: true,
      redirectTo,
      staff,
    });
  } catch (err) {
    if (createdAuthUserId) {
      await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected server error" },
      { status: 500 }
    );
  }
}
