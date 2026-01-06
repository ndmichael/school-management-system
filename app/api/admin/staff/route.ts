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

async function requireAdmin(): Promise<NextResponse | null> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  // ✅ Strict parsing
  const role = roleParam && roleParam !== "all" ? parseRole(roleParam) : null;
  const status = statusParam && statusParam !== "all" ? parseStatus(statusParam) : null;
  const unit = unitParam && unitParam !== "all" ? parseUnit(unitParam) : null;

  if (roleParam && roleParam !== "all" && !role) {
    return NextResponse.json({ error: "Invalid role filter" }, { status: 400 });
  }
  if (statusParam && statusParam !== "all" && !status) {
    return NextResponse.json({ error: "Invalid status filter" }, { status: 400 });
  }
  if (unitParam && unitParam !== "all" && !unit) {
    return NextResponse.json({ error: "Invalid unit filter" }, { status: 400 });
  }

  let query = supabaseAdmin
    .from("staff")
    .select(
      `
      *,
      profiles:profile_id(*),
      departments(*)
    `
    )
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(
      `staff_id.ilike.%${search}%,designation.ilike.%${search}%,specialization.ilike.%${search}%`
    );
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
// =====================================================
export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (guard) return guard;

  let createdAuthUserId: string | null = null;

  try {
    const body = (await req.json()) as Record<string, unknown>;

    const first_name = typeof body.first_name === "string" ? body.first_name.trim() : "";
    const middle_name = typeof body.middle_name === "string" ? body.middle_name.trim() : "";
    const last_name = typeof body.last_name === "string" ? body.last_name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const gender = typeof body.gender === "string" ? body.gender : null;
    const date_of_birth = typeof body.date_of_birth === "string" ? body.date_of_birth : null;
    const nin = typeof body.nin === "string" ? body.nin.trim() : null;
    const address = typeof body.address === "string" ? body.address.trim() : null;

    const state_of_origin =
      typeof body.state_of_origin === "string" ? body.state_of_origin.trim() : null;
    const lga_of_origin =
      typeof body.lga_of_origin === "string" ? body.lga_of_origin.trim() : null;
    const religion = typeof body.religion === "string" ? body.religion.trim() : null;

    const main_role = parseRole(body.main_role);
    const designation = typeof body.designation === "string" ? body.designation.trim() : null;
    const specialization =
      typeof body.specialization === "string" ? body.specialization.trim() : null;
    const department_id = typeof body.department_id === "string" ? body.department_id : null;
    const hire_date = typeof body.hire_date === "string" ? body.hire_date : null;

    // ✅ unit (required only for non academic staff)
    const unit = parseUnit(body.unit);

    if (!first_name || !last_name || !email || !main_role) {
      return NextResponse.json(
        { error: "Missing required fields: first_name, last_name, email, main_role" },
        { status: 400 }
      );
    }

    // I’m keeping your modal validation (phone required) consistent with API
    if (!phone) {
      return NextResponse.json({ error: "phone is required" }, { status: 400 });
    }

    if (main_role === "non_academic_staff" && !unit) {
      return NextResponse.json(
        { error: "unit is required for non_academic_staff (admissions | bursary | exams)" },
        { status: 400 }
      );
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

    // 2) CREATE PROFILE
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: createdAuthUserId,
        first_name,
        middle_name: middle_name ? middle_name : null,
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
    if (department_id) {
      const { data: dept } = await supabaseAdmin
        .from("departments")
        .select("id,code")
        .eq("id", department_id)
        .maybeSingle<DepartmentRow>();

      if (dept?.code) deptCode = dept.code;
    }

    const year = hire_date ? new Date(hire_date).getFullYear() : new Date().getFullYear();
    const yy = String(year).slice(-2);

    const baseCountQuery = supabaseAdmin
      .from("staff")
      .select("id", { count: "exact", head: true })
      .like("staff_id", `%/${yy}/%`);

    const countQuery = department_id
      ? baseCountQuery.eq("department_id", department_id)
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

    // 4) CREATE STAFF
    const { data: staff, error: staffErr } = await supabaseAdmin
      .from("staff")
      .insert({
        profile_id: profile.id,
        staff_id,
        designation,
        specialization,
        department_id,
        hire_date,
        status: "active",
        unit: main_role === "non_academic_staff" ? unit : null,
      })
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
