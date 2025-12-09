// app/api/applications/[id]/review/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { acceptApplication } from "@/lib/utils/applications";

type Action = "accept" | "reject";

interface ReviewBody {
  action: Action;
  rejectionReason?: string;
}

interface ApplicationRow {
  id: string;
  status: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  email: string;
  phone: string | null;
  gender: string | null;
  date_of_birth: string | null;
  program_id: string | null;
  session_id: string | null;
  class_applied_for: string | null;
  converted_to_student: boolean | null;
  student_id: string | null;
}

export async function PATCH(req: Request) {
  try {
    const { action, rejectionReason } = (await req.json()) as ReviewBody;

    if (action !== "accept" && action !== "reject") {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    if (action === "reject" && !rejectionReason?.trim()) {
      return NextResponse.json(
        { error: "Rejection reason required." },
        { status: 400 }
      );
    }

    // Extract ID from URL
    const url = new URL(req.url);
    const segments = url.pathname.split("/").filter(Boolean);
    const appsIndex = segments.indexOf("applications");
    const id =
      appsIndex >= 0 && segments.length > appsIndex + 1
        ? segments[appsIndex + 1]
        : null;

    if (!id) {
      return NextResponse.json(
        { error: "Missing application id." },
        { status: 400 }
      );
    }

    // Fetch application
    const { data: application, error: appErr } = await supabaseAdmin
      .from("applications")
      .select(
        `
        id,
        status,
        converted_to_student,
        student_id,
        first_name,
        middle_name,
        last_name,
        email,
        phone,
        gender,
        date_of_birth,
        program_id,
        session_id,
        class_applied_for
      `
      )
      .eq("id", id)
      .single<ApplicationRow>();

    if (appErr || !application) {
      return NextResponse.json(
        { error: "Application not found." },
        { status: 404 }
      );
    }

    if (application.status !== "pending") {
      return NextResponse.json(
        { error: "Application already reviewed." },
        { status: 400 }
      );
    }

    // ----- ❌ REJECT -----
    if (action === "reject") {
      const { error: updateErr } = await supabaseAdmin
        .from("applications")
        .update({
          status: "rejected",
          rejection_reason: rejectionReason ?? null,
          reviewed_by: "SYSTEM",
          reviewed_date: new Date().toISOString(),
        })
        .eq("id", application.id);

      if (updateErr) {
        return NextResponse.json(
          { error: updateErr.message },
          { status: 400 }
        );
      }

      return NextResponse.json({ success: true });
    }

    // ----- ✅ ACCEPT -----
    const result = await acceptApplication(application);

    return NextResponse.json({
      success: true,
      studentId: result.studentId,
      createdNewUser: result.createdNewUser,
      tempPassword: result.tempPassword,
    });
  } catch (err) {
    console.error("Review API error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Unexpected server error.",
      },
      { status: 500 }
    );
  }
}
