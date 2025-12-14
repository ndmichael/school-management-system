// app/dashboard/admin/settings/page.tsx
import "server-only";
import { createClient } from "@/lib/supabase/server";
import SettingsClient from "./settings-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type SettingsInitialData = {
  profile: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
  };
  school: {
    school_name: string;
    school_code: string;
    email: string | null;
    phone: string | null;
    address: string | null;
  } | null;
  notifications: {
    email_notifications: boolean;
    new_student_enrollment: boolean;
    payment_notifications: boolean;
    system_updates: boolean;
    weekly_reports: boolean;
  } | null;
};

type ProfileRow = {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
};

type SchoolSettingsRow = {
  school_name: string;
  school_code: string;
  email: string | null;
  phone: string | null;
  address: string | null;
};

type NotificationPrefsRow = {
  email_notifications: boolean;
  new_student_enrollment: boolean;
  payment_notifications: boolean;
  system_updates: boolean;
  weekly_reports: boolean;
};

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  // Layout guard should already handle this, but keep it safe.
  if (authErr || !user) return null;

  const [profileRes, schoolRes, notifRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name,last_name,email,phone,avatar_url")
      .eq("id", user.id)
      .single<ProfileRow>(),

    supabase
      .from("school_settings")
      .select("school_name,school_code,email,phone,address")
      .eq("singleton", true)
      .maybeSingle<SchoolSettingsRow>(),

    supabase
      .from("notification_preferences")
      .select(
        "email_notifications,new_student_enrollment,payment_notifications,system_updates,weekly_reports"
      )
      .eq("profile_id", user.id)
      .maybeSingle<NotificationPrefsRow>(),
  ]);

  // If profile is missing, that’s a real problem — but don’t crash the page.
  const profile = profileRes.data ?? {
    first_name: null,
    last_name: null,
    email: user.email ?? null,
    phone: null,
    avatar_url: null,
  };

  const initial: SettingsInitialData = {
    profile: {
      first_name: profile.first_name,
      last_name: profile.last_name,
      email: profile.email ?? user.email ?? null,
      phone: profile.phone,
      avatar_url: profile.avatar_url,
    },

    school: schoolRes.data
      ? {
          school_name: schoolRes.data.school_name,
          school_code: schoolRes.data.school_code,
          email: schoolRes.data.email,
          phone: schoolRes.data.phone,
          address: schoolRes.data.address,
        }
      : null,

    notifications: notifRes.data
      ? {
          email_notifications: notifRes.data.email_notifications,
          new_student_enrollment: notifRes.data.new_student_enrollment,
          payment_notifications: notifRes.data.payment_notifications,
          system_updates: notifRes.data.system_updates,
          weekly_reports: notifRes.data.weekly_reports,
        }
      : null,
  };

  return <SettingsClient initial={initial} />;
}
