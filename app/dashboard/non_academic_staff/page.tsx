import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Profile = { id: string; main_role: string; first_name: string; last_name: string };
type StaffRow = { unit: string | null };

export default async function NonAcademicHome() {
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, main_role, first_name, last_name")
    .eq("id", userData.user.id)
    .maybeSingle<Profile>();

  if (!profile) redirect("/login");

  const isAdmin = profile.main_role === "admin";
  const isNonAcademic = profile.main_role === "non_academic_staff";

  if (!isAdmin && !isNonAcademic) redirect("/dashboard");

  if (isNonAcademic) {
    const { data: staff } = await supabase
      .from("staff")
      .select("unit")
      .eq("profile_id", profile.id)
      .maybeSingle<StaffRow>();

    const unit = staff?.unit ?? null;

    if (unit === "admissions") redirect("/dashboard/non_academic_staff/admissions/applications");
    if (unit === "bursary") redirect("/dashboard/non_academic_staff/receipts");
    if (unit === "exams") redirect("/dashboard/non_academic_staff/exams");
  }

  // Admin or unassigned unit -> show options
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Non-Academic Portal</h1>
      <p className="text-sm text-gray-600">
        Choose a module.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link className="rounded-lg border bg-white p-4 hover:bg-gray-50" href="/dashboard/non_academic_staff/admissions/applications">
          <div className="font-semibold">Admissions</div>
          <div className="text-xs text-gray-500 mt-1">Review applications</div>
        </Link>

        <Link className="rounded-lg border bg-white p-4 hover:bg-gray-50" href="/dashboard/non_academic_staff/receipts">
          <div className="font-semibold">Bursary</div>
          <div className="text-xs text-gray-500 mt-1">Receipts & clearance</div>
        </Link>

        <Link className="rounded-lg border bg-white p-4 hover:bg-gray-50" href="/dashboard/non_academic_staff/exams">
          <div className="font-semibold">Exams</div>
          <div className="text-xs text-gray-500 mt-1">Results upload/view</div>
        </Link>
      </div>
    </main>
  );
}
