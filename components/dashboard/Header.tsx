"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Bell,
  User,
  LogOut,
  Settings,
  ChevronDown,
  ShieldCheck,
} from "lucide-react";
import { toast } from "react-toastify";
import { createClient } from "@/lib/supabase/client";
import type { DashboardUser, UserRole } from "@/types/dashboard";

const roleLabels: Record<UserRole, string> = {
  admin: "Admin",
  student: "Student",
  academic_staff: "Academic Staff",
  non_academic_staff: "Non-Academic Staff",
};

const roleColors: Record<UserRole, string> = {
  admin: "bg-red-500",
  student: "bg-blue-500",
  academic_staff: "bg-purple-500",
  non_academic_staff: "bg-green-500",
};

type HeaderProps = {
  user: DashboardUser;
  title?: string;
  notificationCount?: number;
};

function parseCsv(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
}

function withMiddleInitial(fullName: string): string {
  // "First Middle Last" -> "First M. Last"
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 3) return fullName.trim();

  const first = parts[0];
  const last = parts[parts.length - 1];
  const middle = parts.slice(1, -1).filter(Boolean);

  if (middle.length === 0) return `${first} ${last}`;

  const initial = middle[0]?.[0]?.toUpperCase();
  return initial ? `${first} ${initial}. ${last}` : `${first} ${last}`;
}

export function Header({ user, title, notificationCount = 0 }: HeaderProps) {
  const [open, setOpen] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);

  const roleLabel = roleLabels[user.role];
  const avatarColor = roleColors[user.role];

  useEffect(() => {
    const t = window.setTimeout(() => setOpen(false), 0);
    return () => window.clearTimeout(t);
  }, [pathname]);

  const hasNotifications = notificationCount > 0;

  // UI-only allowlist (configure in Vercel as NEXT_PUBLIC_SUPER_ADMIN_EMAILS)
  const isSuperAdmin = useMemo(() => {
    const env =
      typeof process !== "undefined"
        ? process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS
        : undefined;
    const allow = parseCsv(env ?? "mickeyjayblest@gmail.com");
    return allow.includes(user.email.trim().toLowerCase());
  }, [user.email]);

  const profilePath = useMemo(() => {
    if (user.role === "student") return "/dashboard/student/profile";
    return `/dashboard/${user.role}/settings`;
  }, [user.role]);

  const displayName = useMemo(
    () => withMiddleInitial(user.fullName),
    [user.fullName]
  );

  const handleLogout = async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
      toast.success("Logged out");
      router.replace("/login");
    } catch (error) {
      console.error("Logout failed", error);
      toast.error("Logout failed");
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <h1 className="truncate text-xl font-bold">
          {title || `${roleLabel} Dashboard`}
        </h1>

        <div className="flex items-center gap-4">
          {/* Notifications */}
          <button
            type="button"
            className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            aria-label="Notifications"
            onClick={() => toast.info("Notifications coming soon")}
          >
            <Bell className="h-4 w-4 text-gray-600" />
            {hasNotifications ? (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
                {notificationCount > 99 ? "99+" : String(notificationCount)}
              </span>
            ) : null}
          </button>

          {/* Profile dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen((prev) => !prev)}
              className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-gray-100 transition-colors"
              aria-expanded={open}
              aria-haspopup="menu"
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${avatarColor}`}
              >
                <User className="h-4 w-4 text-white" />
              </div>

              <div className="hidden text-left md:block">
                <p className="text-sm font-medium">{displayName}</p>
                <p className="text-xs text-gray-600">{roleLabel}</p>
              </div>

              <ChevronDown className="hidden h-4 w-4 sm:block" />
            </button>

            {open ? (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                />

                <div className="absolute right-0 z-50 mt-2 w-60 rounded-xl border border-gray-200 bg-white py-2 shadow-xl">
                  <div className="border-b border-gray-200 px-4 py-3">
                    <p className="text-sm font-medium">{displayName}</p>
                    <p className="truncate text-xs text-gray-600">{user.email}</p>
                  </div>

                  {/* Profile / Settings */}
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      router.push(profilePath);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100"
                  >
                    <Settings className="h-4 w-4" />
                    Profile
                  </button>

                  {/* Admin-only link in dropdown */}
                  {user.role === "admin" ? (
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        router.push("/dashboard/admin/super/invite");
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100"
                    >
                      <ShieldCheck className="h-4 w-4 text-purple-700" />
                      Invite Admin
                    </button>
                  ) : null}

                  {/* Super Admin only */}
                  {user.role === "admin" && isSuperAdmin ? (
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        router.push("/dashboard/admin/super/invite");
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100"
                    >
                      <ShieldCheck className="h-4 w-4 text-purple-700" />
                      Invite Admin
                    </button>
                  ) : null}

                  <hr className="my-2 border-gray-200" />

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
