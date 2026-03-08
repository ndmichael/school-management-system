import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase/admin";

function isUuid(v: string): boolean {
  return /^[0-9a-f-]{36}$/i.test(v);
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {

  const { id: applicationId } = await ctx.params;

  if (!isUuid(applicationId)) {
    return NextResponse.json({ error: "Invalid application id" }, { status: 400 });
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // get admin profile
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("main_role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 403 });
  }

  let authorized = false;

  if (profile.main_role === "admin") {
    authorized = true;
  }

  if (profile.main_role === "non_academic_staff") {
    const { data: staff } = await supabaseAdmin
      .from("staff")
      .select("unit")
      .eq("profile_id", user.id)
      .single();

    if (staff?.unit === "admissions") {
      authorized = true;
    }
  }

  if (!authorized) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // load application email
  const { data: application } = await supabaseAdmin
    .from("applications")
    .select("email")
    .eq("id", applicationId)
    .single();

  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const email = application.email;

  // create auth user
  const { data: authUser, error: authErr } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: false
    });

  if (authErr) {
    return NextResponse.json({ error: authErr.message }, { status: 500 });
  }

  const authUserId = authUser.user.id;

  // call rpc
  const { data, error } = await supabaseAdmin.rpc(
    "convert_application_to_student",
    {
      p_application_id: applicationId,
      p_auth_user_id: authUserId
    }
  );

  // rollback auth user if RPC fails
  if (error) {

    await supabaseAdmin.auth.admin.deleteUser(authUserId);

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  // send invite email
  await supabaseAdmin.auth.admin.inviteUserByEmail(email);

  return NextResponse.json({
    success: true,
    student_id: data.student_id,
    matric_no: data.matric_no
  });

}