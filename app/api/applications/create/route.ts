import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ApplicationFormData } from "@/types/applications";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ApplicationFormData;
    const supabase = await createClient();

    // 1️⃣ Get active session
    const { data: activeSession, error: sessionError } = await supabase
      .from("sessions")
      .select("id")
      .eq("is_active", true)
      .order("start_date", { ascending: false })
      .limit(1)
      .single();

    if (sessionError || !activeSession) {
      console.error("No active session found:", sessionError);
      return NextResponse.json(
        { error: "No active session configured for applications." },
        { status: 400 }
      );
    }

    const payload = {
      // make sure these match your Supabase columns
      id: crypto.randomUUID(), // if table uses default uuid(), you can remove this
      program_id: body.programId,
      session_id: activeSession.id,

      application_no: crypto.randomUUID(),

      first_name: body.firstName,
      middle_name: body.middleName || null,
      last_name: body.lastName,

      gender: body.gender,
      date_of_birth: body.dateOfBirth,

      email: body.email,
      phone: body.phone,
      nin: body.nin,
      special_needs: body.specialNeeds || null,

      state_of_origin: body.stateOfOrigin,
      lga_of_origin: body.lgaOfOrigin,
      religion: body.religion,
      address: body.address,

      class_applied_for: body.classAppliedFor,
      previous_school: body.previousSchool || null,
      previous_qualification: body.previousQualification || null,

      guardian_first_name: body.guardianFirstName,
      guardian_middle_name: body.guardianMiddleName || null,
      guardian_last_name: body.guardianLastName,
      guardian_gender: body.guardianGender,
      guardian_status: body.guardianStatus,
      guardian_phone: body.guardianPhone,

      passport_image_id: body.passportImageId,
      supporting_documents: body.supportingDocuments || [],
      attestation_date: body.attestationDate || null,

      application_type: body.admissionType, // "fresh" | "direct_entry"
      status: "pending", // 🔹 new apps start as pending
    };

    const { data, error } = await supabase
      .from("applications")
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, application: data });
  } catch (err: any) {
    console.error("/api/applications/create error:", err);
    return NextResponse.json(
      { error: err.message || "Invalid request" },
      { status: 400 }
    );
  }
}
