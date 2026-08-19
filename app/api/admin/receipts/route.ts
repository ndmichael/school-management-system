import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdminOrBursary } from "@/lib/auth/guards";

export const runtime = "nodejs";

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status });

const GetQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(["all", "pending", "approved", "rejected", "reversed"]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const CreateSchema = z.object({
  student_fee_account_id: z.string().uuid(),
  amount_submitted: z.coerce.number().positive(),
  transaction_reference: z.string().trim().min(3).max(120).optional(),
  remarks: z.string().trim().max(1000).optional(),
  receipt: z.instanceof(File),
});

type ReceiptListRow = {
  id: string;
  student_fee_account_id: string;
  amount_submitted: number | string;
  approved_amount: number | string | null;
  transaction_reference: string | null;
  remarks: string | null;
  status: "pending" | "approved" | "rejected" | "reversed";
  receipt_file: { bucket: string; path: string } | null;
  created_at: string;
  updated_at: string;
  uploaded_by: string | null;
  verified_by: string | null;
  rejected_by: string | null;
  verified_at: string | null;
  rejected_at: string | null;
  review_remarks: string | null;
  reversed_by: string | null;
  reversed_at: string | null;
  reversal_reason: string | null;
  student_fee_accounts: {
    id: string;
    student_registration_id: string;
    annual_fee: number | string;
    total_paid_approved: number | string;
    balance_due: number | string | null;
    payment_status: string;
    student_registrations: {
      id: string;
      session_id: string;
      level: string | null;
      students: {
        id: string;
        matric_no: string | null;
        profiles: {
          first_name: string | null;
          last_name: string | null;
          email: string | null;
        } | null;
      } | null;
    } | null;
  } | null;
};

async function makeReceiptUrl(file: { bucket: string; path: string } | null) {
  if (!file?.bucket || !file?.path) return null;

  const { data, error } = await supabaseAdmin.storage
    .from(file.bucket)
    .createSignedUrl(file.path, 60 * 60);

  if (error || !data?.signedUrl) {
    return null;
  }

  return data.signedUrl;
}

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
    page: sp.get("page") ?? 1,
    limit: sp.get("limit") ?? 20,
  });

  if (!parsed.success) {
    return json(
      { error: "Invalid query params", issues: parsed.error.flatten() },
      422
    );
  }

  const { search, status, page, limit } = parsed.data;

  const { data, error } = await supabaseAdmin
    .from("payment_receipts")
    .select(
      `
      id,
      student_fee_account_id,
      amount_submitted,
      approved_amount,
      transaction_reference,
      remarks,
      status,
      receipt_file,
      created_at,
      updated_at,
      uploaded_by,
      verified_by,
      rejected_by,
      verified_at,
      rejected_at,
      review_remarks,
      reversed_by,
      reversed_at,
      reversal_reason,
      student_fee_accounts!inner (
        id,
        student_registration_id,
        annual_fee,
        total_paid_approved,
        balance_due,
        payment_status,
        student_registrations!inner (
          id,
          session_id,
          level,
          students!inner (
            id,
            matric_no,
            profiles!students_profile_id_fkey (
              first_name,
              last_name,
              email
            )
          )
        )
      )
    `
    )
    .order("created_at", { ascending: false })
    .returns<ReceiptListRow[]>();

  if (error) return json({ error: error.message }, 400);

  let rows = data ?? [];

  if (status !== "all") {
    rows = rows.filter((r) => r.status === status);
  }

  if (search) {
    const q = search.trim().toLowerCase();

    rows = rows.filter((r) => {
      const profile = r.student_fee_accounts?.student_registrations?.students?.profiles;
      const student = r.student_fee_accounts?.student_registrations?.students;

      const haystack = [
        r.transaction_reference ?? "",
        r.remarks ?? "",
        student?.matric_no ?? "",
        profile?.first_name ?? "",
        profile?.last_name ?? "",
        profile?.email ?? "",
        String(r.amount_submitted ?? ""),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }

  const total = rows.length;
  const from = (page - 1) * limit;
  const to = from + limit;
  const paged = rows.slice(from, to);

  const receipts = await Promise.all(
    paged.map(async (r) => {
      const profile = r.student_fee_accounts?.student_registrations?.students?.profiles;
      const student = r.student_fee_accounts?.student_registrations?.students;

      return {
        id: r.id,
        amount_submitted: Number(r.amount_submitted ?? 0),
        approved_amount:
          r.approved_amount == null ? null : Number(r.approved_amount),
        transaction_reference: r.transaction_reference,
        remarks: r.remarks,
        status: r.status,
        created_at: r.created_at,
        updated_at: r.updated_at,
        review_remarks: r.review_remarks,
        reversed_by: r.reversed_by,
        reversed_at: r.reversed_at,
        reversal_reason: r.reversal_reason,
        verified_at: r.verified_at,
        rejected_at: r.rejected_at,
        receipt_file: r.receipt_file,
        receipt_url: await makeReceiptUrl(r.receipt_file),
        student_fee_account_id: r.student_fee_account_id,
        annual_fee: Number(r.student_fee_accounts?.annual_fee ?? 0),
        total_paid_approved: Number(
          r.student_fee_accounts?.total_paid_approved ?? 0
        ),
        balance_due:
          r.student_fee_accounts?.balance_due == null
            ? null
            : Number(r.student_fee_accounts.balance_due),
        payment_status: r.student_fee_accounts?.payment_status ?? null,
        students: {
          matric_no: student?.matric_no ?? null,
          profiles: {
            first_name: profile?.first_name ?? null,
            last_name: profile?.last_name ?? null,
            email: profile?.email ?? null,
          },
        },
      };
    })
  );

  return json({
    receipts,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
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
      student_fee_account_id: fd.get("student_fee_account_id"),
      amount_submitted: fd.get("amount_submitted"),
      transaction_reference: fd.get("transaction_reference") ?? undefined,
      remarks: fd.get("remarks") ?? undefined,
      receipt: fd.get("receipt"),
    });

    if (!parsed.success) {
      return json(
        { error: "Validation failed", issues: parsed.error.flatten() },
        422
      );
    }

    const {
      student_fee_account_id,
      amount_submitted,
      transaction_reference,
      remarks,
      receipt,
    } = parsed.data;

    const { data: feeAccount, error: feeErr } = await supabaseAdmin
      .from("student_fee_accounts")
      .select("id")
      .eq("id", student_fee_account_id)
      .maybeSingle<{ id: string }>();

    if (feeErr) return json({ error: feeErr.message }, 400);
    if (!feeAccount) {
      return json({ error: "Student fee account not found" }, 404);
    }

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
    const path = `receipts/${student_fee_account_id}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("receipts")
      .upload(path, receipt, { contentType: receipt.type });

    if (uploadError) {
      return json({ error: uploadError.message }, 500);
    }

    const receipt_file = {
      bucket: "receipts",
      path,
    };

    const { data, error } = await supabaseAdmin
      .from("payment_receipts")
      .insert({
        student_fee_account_id,
        amount_submitted,
        approved_amount: null,
        transaction_reference: transaction_reference ?? null,
        remarks: remarks ?? null,
        status: "pending",
        receipt_file,
        uploaded_by: uploadedBy,
        verified_by: null,
        rejected_by: null,
        verified_at: null,
        rejected_at: null,
      })
      .select()
      .single();

    if (error) return json({ error: error.message }, 400);

    const receipt_url = await makeReceiptUrl(receipt_file);

    return json(
      {
        receipt: {
          ...data,
          receipt_url,
        },
      },
      201
    );
  } catch (err) {
    return json(
      {
        error:
          err instanceof Error ? err.message : "Unexpected server error",
      },
      500
    );
  }
}