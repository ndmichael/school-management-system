import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const search = searchParams.get("search")?.trim() || "";
  const role = searchParams.get("role") || "all"; // academic_staff | non_academic_staff | all
  const status = searchParams.get("status") || "all";

  let query = supabaseAdmin
    .from("staff")
    .select(
      `
        id,
        staff_id,
        designation,
        specialization,
        status,
        department_id,
        created_at,
        profiles:profile_id(
          id,
          first_name,
          last_name,
          email,
          phone,
          avatar_url,
          main_role
        ),
        departments(id, name, code)
      `
    )
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(
      `staff_id.ilike.%${search}%,designation.ilike.%${search}%,specialization.ilike.%${search}%`
    );
  }

  if (role !== "all") {
    query = query.eq("profiles.main_role", role);
  }

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ staff: data ?? [] });
}

export async function POST(req: Request) {
  let createdAuthUserId: string | null = null;

  try {
    const body = (await req.json()) as Record<string, unknown>;

    const first_name = typeof body.first_name === "string" ? body.first_name.trim() : "";
    const middle_name = typeof body.middle_name === "string" ? body.middle_name.trim() : null;
    const last_name = typeof body.last_name === "string" ? body.last_name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : null;

    const gender = typeof body.gender === "string" ? body.gender : null;
    const date_of_birth = typeof body.date_of_birth === "string" ? body.date_of_birth : null;
    const nin = typeof body.nin === "string" ? body.nin.trim() : null;
    const address = typeof body.address === "string" ? body.address.trim() : null;
    const state_of_origin = typeof body.state_of_origin === "string" ? body.state_of_origin.trim() : null;
    const lga_of_origin = typeof body.lga_of_origin === "string" ? body.lga_of_origin.trim() : null;
    const religion = typeof body.religion === "string" ? body.religion.trim() : null;

    const main_role = typeof body.main_role === "string" ? body.main_role : "";
    const designation = typeof body.designation === "string" ? body.designation.trim() : null;
    const specialization = typeof body.specialization === "string" ? body.specialization.trim() : null;
    const department_id = typeof body.department_id === "string" ? body.department_id : null;
    const hire_date = typeof body.hire_date === "string" ? body.hire_date : null;

    if (!first_name || !last_name || !email || !main_role) {
      return NextResponse.json(
        { error: "Missing required fields: first_name, last_name, email, main_role" },
        { status: 400 }
      );
    }

    // 0) 409 pre-check (profiles email)
    const { data: existingProfile, error: profCheckErr } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (profCheckErr) return NextResponse.json({ error: profCheckErr.message }, { status: 400 });
    if (existingProfile) return NextResponse.json({ error: "Email already exists." }, { status: 409 });

    // 1) Create AUTH (pending)
    const tempPassword = crypto.randomUUID().replace(/-/g, "").slice(0, 12);

    const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: false,
      user_metadata: { onboarding_status: "pending", main_role },
    });

    if (authErr || !authUser.user) {
      // If email already exists in auth, Supabase returns an error here -> treat as 409
      const msg = authErr?.message ?? "Failed to create authentication user.";
      const status = msg.toLowerCase().includes("already") ? 409 : 400;
      return NextResponse.json({ error: msg }, { status });
    }

    createdAuthUserId = authUser.user.id;

    // 2) Create PROFILE
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: createdAuthUserId,
        first_name,
        middle_name,
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
      })
      .select("id")
      .single();

    if (profileErr || !profile) {
      await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
      return NextResponse.json({ error: profileErr?.message ?? "Failed to create profile." }, { status: 400 });
    }

    // 3) Dept code (optional)
    let deptCode = "GEN";
    if (department_id) {
      const { data: dept, error: deptErr } = await supabaseAdmin
        .from("departments")
        .select("code")
        .eq("id", department_id)
        .maybeSingle();

      if (deptErr) {
        await supabaseAdmin.from("profiles").delete().eq("id", profile.id);
        await supabaseAdmin.auth.admin.deleteUser(profile.id);
        return NextResponse.json({ error: deptErr.message }, { status: 400 });
      }
      if (dept?.code) deptCode = dept.code;
    }

    // 4) Year segment
    const hireYear = hire_date ? new Date(hire_date).getFullYear() : new Date().getFullYear();
    const yy = String(hireYear).slice(-2);

    // 5) Collision-safe sequence via DB function
    const seqKey = `staff:${deptCode}`;
    const { data: seqVal, error: seqErr } = await supabaseAdmin.rpc("next_sequence", {
      p_seq_key: seqKey,
      p_seq_year: yy,
    });

    if (seqErr || typeof seqVal !== "number") {
      await supabaseAdmin.from("profiles").delete().eq("id", profile.id);
      await supabaseAdmin.auth.admin.deleteUser(profile.id);
      return NextResponse.json({ error: seqErr?.message ?? "Failed to allocate staff sequence." }, { status: 400 });
    }

    const nextSeq = String(seqVal).padStart(4, "0");
    const staffId = `STF/${deptCode}/${yy}/${nextSeq}`;

    // 6) Insert STAFF
    const { data: staff, error: staffErr } = await supabaseAdmin
      .from("staff")
      .insert({
        profile_id: profile.id,
        staff_id: staffId,
        designation,
        specialization,
        department_id,
        hire_date,
        status: "active",
      })
      .select("id, staff_id, profile_id, created_at")
      .single();

    if (staffErr || !staff) {
      await supabaseAdmin.from("profiles").delete().eq("id", profile.id);
      await supabaseAdmin.auth.admin.deleteUser(profile.id);
      return NextResponse.json({ error: staffErr?.message ?? "Failed to create staff record." }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      staffId: staff.staff_id,
      tempPassword, // show in admin UI (your “option 1”)
      staff,
    });
  } catch (err) {
    if (createdAuthUserId) await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected server error" },
      { status: 500 }
    );
  }
}
