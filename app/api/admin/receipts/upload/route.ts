import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const student_id = form.get("student_id") as string;
    const session_id = form.get("session_id") as string;
    const semester = form.get("semester") as string;
    const payment_type = form.get("payment_type") as string;
    const amount_paid = Number(form.get("amount_paid") || 0);
    const payment_date = form.get("payment_date") as string;

    const file = form.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "Receipt file is required" },
        { status: 400 }
      );
    }

    // Upload file
    const fileName = `receipts/${student_id}/${randomUUID()}-${file.name}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadErr } = await supabaseAdmin.storage
      .from("receipts")
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadErr)
      return NextResponse.json({ error: uploadErr.message }, { status: 400 });

    const fileUrl = supabaseAdmin.storage
      .from("receipts")
      .getPublicUrl(fileName).data.publicUrl;

    // Insert record
    const { data, error } = await supabaseAdmin
      .from("payment_receipts")
      .insert({
        student_id,
        session_id,
        semester,
        payment_type,
        amount_paid,
        payment_date,
        receipt_url: fileUrl,
        uploaded_by: student_id, // student uploaded
      })
      .select()
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ success: true, receipt: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
