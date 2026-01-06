import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  main_role: string;
};

type StaffRow = {
  unit: string | null;
};

function NavItem({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block rounded-md px-3 py-2 text-sm hover:bg-gray-100"
    >
      {label}
    </Link>
  );
}

export default async function NonAcademicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, main_role")
    .eq("id", userData.user.id)
    .maybeSingle<Profile>();

  if (!profile) redirect("/login");

  const isAdmin = profile.main_role === "admin";
  const isNonAcademic = profile.main_role === "non_academic_staff";

  if (!isAdmin && !isNonAcademic) redirect("/dashboard");

  let unit: string | null = null;

  if (isNonAcademic) {
    const { data: staff } = await supabase
      .from("staff")
      .select("unit")
      .eq("profile_id", profile.id)
      .maybeSingle<StaffRow>();

    unit = staff?.unit ?? null;
  }

  // Minimal unit-based menu (admin sees all)
  const showAdmissions = isAdmin || unit === "admissions";
  const showBursary = isAdmin || unit === "bursary";
  const showExams = isAdmin || unit === "exams";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <aside className="w-64 border-r bg-white p-4">
          <div className="text-sm font-semibold">Non-Academic Portal</div>
          <div className="mt-1 text-xs text-gray-500">
            {profile.first_name} {profile.last_name}
            {unit ? ` · ${unit}` : ""}
          </div>

          {!isAdmin && !unit && (
            <div className="mt-3 rounded-md border bg-yellow-50 p-3 text-xs text-yellow-900">
              No unit assigned to your staff record. Contact admin.
            </div>
          )}

          <nav className="mt-4 space-y-1">
            <NavItem href="/dashboard/non_academic_staff" label="Home" />

            {showAdmissions && (
              <NavItem
                href="/dashboard/non_academic_staff/admissions/applications"
                label="Admissions"
              />
            )}

            {showBursary && (
              <>
                <NavItem href="/dashboard/non_academic_staff/receipts" label="Receipts" />
                <NavItem href="/dashboard/non_academic_staff/clearance" label="Clearance" />
              </>
            )}

            {showExams && (
              <NavItem href="/dashboard/non_academic_staff/exams" label="Exams" />
            )}
          </nav>
        </aside>

        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
