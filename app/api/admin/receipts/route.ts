import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdminOrBursary } from "@/lib/auth/guards";

export const runtime = "nodejs";

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status });

const FEE_TYPES = [
  "school_fees",
  "acceptance_fee",
  "registration_fee",
  "departmental_fee",
  "examination_fee",
  "accommodation_fee",
  "id_card_fee",
  "other",
] as const;

const SEMESTERS = ["first", "second"] as const;

/* ============================
   SCHEMAS
============================ */
const GetQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(["all", "pending", "approved", "rejected"]).default("all"),
  semester: z.enum(["all", ...SEMESTERS]).default("all"),
  session: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const CreateSchema = z.object({
  student_id: z.string().uuid(),
  session_id: z.string().uuid().optional(),
  semester: z.enum(SEMESTERS),
  payment_type: z.enum(FEE_TYPES),
  amount_expected: z.coerce.number().positive().optional(),
  amount_paid: z.coerce.number().positive(),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  transaction_reference: z.string().trim().min(3).max(80).optional(),
  receipt: z.instanceof(File),
});

/* ============================
   GET — LIST RECEIPTS
============================ */
export async function GET(req: NextRequest) {
  const guard = await requireAdminOrBursary();
  if (guard.error) return guard.error;

  const sp = req.nextUrl.searchParams;

  const parsed = GetQuerySchema.safeParse({
    search: sp.get("search") || undefined,
    status: sp.get("status") || "all",
    semester: sp.get("semester") || "all",
    session: sp.get("session") || undefined,
    page: sp.get("page") ?? 1,
    limit: sp.get("limit") ?? 20,
  });

  if (!parsed.success) {
    return json({ error: "Invalid query params", issues: parsed.error.flatten() }, 422);
  }

  const { search, status, semester, session, page, limit } = parsed.data;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabaseAdmin
    .from("payment_receipts")
    .select(
      `
      *,
      students:student_id (
        matric_no,
        profiles:profile_id ( first_name, last_name, email )
      ),
      sessions:session_id ( name )
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (search) {
    query = query.or(
      `payment_type.ilike.%${search}%,transaction_reference.ilike.%${search}%`
    );
  }

  if (status !== "all") query = query.eq("status", status);
  if (semester !== "all") query = query.eq("semester", semester);
  if (session && session !== "all") query = query.eq("session_id", session);

  const { data, error, count } = await query;
  if (error) return json({ error: error.message }, 400);

  return json({
    receipts: data ?? [],
    pagination: {
      total: count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    },
  });
}

/* ============================
   POST — CREATE RECEIPT
============================ */
export async function POST(req: NextRequest) {
  const guard = await requireAdminOrBursary();
  if (guard.error) return guard.error;

  const uploadedBy = guard.userId;

  try {
    const fd = await req.formData();

    const parsed = CreateSchema.safeParse({
      student_id: fd.get("student_id"),
      session_id: fd.get("session_id") ?? undefined,
      semester: fd.get("semester"),
      payment_type: fd.get("payment_type"),
      amount_expected: fd.get("amount_expected") ?? undefined,
      amount_paid: fd.get("amount_paid"),
      payment_date: fd.get("payment_date"),
      transaction_reference: fd.get("transaction_reference") ?? undefined,
      receipt: fd.get("receipt"),
    });

    if (!parsed.success) {
      return json({ error: "Validation failed", issues: parsed.error.flatten() }, 422);
    }

    const {
      student_id,
      session_id,
      semester,
      payment_type,
      amount_expected,
      amount_paid,
      payment_date,
      transaction_reference,
      receipt,
    } = parsed.data;

    if (receipt.size > 5 * 1024 * 1024) {
      return json({ error: "Receipt must be ≤ 5MB" }, 413);
    }

    if (
      !receipt.type.startsWith("image/") &&
      receipt.type !== "application/pdf"
    ) {
      return json({ error: "Receipt must be image or PDF" }, 415);
    }

    const ext = receipt.name.split(".").pop() ?? "bin";
    const path = `receipts/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("receipts")
      .upload(path, receipt, { contentType: receipt.type });

    if (uploadError) {
      return json({ error: "Failed to upload receipt" }, 500);
    }

    const { data: pub } = supabaseAdmin.storage
      .from("receipts")
      .getPublicUrl(path);

    const { data, error } = await supabaseAdmin
      .from("payment_receipts")
      .insert({
        student_id,
        session_id: session_id ?? null,
        semester,
        payment_type,
        amount_expected: amount_expected ?? null,
        amount_paid,
        payment_date,
        transaction_reference: transaction_reference ?? null,
        receipt_url: pub.publicUrl,
        uploaded_by: uploadedBy,
        status: "pending",
      })
      .select()
      .single();

    if (error) return json({ error: error.message }, 400);

    return json({ receipt: data }, 201);
  } catch {
    return json({ error: "Unexpected server error" }, 500);
  }
}
