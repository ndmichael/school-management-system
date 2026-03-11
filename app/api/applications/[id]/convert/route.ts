import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase/admin";

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function getBaseUrl(req: Request) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "http";

  if (!host) return "http://localhost:3000";

  const isLocal = host.includes("localhost") || host.startsWith("127.0.0.1");
  const scheme = isLocal ? "http" : proto;

  return `${scheme}://${host}`;
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

function serializeError(err: unknown) {
  if (!err) return null;
  if (typeof err === "string") return { message: err };

  if (typeof err === "object") {
    const e = err as Record<string, unknown>;
    return {
      message: typeof e.message === "string" ? e.message : null,
      code: typeof e.code === "string" ? e.code : null,
      status: typeof e.status === "number" ? e.status : null,
      details: typeof e.details === "string" ? e.details : null,
      hint: typeof e.hint === "string" ? e.hint : null,
      name: typeof e.name === "string" ? e.name : null,
      raw: e,
    };
  }

  return { message: String(err) };
}

function fail(step: string, error: unknown, status = 400) {
  const payload = {
    error: `Failed at step: ${step}`,
    step,
    debug: serializeError(error),
  };

  console.error("[CONVERT_APPLICATION_ERROR]", JSON.stringify(payload, null, 2));
  return NextResponse.json(payload, { status });
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

  let createdAuthUserId: string | null = null;

  try {
    const {
      data: { user },
      error: authUserErr,
    } = await supabase.auth.getUser();

    if (authUserErr) return fail("get_current_user", authUserErr, 401);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("main_role")
      .eq("id", user.id)
      .single();

    if (profileErr) return fail("load_requester_profile", profileErr, 403);

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 403 });
    }

    let authorized = false;

    if (profile.main_role === "admin") {
      authorized = true;
    }

    if (profile.main_role === "non_academic_staff") {
      const { data: staff, error: staffErr } = await supabaseAdmin
        .from("staff")
        .select("unit")
        .eq("profile_id", user.id)
        .single();

      if (staffErr) return fail("load_requester_staff", staffErr, 403);

      if (staff?.unit === "admissions") {
        authorized = true;
      }
    }

    if (!authorized) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const { data: application, error: appErr } = await supabaseAdmin
    .from("applications")
    .select("email, program_id, session_id, class_applied_for")
    .eq("id", applicationId)
    .single<{
      email: string | null;
      program_id: string | null;
      session_id: string | null;
      class_applied_for: string | null;
    }>();

    if (appErr || !application) {
      return fail("load_application", appErr ?? { message: "Application not found" }, 404);
    }

    const email = String(application.email ?? "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { error: "Application email is missing" },
        { status: 400 }
      );
    }

    const { data: existingProfileByEmail, error: existingProfileErr } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingProfileErr) return fail("check_existing_profile_email", existingProfileErr, 400);

    if (existingProfileByEmail) {
      return NextResponse.json(
        { error: "A profile with this email already exists." },
        { status: 409 }
      );
    }

    const { data: authUsersData, error: listUsersErr } =
      await supabaseAdmin.auth.admin.listUsers();

    if (listUsersErr) {
      return fail("list_auth_users", listUsersErr, 500);
    }

    const authExists = authUsersData.users.some(
      (u) => (u.email ?? "").toLowerCase() === email
    );

    if (authExists) {
      return NextResponse.json(
        {
          error:
            "User already exists in auth (delete them or use a different email).",
        },
        { status: 409 }
      );
    }

    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? getBaseUrl(req)).replace(/\/$/, "");
    const redirectTo = `${baseUrl}/api/auth/confirm`;

    console.log("[CONVERT_APPLICATION] creating auth user", { email, redirectTo });

    const { data: authUser, error: authErr } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: {
          onboarding_status: "pending",
          main_role: "student",
        },
      });

    if (authErr) {
      const msg = authErr.message ?? "Invite failed";
      const isDup = isDuplicateAuthMessage(msg);

      return fail(
        "create_auth_user",
        {
          ...serializeError(authErr),
          duplicate_detected: isDup,
          email,
          redirectTo,
        },
        isDup ? 409 : 400
      );
    }

    const authUserId = authUser?.user?.id ?? null;

    if (!authUserId) {
      return fail("create_auth_user_no_id", { message: "Auth invite returned no user id" }, 400);
    }

    createdAuthUserId = authUserId;

    const { data, error } = await supabaseAdmin.rpc(
      "convert_application_to_student",
      {
        p_application_id: applicationId,
        p_auth_user_id: authUserId,
      }
    );

    if (error) {
      if (createdAuthUserId) {
        await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
        createdAuthUserId = null;
      }

      return fail("convert_application_to_student_rpc", error, 500);
    }

    const studentId = data?.student_id as string | undefined;
    const matricNo = data?.matric_no as string | undefined;

    if (!studentId || !isUuid(studentId)) {
      if (createdAuthUserId) {
        await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
        createdAuthUserId = null;
      }

      return NextResponse.json(
        { error: "Conversion succeeded but student_id was not returned" },
        { status: 500 }
      );
    }

    const sessionId = application.session_id;
    const programId = application.program_id;
    const level = application.class_applied_for ?? null;

    if (!sessionId || !isUuid(sessionId) || !programId || !isUuid(programId)) {
      if (createdAuthUserId) {
        await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
        createdAuthUserId = null;
      }

      return NextResponse.json(
        { error: "Converted student is missing program/session required for fee setup" },
        { status: 500 }
      );
    }

    const { data: existingRegistration, error: existingRegErr } = await supabaseAdmin
      .from("student_registrations")
      .select("id")
      .eq("student_id", studentId)
      .eq("session_id", sessionId)
      .maybeSingle<{ id: string }>();

    if (existingRegErr) {
      if (createdAuthUserId) {
        await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
        createdAuthUserId = null;
      }

      return fail("check_existing_registration", existingRegErr, 500);
    }

    let registrationId = existingRegistration?.id ?? null;

    if (!registrationId) {
      const { data: registration, error: regErr } = await supabaseAdmin
        .from("student_registrations")
        .insert({
          student_id: studentId,
          session_id: sessionId,
          level,
          status: "registered",
        })
        .select("id")
        .single<{ id: string }>();

      if (regErr || !registration) {
        if (createdAuthUserId) {
          await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
          createdAuthUserId = null;
        }

        return fail(
          "create_student_registration",
          regErr ?? { message: "Failed to create student registration" },
          500
        );
      }

      registrationId = registration.id;
    }

    const { data: existingFeeAccount, error: existingFeeErr } = await supabaseAdmin
      .from("student_fee_accounts")
      .select("id")
      .eq("student_registration_id", registrationId)
      .maybeSingle<{ id: string }>();

    if (existingFeeErr) {
      if (createdAuthUserId) {
        await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
        createdAuthUserId = null;
      }

      return fail("check_existing_fee_account", existingFeeErr, 500);
    }

    let annualFee: number | null = null;

    if (!existingFeeAccount) {
      const { data: feePlan, error: feePlanErr } = await supabaseAdmin
        .from("program_fee_plans")
        .select("annual_fee")
        .eq("program_id", programId)
        .eq("session_id", sessionId)
        .maybeSingle<{ annual_fee: number }>();

      if (feePlanErr) {
        if (createdAuthUserId) {
          await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
          createdAuthUserId = null;
        }

        return fail("load_fee_plan", feePlanErr, 500);
      }

      if (!feePlan) {
        if (createdAuthUserId) {
          await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
          createdAuthUserId = null;
        }

        return NextResponse.json(
          { error: "No fee plan found for converted student's program/session" },
          { status: 500 }
        );
      }

      annualFee = Number(feePlan.annual_fee ?? 0);

      if (!Number.isFinite(annualFee) || annualFee < 0) {
        if (createdAuthUserId) {
          await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
          createdAuthUserId = null;
        }

        return NextResponse.json(
          { error: "Invalid annual fee configured for converted student's program/session" },
          { status: 500 }
        );
      }

      const { error: feeAccountErr } = await supabaseAdmin
        .from("student_fee_accounts")
        .insert({
          student_registration_id: registrationId,
          program_id: programId,
          annual_fee: annualFee,
          total_paid_approved: 0,
          balance_due: annualFee,
          payment_status: "unpaid",
        });

      if (feeAccountErr) {
        if (createdAuthUserId) {
          await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
          createdAuthUserId = null;
        }

        return fail("create_student_fee_account", feeAccountErr, 500);
      }
    }

    return NextResponse.json({
      success: true,
      student_id: studentId,
      matric_no: matricNo ?? null,
      registration_created: !existingRegistration,
      fee_account_created: !existingFeeAccount,
      annual_fee: annualFee,
    });
  } catch (err) {
    console.error("[CONVERT_APPLICATION_FATAL]", err);

    if (createdAuthUserId) {
      await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
    }

    return NextResponse.json(
      {
        error: "Server error",
        step: "unhandled_catch",
        debug: serializeError(err),
      },
      { status: 500 }
    );
  }
}