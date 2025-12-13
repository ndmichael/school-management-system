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

const toNumber = (v: unknown): number => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  // active session (your sessions table already has is_active)
  const activePromise = supabaseAdmin
    .from("sessions")
    .select("id,name")
    .eq("is_active", true)
    .maybeSingle();

  const kpiPromise = supabaseAdmin.from("v_admin_kpis").select("*").single();
  const sessionPromise = supabaseAdmin.from("v_admin_session_metrics").select("*");

  const [{ data: activeSession, error: aErr }, { data: kpi, error: kErr }, { data: sessions, error: sErr }] =
    await Promise.all([activePromise, kpiPromise, sessionPromise]);

  if (aErr) throw new Error(aErr.message);
  if (kErr) throw new Error(kErr.message);
  if (sErr) throw new Error(sErr.message);

  const academicStaff = toNumber(kpi.academic_staff_total);
  const nonAcademicStaff = toNumber(kpi.non_academic_staff_total);
  const staff = academicStaff + nonAcademicStaff;

  const bySession = (sessions ?? [])
    .map((r) => ({
      session_id: String(r.session_id),
      session_name: (r.session_name ?? null) as string | null,
      is_active: Boolean(r.is_active),
      receipts_total: toNumber(r.receipts_total),
      receipts_pending: toNumber(r.receipts_pending),
      receipts_approved: toNumber(r.receipts_approved),
      approved_amount: toNumber(r.approved_amount),
    }))
    .sort((x, y) => {
      if (x.is_active !== y.is_active) return x.is_active ? -1 : 1; // active first
      // fallback sort by name (stable + predictable)
      return (y.session_name ?? "").localeCompare(x.session_name ?? "");
    });

  const approvedAllTime = toNumber(kpi.approved_all_time);
  const approvedActiveSession = bySession.find((s) => s.is_active)?.approved_amount ?? 0;

  return {
    activeSession: activeSession ? { id: activeSession.id, name: activeSession.name ?? null } : null,
    stats: {
      students: toNumber(kpi.students_total),
      staff,
      academicStaff,
      nonAcademicStaff,
      applications: toNumber(kpi.applications_total),
      applicationsPending: toNumber(kpi.applications_pending),
      receipts: toNumber(kpi.receipts_total),
      receiptsPending: toNumber(kpi.receipts_pending),
    },
    money: {
      approvedAllTime,
      approvedActiveSession,
    },
    bySession,
  };
}
