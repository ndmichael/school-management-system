import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Action = "accept" | "reject";

interface ReviewBody {
  action: Action;
  rejectionReason?: string;
}

export async function PATCH(req: Request) {
  try {
    const body = (await req.json()) as ReviewBody;
    const { action, rejectionReason } = body;

    // 🔹 Basic validation
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

    // 🔹 Extract id from URL path: /api/applications/:id/review
    const url = new URL(req.url);
    const segments = url.pathname.split("/").filter(Boolean);
    const applicationsIndex = segments.indexOf("applications");
    const id =
      applicationsIndex >= 0 && segments.length > applicationsIndex + 1
        ? segments[applicationsIndex + 1]
        : null;

    if (!id) {
      return NextResponse.json(
        { error: "Missing or invalid application id in URL." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const newStatus: "accepted" | "rejected" =
      action === "accept" ? "accepted" : "rejected";

    // 1️⃣ Update directly; let Supabase handle not-found etc.
    const { data, error } = await supabase
      .from("applications")
      .update({
        status: newStatus,
        reviewed_by: "SYSTEM", // TODO: replace with real user
        reviewed_date: new Date().toISOString(),
        rejection_reason: action === "reject" ? rejectionReason ?? null : null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Application update error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to update application." },
        { status: 400 }
      );
    }

    // (Optional) mock email log
    try {
      console.log("📧 Application decision:", {
        to: data.email,
        fullName: `${data.first_name} ${
          data.middle_name ? data.middle_name + " " : ""
        }${data.last_name}`,
        decision: newStatus,
      });
    } catch (e) {
      console.error("Email log error:", e);
    }

    // ✅ Frontend expects { application }
    return NextResponse.json({ success: true, application: data });
  } catch (err: unknown) {
    console.error("/api/applications/[id]/review error:", err);
    const message =
      err instanceof Error ? err.message : "Invalid request or server error.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
