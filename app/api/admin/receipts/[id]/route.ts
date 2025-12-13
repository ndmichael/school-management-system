import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const ParamsSchema = z.object({ id: z.string().uuid() });

const PatchSchema = z.object({
  action: z.enum(["approve", "reject", "accept"]).transform((v) => (v === "accept" ? "approve" : v)),
  admin_id: z.string().uuid(),
  remarks: z.string().trim().optional(),
  approved_amount: z.coerce.number().positive().optional(),
});

type ReceiptUpdate = Partial<{
  status: "pending" | "approved" | "rejected";
  verified_by: string;
  verified_at: string;
  rejected_by: string;
  rejected_at: string;
  remarks: string | null;
  approved_amount: number;
  updated_at: string;
}>;

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });

// ---------------------
// GET ONE RECEIPT ✅ (fixes your 405)
// ---------------------
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const rawParams = await ctx.params;
  const p = ParamsSchema.safeParse(rawParams);
  if (!p.success) return json({ ok: false, error: "Invalid receipt id." }, 422);

  const { id } = p.data;

  const { data, error } = await supabaseAdmin
    .from("payment_receipts")
    .select(
      `
      *,
      students:student_id (
        id,
        matric_no,
        profiles:profile_id (
          first_name,
          last_name,
          email
        )
      ),
      sessions:session_id(name)
    `
    )
    .eq("id", id)
    .single();

  if (error) return json({ ok: false, error: error.message, code: error.code }, 400);
  return json({ ok: true, receipt: data });
}

// ---------------------
// PATCH — APPROVE OR REJECT
// ---------------------
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
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
  if (!b.success) return json({ ok: false, error: "Validation failed.", issues: b.error.flatten() }, 422);

  const { id } = p.data;
  const { action, admin_id, remarks, approved_amount } = b.data;

  if (action === "reject" && (!remarks || remarks.length === 0)) {
    return json({ ok: false, error: "Remarks required when rejecting." }, 422);
  }

  const now = new Date().toISOString();
  const update: ReceiptUpdate = { updated_at: now };

  if (action === "approve") {
    update.status = "approved";
    update.verified_by = admin_id;
    update.verified_at = now;
    if (approved_amount !== undefined) update.approved_amount = approved_amount;
  } else {
    update.status = "rejected";
    update.rejected_by = admin_id;
    update.rejected_at = now;
    update.remarks = remarks ?? null;
  }

  const { data, error } = await supabaseAdmin
    .from("payment_receipts")
    .update(update)
    .eq("id", id)
    .select("id,status,verified_by,verified_at,rejected_by,rejected_at,remarks,approved_amount,updated_at")
    .single();

  if (error) {
    return json({ ok: false, error: error.message, code: error.code, details: error.details }, 400);
  }

  return json({ ok: true, receipt: data });
}

// ---------------------
// DELETE RECEIPT
// ---------------------
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const rawParams = await ctx.params;
  const p = ParamsSchema.safeParse(rawParams);
  if (!p.success) return json({ ok: false, error: "Invalid receipt id." }, 422);

  const { id } = p.data;

  const { error } = await supabaseAdmin.from("payment_receipts").delete().eq("id", id);
  if (error) return json({ ok: false, error: error.message, code: error.code }, 400);

  return json({ ok: true });
}
