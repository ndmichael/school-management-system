// app/dashboard/student/profile/page.tsx
import { redirect } from "next/navigation";
import ProfileClient from "./profile-client";
import { createClient } from "@/lib/supabase/server";

type StoredFile = { bucket: string; path: string };

type ProfileRow = {
  id: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_file: StoredFile | null;
  date_of_birth: string | null;
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

  const profileRes = await supabase
    .from("profiles")
    .select(
      "id, first_name, middle_name, last_name, email, phone, avatar_file, date_of_birth, gender, address, state_of_origin, lga_of_origin"
    )
    .eq("id", user.id)
    .maybeSingle();

  const studentRes = await supabase
    .from("students")
    .select("id, profile_id, matric_no, level, cgpa, enrollment_date, status")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (profileRes.error || !profileRes.data) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <p className="text-sm text-gray-700">Profile not found.</p>
        {profileRes.error?.message ? (
          <p className="text-xs text-gray-500 mt-1">{profileRes.error.message}</p>
        ) : null}
      </div>
    );
  }

  return (
    <ProfileClient
      userId={user.id}
      authEmail={user.email ?? profileRes.data.email ?? ""}
      initialProfile={profileRes.data as ProfileRow}
      student={(studentRes.data as StudentRow) ?? null}
    />
  );
}
