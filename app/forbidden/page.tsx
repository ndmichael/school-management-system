// app/forbidden/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/dashboard";

export const dynamic = "force-dynamic";

const ROLE_HOME: Record<UserRole, string> = {
  admin: "/dashboard/admin",
  student: "/dashboard/student",
  academic_staff: "/dashboard/academic_staff",
  non_academic_staff: "/dashboard/non_academic_staff",
};

export default async function ForbiddenPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("main_role")
    .eq("id", user.id)
    .maybeSingle<{ main_role: UserRole | null }>();

  const home = profile?.main_role ? ROLE_HOME[profile.main_role] : "/dashboard";

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-lg rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">Access denied</h1>
        <p className="mt-2 text-sm text-gray-600">
          You’re signed in, but you don’t have permission to view that page.
        </p>

        <div className="mt-6 flex gap-3">
          <Link
            href={home}
            className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800"
          >
            Back to dashboard
          </Link>

          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-lg border bg-white text-sm font-medium hover:bg-gray-50"
          >
            Go to home redirect
          </Link>
        </div>
      </div>
    </main>
  );
}
