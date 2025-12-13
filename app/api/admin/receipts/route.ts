import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs"; // service-role safe (supabaseAdmin)

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

type FeeType = (typeof FEE_TYPES)[number];

const STATUSES = ["pending", "approved", "rejected"] as const;
type ReceiptStatus = (typeof STATUSES)[number];

const SEMESTERS = ["first", "second"] as const;
type Semester = (typeof SEMESTERS)[number];

type ReceiptsQuery = {
  search: string;
  status: "all" | ReceiptStatus;
  semester: "all" | Semester;
  session: "all" | string; // uuid
  page: number;
  limit: number;
};

function isOneOf<const T extends readonly string[]>(
  value: string,
  allowed: T
): value is T[number] {
  return (allowed as readonly string[]).includes(value);
}

function parsePositiveInt(value: string | null, fallback: number, max?: number): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return fallback;
  const int = Math.floor(n);
  if (max && int > max) return max;
  return int;
}

function sanitizeSearch(input: string): string {
  // PostgREST filter strings aren't parameterized; keep this conservative
  return input.trim().slice(0, 80).replace(/[(),%]/g, "").replace(/\s+/g, " ");
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

function badRequest(message: string, extra?: Record<string, unknown>) {
  return json({ ok: false, error: message, ...extra }, 400);
}

function unprocessable(message: string, extra?: Record<string, unknown>) {
  return json({ ok: false, error: message, ...extra }, 422);
}

function getString(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  return typeof v === "string" ? v : null;
}

function getFile(formData: FormData, key: string): File | null {
  const v = formData.get(key);
  return v instanceof File ? v : null;
}

function parseQuery(req: NextRequest): ReceiptsQuery {
  const { searchParams } = new URL(req.url);

  const search = sanitizeSearch(searchParams.get("search") ?? "");
  const statusRaw = (searchParams.get("status") ?? "all").trim();
  const semesterRaw = (searchParams.get("semester") ?? "all").trim();
  const sessionRaw = (searchParams.get("session") ?? "all").trim();

  const page = parsePositiveInt(searchParams.get("page"), 1);
  const limit = parsePositiveInt(searchParams.get("limit"), 20, 100);

  const status: ReceiptsQuery["status"] =
    statusRaw === "all"
      ? "all"
      : isOneOf(statusRaw, STATUSES)
        ? statusRaw
        : "all"; // alternatively: throw 422 if invalid

  const semester: ReceiptsQuery["semester"] =
    semesterRaw === "all"
      ? "all"
      : isOneOf(semesterRaw, SEMESTERS)
        ? semesterRaw
        : "all";

  const session: ReceiptsQuery["session"] = sessionRaw === "all" ? "all" : sessionRaw;

  return { search, status, semester, session, page, limit };
}

// ================================
// GET — LIST RECEIPTS (filters + pagination)
// ================================
export async function GET(req: NextRequest) {
  const q = parseQuery(req);

  // If you prefer strict validation instead of falling back to "all":
  // if (q.status !== "all" && !isOneOf(q.status, STATUSES)) return unprocessable("Invalid status");
  // if (q.semester !== "all" && !isOneOf(q.semester, SEMESTERS)) return unprocessable("Invalid semester");

  const from = (q.page - 1) * q.limit;
  const to = from + q.limit - 1;

  let query = supabaseAdmin
    .from("payment_receipts")
    .select(
      `
      *,
      students:student_id (
        id,
        matric_no,
        profile_id,
        profiles:profile_id (
          first_name,
          last_name,
          email
        )
      ),
      sessions:session_id (*)
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  // 🔍 SEARCH (only columns that actually exist)
  // NOTE: searching joined profile fields via .or(...) is not reliable the way you wrote it.
  // We keep it to receipt fields here to avoid PostgREST filter errors.
  if (q.search) {
    query = query.or(
      [
        `payment_type.ilike.%${q.search}%`,
        `transaction_reference.ilike.%${q.search}%`,
        `remarks.ilike.%${q.search}%`,
      ].join(",")
    );
  }

  if (q.status !== "all") query = query.eq("status", q.status);
  if (q.semester !== "all") query = query.eq("semester", q.semester);
  if (q.session !== "all") query = query.eq("session_id", q.session);

  const { data, error, count } = await query;

  if (error) {
    console.error("Receipts GET Error:", error);
    return badRequest(error.message, { code: error.code });
  }

  return json({
    ok: true,
    feeTypes: FEE_TYPES, // ✅ send list to frontend
    receipts: data ?? [],
    pagination: {
      total: count ?? 0,
      page: q.page,
      limit: q.limit,
      totalPages: Math.max(1, Math.ceil(((count ?? 0) / q.limit) || 1)),
    },
  });
}

// ================================
// POST — CREATE RECEIPT (admin upload)
// ================================
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const student_id = getString(formData, "student_id")?.trim() ?? "";
    const payment_typeRaw = getString(formData, "payment_type")?.trim() ?? "";
    const amount_paidRaw = getString(formData, "amount_paid")?.trim() ?? "";
    const payment_date = getString(formData, "payment_date")?.trim() ?? "";
    const receipt = getFile(formData, "receipt");

    // Optional fields:
    const session_id = getString(formData, "session_id")?.trim() ?? null;
    const semesterRaw = getString(formData, "semester")?.trim() ?? null;

    if (!student_id || !payment_typeRaw || !amount_paidRaw || !payment_date || !receipt) {
      return unprocessable("Missing required fields.");
    }

    if (!isOneOf(payment_typeRaw, FEE_TYPES)) {
      return unprocessable("Invalid payment_type.", { allowed: FEE_TYPES });
    }
    const payment_type: FeeType = payment_typeRaw;

    const amount_paid = Number(amount_paidRaw);
    if (!Number.isFinite(amount_paid) || amount_paid <= 0) {
      return unprocessable("amount_paid must be a positive number.");
    }

    const semester: Semester | null =
      semesterRaw && isOneOf(semesterRaw, SEMESTERS) ? semesterRaw : null;

    // File hygiene
    if (!receipt.type.startsWith("image/") && receipt.type !== "application/pdf") {
      return json({ ok: false, error: "Receipt must be an image or PDF." }, 415);
    }
    if (receipt.size > 5 * 1024 * 1024) {
      return json({ ok: false, error: "Receipt too large (max 5MB)." }, 413);
    }

    // =========================
    // UPLOAD RECEIPT
    // =========================
    const ext = receipt.name.split(".").pop()?.toLowerCase() || "bin";
    const filePath = `receipts/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("receipts")
      .upload(filePath, receipt, { contentType: receipt.type, upsert: false });

    if (uploadError) {
      console.error("Upload Error:", uploadError);
      return json({ ok: false, error: "Failed to upload receipt." }, 500);
    }

    const { data: pub } = supabaseAdmin.storage.from("receipts").getPublicUrl(filePath);
    const receipt_url = pub.publicUrl;

    // =========================
    // INSERT DB RECORD
    // =========================
    const { data, error } = await supabaseAdmin
      .from("payment_receipts")
      .insert({
        student_id,
        session_id,
        semester,
        payment_type,
        amount_paid,
        payment_date, // date column: ISO string "YYYY-MM-DD" is fine
        receipt_url,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Insert Error:", error);
      return badRequest(error.message, { code: error.code, details: error.details });
    }

    return json({ ok: true, receipt: data }, 201);
  } catch (err) {
    console.error("Receipt Create Crash:", err);
    return json({ ok: false, error: "Unexpected server error." }, 500);
  }
}
