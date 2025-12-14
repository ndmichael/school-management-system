// app/dashboard/admin/settings/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type SchoolSettingsPayload = {
  school_name: string;
  school_code: string;
  email: string | null;
  phone: string | null;
  address: string | null;
};

type ProfilePayload = {
  first_name: string;
  last_name: string;
  phone: string | null;
};

type NotificationPayload = {
  email_notifications: boolean;
  new_student_enrollment: boolean;
  payment_notifications: boolean;
  system_updates: boolean;
  weekly_reports: boolean;
};

function s(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function nullable(formData: FormData, key: string): string | null {
  const v = s(formData, key);
  return v.length ? v : null;
}

// ✅ works for "on" (checkbox), "true"/"false" (your Switch formData), "1"/"0"
function bool(formData: FormData, key: string): boolean {
  const v = formData.get(key);
  if (typeof v !== "string") return false;
  const x = v.trim().toLowerCase();
  return x === "on" || x === "true" || x === "1" || x === "yes";
}

async function requireAdmin() {
  const supabase = await createClient();

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) throw new Error("Unauthorized");

  const { data: p, error: pErr } = await supabase
    .from("profiles")
    .select("main_role")
    .eq("id", auth.user.id)
    .single();

  if (pErr || p?.main_role !== "admin") throw new Error("Forbidden");

  return { supabase, userId: auth.user.id };
}

export async function saveSchoolSettings(formData: FormData) {
  const { supabase } = await requireAdmin();

  const payload: SchoolSettingsPayload = {
    school_name: s(formData, "school_name"),
    school_code: s(formData, "school_code"),
    email: nullable(formData, "email"),
    phone: nullable(formData, "phone"),
    address: nullable(formData, "address"),
  };

  if (!payload.school_name || !payload.school_code) {
    throw new Error("School name and code are required.");
  }

  // ✅ return row so you can detect if it actually wrote
  const { data, error } = await supabase
    .from("school_settings")
    .upsert({ ...payload, singleton: true }, { onConflict: "singleton" })
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("No row saved (check RLS policies).");

  revalidatePath("/dashboard/admin/settings");
  return { ok: true };
}

export async function saveProfile(formData: FormData) {
  const { supabase, userId } = await requireAdmin();

  const payload: ProfilePayload = {
    first_name: s(formData, "first_name"),
    last_name: s(formData, "last_name"),
    phone: nullable(formData, "phone"),
  };

  if (!payload.first_name || !payload.last_name) {
    throw new Error("First name and last name are required.");
  }

  // ✅ .select() forces PostgREST to return updated row
  const { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", userId)
    .select("id, first_name, last_name, phone")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Update blocked or no rows updated (check RLS).");

  revalidatePath("/dashboard/admin/settings");
  return { ok: true, profile: data };
}

export async function changePassword(formData: FormData) {
  const { supabase } = await requireAdmin();

  const newPassword = s(formData, "new_password");
  const confirm = s(formData, "confirm_password");

  if (newPassword.length < 8) throw new Error("Password must be at least 8 characters.");
  if (newPassword !== confirm) throw new Error("Passwords do not match.");

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);

  return { ok: true };
}

export async function saveNotifications(formData: FormData) {
  const { supabase, userId } = await requireAdmin();

  const payload: NotificationPayload = {
    email_notifications: bool(formData, "email_notifications"),
    new_student_enrollment: bool(formData, "new_student_enrollment"),
    payment_notifications: bool(formData, "payment_notifications"),
    system_updates: bool(formData, "system_updates"),
    weekly_reports: bool(formData, "weekly_reports"),
  };

  const { data, error } = await supabase
    .from("notification_preferences")
    .upsert({ profile_id: userId, ...payload }, { onConflict: "profile_id" })
    .select("profile_id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("No row saved (check RLS policies).");

  revalidatePath("/dashboard/admin/settings");
  return { ok: true };
}
