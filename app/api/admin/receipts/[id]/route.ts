import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdminOrBursary } from "@/lib/auth/guards";

export const runtime = "nodejs";

const ParamsSchema = z.object({ id: z.string().uuid() });

const PatchSchema = z.object({
  action: z.enum(["approve", "reject"]),
  remarks: z.string().trim().max(1000).optional(),
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
  status: "pending" | "approved" | "rejected" | "reversed";
  receipt_file: { bucket: string; path: string } | null;
  created_at: string;
  verified_at: string | null;
  rejected_at: string | null;
  review_remarks: string | null;
  reversed_by: string | null;
  reversed_at: string | null;
  reversal_reason: string | null;
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
      review_remarks,
      reversed_by,
      reversed_at,
      reversal_reason,
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
      review_remarks: data.review_remarks,
      reversed_by: data.reversed_by,
      reversed_at: data.reversed_at,
      reversal_reason: data.reversal_reason,
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
  // 1. Only admin or bursary staff can review payments.
  const guard = await requireAdminOrBursary();

  if (guard.error) {
    return guard.error;
  }

  // 2. Validate the receipt ID from the URL.
  const rawParams = await ctx.params;
  const parsedParams = ParamsSchema.safeParse(rawParams);

  if (!parsedParams.success) {
    return json(
      {
        ok: false,
        error: "Invalid receipt id.",
      },
      422
    );
  }

  // 3. Safely read the request body.
  let rawBody: unknown;

  try {
    rawBody = await req.json();
  } catch {
    return json(
      {
        ok: false,
        error: "Invalid JSON body.",
      },
      400
    );
  }

  // 4. Validate the requested action.
  const parsedBody = PatchSchema.safeParse(rawBody);

  if (!parsedBody.success) {
    return json(
      {
        ok: false,
        error: "Validation failed.",
        issues: parsedBody.error.flatten(),
      },
      422
    );
  }

  const { id } = parsedParams.data;
  const { action, remarks } = parsedBody.data;

  // Rejecting a receipt requires an explanation.
  if (action === "reject" && !remarks?.trim()) {
    return json(
      {
        ok: false,
        error: "Remarks are required when rejecting a receipt.",
      },
      422
    );
  }

  // 5. Let PostgreSQL perform the complete review transaction.
  const { data, error } = await supabaseAdmin.rpc(
    "review_payment_receipt",
    {
      p_receipt_id: id,
      p_action: action,
      p_reviewer_id: guard.userId,
      p_review_remarks: remarks?.trim() || null,
    }
  );

  if (error) {
    // Receipt or fee account does not exist.
    if (error.code === "P0002") {
      return json(
        {
          ok: false,
          error: error.message,
        },
        404
      );
    }

    // Business-rule failure:
    // already reviewed, overpayment, invalid action, etc.
    if (error.code === "22023") {
      return json(
        {
          ok: false,
          error: error.message,
        },
        422
      );
    }

    // Unexpected database problem.
    console.error("Receipt review failed:", error);

    return json(
      {
        ok: false,
        error: "Unable to review payment receipt.",
      },
      500
    );
  }

  return json({
    ok: true,
    result: data,
  });
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
  const parsed = ParamsSchema.safeParse(rawParams);

  if (!parsed.success) {
    return json(
      { ok: false, error: "Invalid receipt id." },
      422
    );
  }

  const { id } = parsed.data;

  // First load the receipt so we know its status
  // and storage file before deleting it.
  const { data: receipt, error: receiptError } = await supabaseAdmin
    .from("payment_receipts")
    .select("id, status, receipt_file")
    .eq("id", id)
    .maybeSingle<{
      id: string;
      status: string;
      receipt_file: { bucket: string; path: string } | null;
    }>();

  if (receiptError) {
    return json({ ok: false, error: receiptError.message }, 400);
  }

  if (!receipt) {
    return json({ ok: false, error: "Receipt not found." }, 404);
  }

  // Financial history must not be erased.
  if (receipt.status === "approved" || receipt.status === "reversed") {
    return json(
      {
        ok: false,
        error:
          "Approved or reversed receipts cannot be deleted. Reverse an approved payment instead.",
      },
      409
    );
  }

  // Delete only if it is STILL pending or rejected.
  // This also protects against another request approving it
  // between our first SELECT and this DELETE.
  const { data: deleted, error: deleteError } = await supabaseAdmin
    .from("payment_receipts")
    .delete()
    .eq("id", id)
    .in("status", ["pending", "rejected"])
    .select("id")
    .maybeSingle<{ id: string }>();

  if (deleteError) {
    return json({ ok: false, error: deleteError.message }, 400);
  }

  if (!deleted) {
    return json(
      {
        ok: false,
        error: "Receipt can no longer be deleted.",
      },
      409
    );
  }

  // Database deletion succeeded.
  // Now clean up the stored file.
  if (receipt.receipt_file?.bucket && receipt.receipt_file?.path) {
    const { error: storageError } = await supabaseAdmin.storage
      .from(receipt.receipt_file.bucket)
      .remove([receipt.receipt_file.path]);

    // Do not restore the database row if storage cleanup fails.
    // The important financial record is already correctly removed.
    if (storageError) {
      console.error(
        "Receipt file cleanup failed:",
        storageError.message
      );
    }
  }

  return json({
    ok: true,
    success: true,
  });
}