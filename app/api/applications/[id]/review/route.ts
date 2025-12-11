import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Action = "accept" | "reject";

interface ReviewBody {
  action: Action;
  rejectionReason?: string;
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  console.log("🔥 REVIEW ROUTE HIT");

  // Next.js 14: params is a Promise
  const { id: applicationId } = await context.params;

  console.log("🔥 Extracted applicationId:", applicationId);

  if (!applicationId) {
    return NextResponse.json(
      { error: "Missing application id." },
      { status: 400 }
    );
  }

  const { action, rejectionReason } = (await req.json()) as ReviewBody;

  console.log("🔥 Action:", action, "Reason:", rejectionReason);

  // --------------------------------------------------------------------------------------
  // ❌ REJECT LOGIC
  // --------------------------------------------------------------------------------------
  if (action === "reject") {
    const { data, error } = await supabaseAdmin
      .from("applications")
      .update({
        status: "rejected",
        rejection_reason: rejectionReason ?? null,
        reviewed_by: "SYSTEM",
        reviewed_date: new Date().toISOString(),
      })
      .eq("id", applicationId)
      .select();

    console.log("🔥 REJECT UPDATE DATA:", data);
    console.log("🔥 REJECT UPDATE ERROR:", error);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, rejection: true });
  }

  // --------------------------------------------------------------------------------------
  // ✅ ACCEPT LOGIC (No conversion here—only marking as accepted)
  // --------------------------------------------------------------------------------------
  if (action === "accept") {
    const { data, error } = await supabaseAdmin
      .from("applications")
      .update({
        status: "accepted",
        rejection_reason: null,
        reviewed_by: "SYSTEM",
        reviewed_date: new Date().toISOString(),
      })
      .eq("id", applicationId)
      .select();

    console.log("🔥 ACCEPT UPDATE DATA:", data);
    console.log("🔥 ACCEPT UPDATE ERROR:", error);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, accepted: true });
  }

  // --------------------------------------------------------------------------------------
  // Invalid action fallback
  // --------------------------------------------------------------------------------------
  return NextResponse.json(
    { error: "Invalid action." },
    { status: 400 }
  );
}
