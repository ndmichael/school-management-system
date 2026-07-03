import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type Action = "accept" | "reject";

interface ReviewBody {
  action: Action;
  rejectionReason?: string;
}

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: applicationId } = await context.params;

  if (!isUuid(applicationId)) {
    return NextResponse.json(
      { error: "Invalid application id." },
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ------------------------------------------------------------
  // LOAD PROFILE
  // ------------------------------------------------------------
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from("profiles")
    .select("main_role")
    .eq("id", user.id)
    .single();

  if (profileErr) {
    return NextResponse.json(
      { error: profileErr.message },
      { status: 403 }
    );
  }

  if (!profile) {
    return NextResponse.json(
      { error: "Profile not found" },
      { status: 403 }
    );
  }

  // ------------------------------------------------------------
  // AUTHORIZATION
  // admin OR non_academic_staff in admissions unit
  // ------------------------------------------------------------
  let authorized = false;

  if (profile.main_role === "admin") {
    authorized = true;
  } else if (profile.main_role === "non_academic_staff") {
    const { data: staff, error: staffErr } = await supabaseAdmin
      .from("staff")
      .select("unit")
      .eq("profile_id", user.id)
      .single();

    if (staffErr) {
      return NextResponse.json(
        { error: staffErr.message },
        { status: 403 }
      );
    }

    if (staff?.unit === "admissions") {
      authorized = true;
    }
  }

  if (!authorized) {
    return NextResponse.json(
      { error: "Not authorized to review applications" },
      { status: 403 }
    );
  }

  // ------------------------------------------------------------
  // PARSE BODY
  // ------------------------------------------------------------
  const body: unknown = await req.json().catch(() => null);

  if (typeof body !== "object" || body === null || !("action" in body)) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { action, rejectionReason } = body as ReviewBody;

  if (action !== "accept" && action !== "reject") {
    return NextResponse.json(
      { error: "Invalid action." },
      { status: 400 }
    );
  }

  // rejection musnt be empty
  if (action === "reject" && !rejectionReason?.trim()) {
    return NextResponse.json(
      { error: "Rejection reason is required." },
      { status: 400 }
    );
  }

  // ------------------------------------------------------------
  // PREVENT DOUBLE REVIEW
  // ------------------------------------------------------------
  const { data: existing, error: existingErr } = await supabaseAdmin
    .from("applications")
    .select("status")
    .eq("id", applicationId)
    .single();

  if (existingErr) {
    return NextResponse.json(
      { error: existingErr.message },
      { status: 404 }
    );
  }

  if (!existing) {
    return NextResponse.json(
      { error: "Application not found" },
      { status: 404 }
    );
  }

  if (existing.status === "accepted" || existing.status === "rejected") {
    return NextResponse.json(
      { error: "Application already reviewed" },
      { status: 400 }
    );
  }

  // ------------------------------------------------------------
  // UPDATE STATUS
  // ------------------------------------------------------------
  const updatePayload =
    action === "reject"
      ? {
          status: "rejected",
          rejection_reason: rejectionReason!.trim(),
        }
      : {
          status: "accepted",
          rejection_reason: null,
        };

  const { error: updateErr } = await supabaseAdmin
    .from("applications")
    .update({
      ...updatePayload,
      reviewed_by: user.id,
      reviewed_date: new Date().toISOString(),
    })
    .eq("id", applicationId)
    .eq("status", "pending"); // prevents race conditions

  if (updateErr) {
    return NextResponse.json(
      { error: updateErr.message },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    action,
  });
}