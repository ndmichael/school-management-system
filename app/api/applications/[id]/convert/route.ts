import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { randomUUID } from "crypto";

type ConversionRpcResult = {
  student_id?: string;
  matric_no?: string | null;
  registration_id?: string | null;
  annual_fee?: number | null;
  registration_created?: boolean;
  fee_account_created?: boolean;
};

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
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
    return NextResponse.json(
      { error: "Invalid application id" },
      { status: 400 }
    );
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

  const cleanupCreatedAuthUser = async () => {
    if (!createdAuthUserId) return;

    const { error } = await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);

    if (error) {
      console.error("[CONVERT_APPLICATION_CLEANUP_ERROR]", error);
    }

    createdAuthUserId = null;
  };

  try {
    const {
      data: { user },
      error: authUserErr,
    } = await supabase.auth.getUser();

    if (authUserErr) {
      return fail("get_current_user", authUserErr, 401);
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("main_role")
      .eq("id", user.id)
      .single();

    if (profileErr) {
      return fail("load_requester_profile", profileErr, 403);
    }

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

      if (staffErr) {
        return fail("load_requester_staff", staffErr, 403);
      }

      if (staff?.unit === "admissions") {
        authorized = true;
      }
    }

    if (!authorized) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const { data: application, error: appErr } = await supabaseAdmin
      .from("applications")
      .select("email, status, converted_to_student, student_id")
      .eq("id", applicationId)
      .single<{
        email: string | null;
        status: string | null;
        converted_to_student: boolean | null;
        student_id: string | null;
      }>();

    if (appErr || !application) {
      return fail(
        "load_application",
        appErr ?? { message: "Application not found" },
        404
      );
    }

    if (application.status !== "accepted") {
      return NextResponse.json(
        { error: "Only accepted applications can be converted." },
        { status: 400 }
      );
    }

    if (application.converted_to_student || application.student_id) {
      return NextResponse.json(
        { error: "Application has already been converted." },
        { status: 409 }
      );
    }

    const email = String(application.email ?? "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { error: "Application email is missing" },
        { status: 400 }
      );
    }

    const { data: existingProfileByEmail, error: existingProfileErr } =
      await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

    if (existingProfileErr) {
      return fail("check_existing_profile_email", existingProfileErr, 400);
    }

    if (existingProfileByEmail) {
      return NextResponse.json(
        { error: "A profile with this email already exists." },
        { status: 409 }
      );
    }

    const baseUrl = (
      process.env.NEXT_PUBLIC_SITE_URL ?? getBaseUrl(req)
    ).replace(/\/$/, "");

    console.log("[CONVERT_APPLICATION] creating auth user", {
      email,
    });

    // Create a temporary password and create a user.
    const tempPassword = randomUUID() + randomUUID();

    const { data: authUser, error: authErr } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
      });

    if (authErr) {
      const msg = authErr.message ?? "Auth user creation failed.";
      const isDup = isDuplicateAuthMessage(msg);

      return fail(
        "create_auth_user",
        {
          auth_error: serializeError(authErr),
          duplicate_detected: isDup,
          email,
        },
        isDup ? 409 : 400
      );
    }

    const authUserId = authUser?.user?.id ?? null;

    if (!authUserId) {
      return fail(
        "create_auth_user_no_id",
        { message: "Auth invite returned no user id" },
        400
      );
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
      await cleanupCreatedAuthUser();
      return fail("convert_application_to_student_rpc", error, 500);
    }

    const conversion = data as ConversionRpcResult | null;

    const studentId = conversion?.student_id;
    const matricNo = conversion?.matric_no ?? null;

    if (!studentId || !isUuid(studentId)) {
      await cleanupCreatedAuthUser();

      return NextResponse.json(
        { error: "Conversion succeeded but student_id was not returned" },
        { status: 500 }
      );
    }

    const setupRedirectTo = `${baseUrl}/api/auth/confirm?next=/set-password`;

    const { error: setupEmailErr } = await supabaseAdmin.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: setupRedirectTo,
      }
    );

    if (setupEmailErr) {
      console.error("[CONVERT_APPLICATION_SETUP_EMAIL_ERROR]", setupEmailErr);
    }



    createdAuthUserId = null;

    return NextResponse.json({
      success: true,
      student_id: studentId,
      matric_no: matricNo,
      registration_id: conversion?.registration_id ?? null,
      registration_created: conversion?.registration_created ?? true,
      fee_account_created: conversion?.fee_account_created ?? true,
      annual_fee: conversion?.annual_fee ?? null,
      setup_email_sent: !setupEmailErr,
      setup_email_error: setupEmailErr?.message ?? null,
    });
  } catch (err) {
    console.error("[CONVERT_APPLICATION_FATAL]", err);

    await cleanupCreatedAuthUser();

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