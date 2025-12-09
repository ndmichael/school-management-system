import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Action = "accept" | "reject";

interface ReviewBody {
  action: Action;
  rejectionReason?: string;
}

// For now just log "email" instead of real sending
async function sendApplicationDecisionEmail(params: {
  to: string;
  fullName: string;
  programName?: string | null;
  decision: "accepted" | "rejected";
  rejectionReason?: string;
}) {
  console.log("📧 EMAIL MOCK:", params);
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = (await req.json()) as ReviewBody;
    const { action, rejectionReason } = body;

    if (action !== "accept" && action !== "reject") {
      return NextResponse.json(
        { error: "Invalid action. Use 'accept' or 'reject'." },
        { status: 400 }
      );
    }

    if (action === "reject" && !rejectionReason?.trim()) {
      return NextResponse.json(
        { error: "Rejection reason is required." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 1️⃣ Get application with program name
    const { data: application, error: appError } = await supabase
      .from("applications")
      .select(
        `
        id,
        email,
        first_name,
        middle_name,
        last_name,
        status,
        program_id,
        program:programs(name)
      `
      )
      .eq("id", params.id)
      .single();

    if (appError || !application) {
      console.error("Application fetch error:", appError);
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

    const newStatus = action === "accept" ? "accepted" : "rejected";

    // 2️⃣ Update application row
    const { data: updated, error: updateError } = await supabase
      .from("applications")
      .update({
        status: newStatus,
        reviewed_by: "SYSTEM", // later: auth user
        reviewed_date: new Date().toISOString(),
        rejection_reason: action === "reject" ? rejectionReason ?? null : null,
      })
      .eq("id", params.id)
      .select()
      .single();

    if (updateError) {
      console.error("Application update error:", updateError);
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      );
    }

    // 3️⃣ Email mock (safe)
    try {
      const fullName = `${application.first_name} ${
        application.middle_name ? application.middle_name + " " : ""
      }${application.last_name}`;

      await sendApplicationDecisionEmail({
        to: application.email,
        fullName,
        programName: application.program?.name ?? null,
        decision: newStatus,
        rejectionReason: action === "reject" ? rejectionReason : undefined,
      });
    } catch (e) {
      console.error("Email send error (mock):", e);
    }

    return NextResponse.json({ success: true, application: updated });
  } catch (err: any) {
    console.error("/api/applications/[id]/review error:", err);
    return NextResponse.json(
      { error: err.message || "Invalid request" },
      { status: 400 }
    );
  }
}
