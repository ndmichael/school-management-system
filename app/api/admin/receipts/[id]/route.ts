import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdminOrBursary } from "@/lib/auth/guards";

export const runtime = "nodejs";

const ParamsSchema = z.object({ id: z.string().uuid() });

const PatchSchema = z.object({
  action: z.enum(["approve", "reject"]),
  remarks: z.string().trim().optional(),
  approved_amount: z.coerce.number().positive().optional(),
});

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status });

type ReceiptGetRow = {
  id: string;
  student_fee_account_id: string;
  amount_submitted: number | string;
  approved_amount: number | string | null;
  transaction_reference: string | null;
  remarks: string | null;
  status: "pending" | "approved" | "rejected" | string;
  receipt_file: { bucket: string; path: string } | null;
  created_at: string;
  verified_at: string | null;
  rejected_at: string | null;
  student_fee_accounts: {
    id: string;
    annual_fee: number | string;
    total_paid_approved: number | string;
    balance_due: number | string | null;
    payment_status: string | null;
    student_registrations: {
      students: {
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

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

// ---------------------
// GET ONE RECEIPT
// ---------------------
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdminOrBursary();
  if (guard.error) return guard.error;

  const rawParams = await ctx.params;
  const p = ParamsSchema.safeParse(rawParams);
  if (!p.success) return json({ ok: false, error: "Invalid receipt id." }, 422);

  const { id } = p.data;

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
      verified_at,
      rejected_at,
      student_fee_accounts!inner (
        id,
        annual_fee,
        total_paid_approved,
        balance_due,
        payment_status,
        student_registrations!inner (
          students!inner (
            matric_no,
            profiles!inner (
              first_name,
              last_name,
              email
            )
          )
        )
      )
    `
    )
    .eq("id", id)
    .single<ReceiptGetRow>();

  if (error || !data) {
    return json({ ok: false, error: error?.message ?? "Receipt not found" }, 400);
  }

  const profile = data.student_fee_accounts?.student_registrations?.students?.profiles;
  const student = data.student_fee_accounts?.student_registrations?.students;

  return json({
    ok: true,
    receipt: {
      id: data.id,
      student_fee_account_id: data.student_fee_account_id,
      amount_submitted: Number(data.amount_submitted ?? 0),
      approved_amount:
        data.approved_amount == null ? null : Number(data.approved_amount),
      transaction_reference: data.transaction_reference,
      remarks: data.remarks,
      status: data.status,
      created_at: data.created_at,
      verified_at: data.verified_at,
      rejected_at: data.rejected_at,
      receipt_url: await makeReceiptUrl(data.receipt_file),
      annual_fee: Number(data.student_fee_accounts?.annual_fee ?? 0),
      total_paid_approved: Number(
        data.student_fee_accounts?.total_paid_approved ?? 0
      ),
      balance_due:
        data.student_fee_accounts?.balance_due == null
          ? null
          : Number(data.student_fee_accounts.balance_due),
      payment_status: data.student_fee_accounts?.payment_status ?? null,
      students: {
        matric_no: student?.matric_no ?? null,
        profiles: {
          first_name: profile?.first_name ?? null,
          last_name: profile?.last_name ?? null,
          email: profile?.email ?? null,
        },
      },
    },
  });
}

// ---------------------
// PATCH — APPROVE OR REJECT
// ---------------------
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdminOrBursary();
  if (guard.error) return guard.error;

  const rawParams = await ctx.params;
  const p = ParamsSchema.safeParse(rawParams);
  if (!p.success) return json({ ok: false, error: "Invalid receipt id." }, 422);

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON body." }, 400);
  }

  const b = PatchSchema.safeParse(rawBody);
  if (!b.success) {
    return json(
      { ok: false, error: "Validation failed.", issues: b.error.flatten() },
      422
    );
  }

  const { id } = p.data;
  const { action, remarks, approved_amount } = b.data;

  if (action === "reject" && (!remarks || !remarks.trim())) {
    return json(
      { ok: false, error: "Remarks required when rejecting." },
      422
    );
  }

  if (action === "approve" && (!approved_amount || approved_amount <= 0)) {
    return json(
      { ok: false, error: "approved_amount is required when approving." },
      422
    );
  }

  const { data: receipt, error: receiptErr } = await supabaseAdmin
    .from("payment_receipts")
    .select("id, student_fee_account_id, amount_submitted, status")
    .eq("id", id)
    .single<{
      id: string;
      student_fee_account_id: string;
      amount_submitted: number;
      status: string;
    }>();

  if (receiptErr || !receipt) {
    return json({ ok: false, error: "Receipt not found." }, 404);
  }

  if (receipt.status !== "pending") {
    return json(
      { ok: false, error: "Only pending receipts can be updated." },
      400
    );
  }

  const now = new Date().toISOString();

  if (action === "approve") {
    const { data: feeAccount, error: feeErr } = await supabaseAdmin
      .from("student_fee_accounts")
      .select("id, annual_fee, total_paid_approved")
      .eq("id", receipt.student_fee_account_id)
      .single<{
        id: string;
        annual_fee: number;
        total_paid_approved: number;
      }>();

    if (feeErr || !feeAccount) {
      return json({ ok: false, error: "Fee account not found." }, 404);
    }

    const newTotalPaid =
      Number(feeAccount.total_paid_approved ?? 0) + Number(approved_amount);
    const annualFee = Number(feeAccount.annual_fee ?? 0);
    const newBalance = Math.max(annualFee - newTotalPaid, 0);
    const payment_status =
      newBalance <= 0 ? "paid" : newTotalPaid > 0 ? "partial" : "unpaid";

    const { error: receiptUpdateErr } = await supabaseAdmin
      .from("payment_receipts")
      .update({
        status: "approved",
        approved_amount: approved_amount,
        verified_by: guard.userId,
        verified_at: now,
        rejected_by: null,
        rejected_at: null,
      })
      .eq("id", id);

    if (receiptUpdateErr) {
      return json(
        { ok: false, error: receiptUpdateErr.message },
        400
      );
    }

    const { error: feeUpdateErr } = await supabaseAdmin
      .from("student_fee_accounts")
      .update({
        total_paid_approved: newTotalPaid,
        balance_due: newBalance,
        payment_status,
      })
      .eq("id", feeAccount.id);

    if (feeUpdateErr) {
      return json(
        { ok: false, error: feeUpdateErr.message },
        400
      );
    }

    return json({ ok: true, success: true });
  }

  const { error: rejectErr } = await supabaseAdmin
    .from("payment_receipts")
    .update({
      status: "rejected",
      approved_amount: null,
      rejected_by: guard.userId,
      rejected_at: now,
      verified_by: null,
      verified_at: null,
      remarks: remarks?.trim() ?? null,
    })
    .eq("id", id);

  if (rejectErr) {
    return json({ ok: false, error: rejectErr.message }, 400);
  }

  return json({ ok: true, success: true });
}

// ---------------------
// DELETE RECEIPT
// ---------------------
export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdminOrBursary();
  if (guard.error) return guard.error;

  const rawParams = await ctx.params;
  const p = ParamsSchema.safeParse(rawParams);
  if (!p.success) return json({ ok: false, error: "Invalid receipt id." }, 422);

  const { id } = p.data;

  const { error } = await supabaseAdmin
    .from("payment_receipts")
    .delete()
    .eq("id", id);

  if (error) return json({ ok: false, error: error.message }, 400);

  return json({ ok: true });
}