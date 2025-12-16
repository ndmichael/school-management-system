import { redirect } from "next/navigation";
import ProfileClient from "./profile-client";
import { createClient } from "@/lib/supabase/server";

type ProfileRow = {
  id: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  date_of_birth: string | null; // date comes back as string
  gender: string | null;
  address: string | null;
  state_of_origin: string | null;
  lga_of_origin: string | null;
};

type StudentRow = {
  id: string;
  profile_id: string;
  matric_no: string | null;
  level: string | null;
  cgpa: number | null;
  enrollment_date: string | null;
  status: string | null;
};

export default async function ProfilePage() {
  const supabase = await createClient();

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) redirect("/login");

  const [{ data: profile, error: pErr }, { data: student, error: sErr }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, first_name, middle_name, last_name, email, phone, avatar_url, date_of_birth, gender, address, state_of_origin, lga_of_origin"
      )
      .eq("id", user.id)
      .single<ProfileRow>(),
    supabase
      .from("students")
      .select("id, profile_id, matric_no, level, cgpa, enrollment_date, status")
      .eq("profile_id", user.id)
      .single<StudentRow>(),
  ]);

  if (pErr || !profile) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <p className="text-sm text-gray-700">Profile not found.</p>
        {pErr?.message ? <p className="text-xs text-gray-500 mt-1">{pErr.message}</p> : null}
      </div>
    );
  }

  // student is optional here (but usually exists)
  return (
    <ProfileClient
      userId={user.id}
      authEmail={user.email ?? profile.email ?? ""}
      initialProfile={profile}
      student={student ?? null}
    />
  );
}
