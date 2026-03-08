import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type AdminDashboardData = {
  activeSession: { id: string; name: string | null } | null;

  stats: {
    students: number;
    staff: number;
    academicStaff: number;
    nonAcademicStaff: number;
    applications: number;
    applicationsPending: number;
    receipts: number;
    receiptsPending: number;
  };

  money: {
    approvedAllTime: number;
    approvedActiveSession: number;
  };

  bySession: Array<{
    session_id: string;
    session_name: string | null;
    is_active: boolean;
    receipts_total: number;
    receipts_pending: number;
    receipts_approved: number;
    approved_amount: number;
  }>;
};

type ReceiptStatus = "pending" | "approved" | "rejected";

type SessionRow = {
  id: string;
  name: string | null;
  is_active: boolean | null;
};

type ReceiptRow = {
  status: ReceiptStatus | string;
  approved_amount: number | string | null;
  amount_submitted: number | string | null;
  student_fee_accounts: {
    student_registrations: {
      session_id: string | null;
    } | null;
  } | null;
};

const toNumber = (v: number | string | null | undefined): number => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

async function countExact(table: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from(table)
    .select("id", { head: true, count: "exact" });

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const activeSessionPromise = supabaseAdmin
    .from("sessions")
    .select("id,name")
    .eq("is_active", true)
    .maybeSingle();

  const studentsPromise = countExact("students");
  const applicationsPromise = countExact("applications");
  const receiptsPromise = countExact("payment_receipts");

  const applicationsPendingPromise = (async () => {
    const { count, error } = await supabaseAdmin
      .from("applications")
      .select("id", { head: true, count: "exact" })
      .eq("status", "pending");
    if (error) return 0;
    return count ?? 0;
  })();

  const receiptsPendingPromise = (async () => {
    const { count, error } = await supabaseAdmin
      .from("payment_receipts")
      .select("id", { head: true, count: "exact" })
      .eq("status", "pending");
    if (error) throw new Error(error.message);
    return count ?? 0;
  })();

  const academicStaffPromise = (async () => {
    const { count, error } = await supabaseAdmin
      .from("profiles")
      .select("id", { head: true, count: "exact" })
      .eq("main_role", "academic_staff");
    if (error) throw new Error(error.message);
    return count ?? 0;
  })();

  const nonAcademicStaffPromise = (async () => {
    const { count, error } = await supabaseAdmin
      .from("profiles")
      .select("id", { head: true, count: "exact" })
      .eq("main_role", "non_academic_staff");
    if (error) throw new Error(error.message);
    return count ?? 0;
  })();

  const sessionsPromise = supabaseAdmin
    .from("sessions")
    .select("id,name,is_active")
    .returns<SessionRow[]>();

  const receiptsRowsPromise = supabaseAdmin
    .from("payment_receipts")
    .select(`
      status,
      approved_amount,
      amount_submitted,
      student_fee_accounts(
        student_registrations(
          session_id
        )
      )
    `)
    .returns<ReceiptRow[]>();

  const [
    { data: activeSession, error: aErr },
    students,
    applications,
    receipts,
    applicationsPending,
    receiptsPending,
    academicStaff,
    nonAcademicStaff,
    { data: sessions, error: sErr },
    { data: receiptRows, error: rErr },
  ] = await Promise.all([
    activeSessionPromise,
    studentsPromise,
    applicationsPromise,
    receiptsPromise,
    applicationsPendingPromise,
    receiptsPendingPromise,
    academicStaffPromise,
    nonAcademicStaffPromise,
    sessionsPromise,
    receiptsRowsPromise,
  ]);

  if (aErr) throw new Error(aErr.message);
  if (sErr) throw new Error(sErr.message);
  if (rErr) throw new Error(rErr.message);

  const staff = academicStaff + nonAcademicStaff;

  const activeId = activeSession?.id ?? null;

  let approvedAllTime = 0;
  let approvedActiveSession = 0;

  for (const r of receiptRows ?? []) {
    if (r.status !== "approved") continue;

    const value = toNumber(r.approved_amount ?? r.amount_submitted);
    approvedAllTime += value;

    const sid =
      r.student_fee_accounts?.student_registrations?.session_id ?? null;

    if (activeId && sid === activeId) {
      approvedActiveSession += value;
    }
  }

  const map = new Map<string, AdminDashboardData["bySession"][number]>();

  for (const s of sessions ?? []) {
    map.set(s.id, {
      session_id: s.id,
      session_name: s.name ?? null,
      is_active: Boolean(s.is_active),
      receipts_total: 0,
      receipts_pending: 0,
      receipts_approved: 0,
      approved_amount: 0,
    });
  }

  for (const r of receiptRows ?? []) {
    const sid =
      r.student_fee_accounts?.student_registrations?.session_id ?? null;

    if (!sid) continue;

    const bucket = map.get(sid);
    if (!bucket) continue;

    bucket.receipts_total += 1;

    if (r.status === "pending") bucket.receipts_pending += 1;

    if (r.status === "approved") {
      bucket.receipts_approved += 1;
      bucket.approved_amount += toNumber(
        r.approved_amount ?? r.amount_submitted
      );
    }
  }

  const bySession = Array.from(map.values()).sort((x, y) => {
    if (x.is_active !== y.is_active) return x.is_active ? -1 : 1;
    return (y.session_name ?? "").localeCompare(x.session_name ?? "");
  });

  return {
    activeSession: activeSession
      ? { id: activeSession.id, name: activeSession.name ?? null }
      : null,
    stats: {
      students,
      staff,
      academicStaff,
      nonAcademicStaff,
      applications,
      applicationsPending,
      receipts,
      receiptsPending,
    },
    money: {
      approvedAllTime,
      approvedActiveSession,
    },
    bySession,
  };
}