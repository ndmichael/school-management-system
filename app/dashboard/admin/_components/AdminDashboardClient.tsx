"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Clock3,
  FileText,
  GraduationCap,
  Users,
  Wallet,
  Receipt as ReceiptIcon,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";

import type { AdminDashboardData } from "../actions";

type Props = { data: AdminDashboardData };

function formatNGN(value: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type StatItemProps = {
  title: string;
  value: string;
  icon: ReactNode;
  href?: string;
  accent?: "red" | "neutral";
};

function StatItem({ title, value, icon, href, accent = "neutral" }: StatItemProps) {
  const card = (
    <div
      className={cx(
        "group relative overflow-hidden rounded-3xl border bg-gradient-to-br p-6 transition-all duration-300",
        accent === "red"
          ? "from-red-50 via-white to-white border-red-100 hover:shadow-xl hover:shadow-red-100/50 hover:border-red-200"
          : "from-slate-50 via-white to-white border-slate-200/60 hover:shadow-xl hover:shadow-slate-100/50 hover:border-slate-300"
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-white/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="relative">
        <div className="mb-4 flex items-start justify-between">
          <div
            className={cx(
              "flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-300",
              accent === "red"
                ? "bg-red-100 text-red-600 group-hover:bg-red-600 group-hover:text-white group-hover:scale-110"
                : "bg-slate-100 text-slate-600 group-hover:bg-slate-800 group-hover:text-white group-hover:scale-110"
            )}
          >
            {icon}
          </div>

          {href ? (
            <ArrowUpRight className="h-5 w-5 text-slate-400 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          ) : null}
        </div>

        <p className="mb-1.5 text-sm font-medium text-slate-600">{title}</p>
        <p className="text-3xl font-bold tracking-tight text-slate-900">{value}</p>
      </div>
    </div>
  );

  return href ? (
    <Link
      href={href}
      className="block rounded-3xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:ring-offset-2"
    >
      {card}
    </Link>
  ) : (
    card
  );
}

export default function AdminDashboardClient({ data }: Props) {
  const activeSessionName = data.activeSession?.name ?? "Not set";

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-50/50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-7xl space-y-8">
        {/* HEADER */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Dashboard
            </h1>

            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-slate-600">Active session:</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-900">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                {activeSessionName}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/admin/receipts"
              className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-red-600 to-red-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-red-500/25 transition-all hover:shadow-xl hover:shadow-red-500/30 hover:scale-[1.02] active:scale-[0.98]"
            >
              <ReceiptIcon className="h-4 w-4 transition-transform group-hover:rotate-12" />
              Review Receipts
            </Link>

            <Link
              href="/dashboard/admin/sessions"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
            >
              <TrendingUp className="h-4 w-4" />
              Manage Sessions
            </Link>
          </div>
        </div>

        {/* KPI GRID */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatItem
            title="Total Students"
            value={data.stats.students.toLocaleString()}
            icon={<GraduationCap className="h-6 w-6" />}
            href="/dashboard/admin/students"
          />
          <StatItem
            title="Staff Members"
            value={data.stats.staff.toLocaleString()}
            icon={<Users className="h-6 w-6" />}
            href="/dashboard/admin/staff"
          />
          <StatItem
            title="Applications"
            value={data.stats.applications.toLocaleString()}
            icon={<FileText className="h-6 w-6" />}
            href="/dashboard/admin/applications"
          />
          <StatItem
            title="Pending Receipts"
            value={data.stats.receiptsPending.toLocaleString()}
            icon={<Clock3 className="h-6 w-6" />}
            href="/dashboard/admin/receipts"
            accent="red"
          />
        </div>

        {/* MONEY ROW */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <StatItem title="All-Time Revenue" value={formatNGN(data.money.approvedAllTime)} icon={<Wallet className="h-6 w-6" />} />
          <StatItem
            title="Active Session Revenue"
            value={formatNGN(data.money.approvedActiveSession)}
            icon={<ReceiptIcon className="h-6 w-6" />}
            accent="red"
          />
          <StatItem
            title="Pending Applications"
            value={data.stats.applicationsPending.toLocaleString()}
            icon={<Clock3 className="h-6 w-6" />}
          />
        </div>

        {/* SESSIONS OVERVIEW */}
        <div className="w-full overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-xl shadow-slate-100/50">
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-6">
            <div className="flex items-start justify-between gap-4 sm:items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Sessions Overview</h2>
                <p className="mt-0.5 text-sm text-slate-600">Active session is highlighted below</p>
              </div>

              {data.bySession.some((s) => s.is_active) ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1.5 text-xs font-bold text-green-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  LIVE
                </span>
              ) : null}
            </div>
          </div>

          {/* Desktop/tablet table */}
          <div className="hidden md:block">
            <div className="-mx-4 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Session</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-600">Pending</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-600">Approved</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-600">Revenue</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {data.bySession.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                            <FileText className="h-6 w-6 text-slate-400" />
                          </div>
                          <p className="text-sm font-medium text-slate-900">No sessions found</p>
                          <p className="text-xs text-slate-500">Create a session to get started</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    data.bySession.map((s) => (
                      <tr
                        key={s.session_id}
                        className={cx(
                          "transition-colors hover:bg-slate-50/50",
                          s.is_active && "bg-gradient-to-r from-red-50/50 via-transparent to-transparent"
                        )}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="truncate font-semibold text-slate-900">{s.session_name ?? "—"}</span>
                            {s.is_active ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                                <BadgeCheck className="h-3 w-3" />
                                Active
                              </span>
                            ) : null}
                          </div>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <span className="inline-flex items-center justify-center rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700 tabular-nums">
                            {s.receipts_pending.toLocaleString()}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <span className="inline-flex items-center justify-center rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700 tabular-nums">
                            {s.receipts_approved.toLocaleString()}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right font-bold text-slate-900 tabular-nums">
                          {formatNGN(s.approved_amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden">
            <div className="divide-y divide-slate-100">
              {data.bySession.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-sm font-medium text-slate-900">No sessions found</p>
                  <p className="mt-1 text-xs text-slate-500">Create a session to get started</p>
                </div>
              ) : (
                data.bySession.map((s) => (
                  <div key={s.session_id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">{s.session_name ?? "—"}</p>
                        {s.is_active ? (
                          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                            <BadgeCheck className="h-3 w-3" />
                            Active
                          </span>
                        ) : null}
                      </div>

                      <p className="font-bold text-slate-900 tabular-nums">{formatNGN(s.approved_amount)}</p>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl bg-amber-50 px-3 py-2 text-amber-800">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-700">Pending</span>
                        <span className="mt-1 inline-block font-semibold tabular-nums">{s.receipts_pending.toLocaleString()}</span>
                      </div>
                      <div className="rounded-xl bg-green-50 px-3 py-2 text-green-800">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-green-700">Approved</span>
                        <span className="mt-1 inline-block font-semibold tabular-nums">{s.receipts_approved.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-3">
            <p className="text-xs text-slate-500">
              <span className="font-semibold text-slate-600">Note:</span> Revenue calculated from approved_amount with fallback to amount_paid for approved receipts
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
