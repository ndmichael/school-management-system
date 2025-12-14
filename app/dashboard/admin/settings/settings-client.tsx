"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {
  Save,
  Bell,
  Lock,
  User,
  Building2,
  Shield,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import type { SettingsInitialData } from "./page";
import {
  saveSchoolSettings,
  saveProfile,
  changePassword,
  saveNotifications,
} from "./actions";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

import { Input } from "@/components/shared/Input";
import { Textarea } from "@/components/shared/Textarea";

type Props = { initial: SettingsInitialData };
type TabKey = "general" | "profile" | "security" | "notifications";

type Banner =
  | { type: "success"; message: string }
  | { type: "error"; message: string }
  | null;

function initials(first: string | null, last: string | null) {
  const f = (first ?? "").trim().slice(0, 1).toUpperCase();
  const l = (last ?? "").trim().slice(0, 1).toUpperCase();
  return `${f || "A"}${l || ""}`;
}

const toFormValue = (v: string | null | undefined) => v ?? "";

export default function SettingsClient({ initial }: Props) {
  const router = useRouter();

  const [tab, setTab] = React.useState<TabKey>("general");
  const [banner, setBanner] = React.useState<Banner>(null);

  const [savingGeneral, startGeneral] = React.useTransition();
  const [savingProfile, startProfile] = React.useTransition();
  const [savingSecurity, startSecurity] = React.useTransition();
  const [savingNotif, startNotif] = React.useTransition();

  const profile = initial.profile;
  const school = initial.school;

  // ✅ CONTROLLED FORM STATE (this is why your UI wasn't updating before)
  const [schoolForm, setSchoolForm] = React.useState(() => ({
    school_name: school?.school_name ?? "",
    school_code: school?.school_code ?? "",
    email: school?.email ?? "",
    phone: school?.phone ?? "",
    address: school?.address ?? "",
  }));

  const [profileForm, setProfileForm] = React.useState(() => ({
    first_name: profile.first_name ?? "",
    last_name: profile.last_name ?? "",
    phone: profile.phone ?? "",
  }));

  // controlled prefs (Switch)
  const [prefs, setPrefs] = React.useState(() => ({
    email_notifications: initial.notifications?.email_notifications ?? true,
    new_student_enrollment: initial.notifications?.new_student_enrollment ?? true,
    payment_notifications: initial.notifications?.payment_notifications ?? true,
    system_updates: initial.notifications?.system_updates ?? true,
    weekly_reports: initial.notifications?.weekly_reports ?? false,
  }));

  // ✅ when server refresh brings new initial, sync local state so UI updates
  React.useEffect(() => {
    setSchoolForm({
      school_name: initial.school?.school_name ?? "",
      school_code: initial.school?.school_code ?? "",
      email: initial.school?.email ?? "",
      phone: initial.school?.phone ?? "",
      address: initial.school?.address ?? "",
    });

    setProfileForm({
      first_name: initial.profile.first_name ?? "",
      last_name: initial.profile.last_name ?? "",
      phone: initial.profile.phone ?? "",
    });

    setPrefs({
      email_notifications: initial.notifications?.email_notifications ?? true,
      new_student_enrollment: initial.notifications?.new_student_enrollment ?? true,
      payment_notifications: initial.notifications?.payment_notifications ?? true,
      system_updates: initial.notifications?.system_updates ?? true,
      weekly_reports: initial.notifications?.weekly_reports ?? false,
    });
  }, [initial]);

  // auto-clear banner
  React.useEffect(() => {
    if (!banner) return;
    const t = window.setTimeout(() => setBanner(null), 4000);
    return () => window.clearTimeout(t);
  }, [banner]);

  const tabs: Array<{ key: TabKey; label: string; Icon: React.ElementType }> = [
    { key: "general", label: "General", Icon: Building2 },
    { key: "profile", label: "Profile", Icon: User },
    { key: "security", label: "Security", Icon: Lock },
    { key: "notifications", label: "Notifications", Icon: Bell },
  ];

  function ok(msg: string) {
    setBanner({ type: "success", message: msg });
    toast.success(msg);
  }
  function fail(e: unknown, fallback: string) {
    const msg = e instanceof Error ? e.message : fallback;
    setBanner({ type: "error", message: msg });
    toast.error(msg);
  }

  // ---------------- HANDLERS ----------------
  function onSubmitGeneral(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("school_name", schoolForm.school_name);
    fd.set("school_code", schoolForm.school_code);
    fd.set("email", schoolForm.email);
    fd.set("phone", schoolForm.phone);
    fd.set("address", schoolForm.address);

    startGeneral(async () => {
      try {
        await saveSchoolSettings(fd);
        ok("School settings saved successfully.");
        router.refresh();
      } catch (e2) {
        fail(e2, "Failed to save settings.");
      }
    });
  }

  function onSubmitProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("first_name", profileForm.first_name);
    fd.set("last_name", profileForm.last_name);
    fd.set("phone", profileForm.phone);

    startProfile(async () => {
      try {
        await saveProfile(fd);
        ok("Profile updated successfully.");
        router.refresh();
      } catch (e2) {
        fail(e2, "Failed to update profile.");
      }
    });
  }

  function onSubmitSecurity(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    startSecurity(async () => {
      try {
        await changePassword(fd);
        ok("Password updated successfully.");
        (e.currentTarget as HTMLFormElement).reset();
      } catch (e2) {
        fail(e2, "Failed to change password.");
      }
    });
  }

  // ✅ IMPORTANT: actions.ts expects checkbox values ("on") not "true"/"false"
  function onSubmitNotifications(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    startNotif(async () => {
      try {
        const fd = new FormData();
        const setOn = (key: string, checked: boolean) => {
          if (checked) fd.set(key, "on");
          else fd.delete(key);
        };

        setOn("email_notifications", prefs.email_notifications);
        setOn("new_student_enrollment", prefs.new_student_enrollment);
        setOn("payment_notifications", prefs.payment_notifications);
        setOn("system_updates", prefs.system_updates);
        setOn("weekly_reports", prefs.weekly_reports);

        await saveNotifications(fd);
        ok("Notification preferences saved successfully.");
        router.refresh();
      } catch (e2) {
        fail(e2, "Failed to save preferences.");
      }
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50/50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Settings
          </h1>
          <p className="text-base text-slate-600">
            Manage your account and system preferences
          </p>
        </div>

        {/* Banner */}
        {banner && (
          <div
            className={[
              "rounded-2xl border px-5 py-4 text-sm font-medium shadow-lg",
              "animate-in fade-in slide-in-from-top-3 duration-300",
              banner.type === "success"
                ? "border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 text-green-900"
                : "border-red-200 bg-gradient-to-r from-red-50 to-rose-50 text-red-900",
            ].join(" ")}
          >
            <div className="flex items-center gap-3">
              {banner.type === "success" ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
              )}
              <span>{banner.message}</span>
            </div>
          </div>
        )}

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as TabKey)}
          className="space-y-6"
        >
          <TabsList className="inline-flex h-auto gap-2 rounded-2xl border border-slate-200/60 bg-white p-1.5 shadow-sm">
            {tabs.map(({ key, label, Icon }) => (
              <TabsTrigger
                key={key}
                value={key}
                className="group relative gap-2.5 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all data-[state=active]:bg-gradient-to-br data-[state=active]:from-red-600 data-[state=active]:to-red-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-red-500/25 data-[state=inactive]:text-slate-600 data-[state=inactive]:hover:bg-slate-50"
              >
                <Icon className="h-4 w-4 transition-transform group-data-[state=active]:scale-110" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ---------------- GENERAL ---------------- */}
          <TabsContent value="general" className="space-y-0">
            <Card className="overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-xl shadow-slate-100/50">
              <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50">
                    <Building2 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-slate-900">
                      School Settings
                    </CardTitle>
                    <CardDescription className="mt-1 text-slate-600">
                      These settings reflect across the entire portal
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                <form className="space-y-6" onSubmit={onSubmitGeneral}>
                  <div className="space-y-5">
                    <Input
                      label="School Name"
                      name="school_name"
                      required
                      value={schoolForm.school_name}
                      onChange={(e) =>
                        setSchoolForm((p) => ({
                          ...p,
                          school_name: e.target.value,
                        }))
                      }
                      placeholder="Enter school name"
                    />

                    <Input
                      label="School Code"
                      name="school_code"
                      required
                      value={schoolForm.school_code}
                      onChange={(e) =>
                        setSchoolForm((p) => ({
                          ...p,
                          school_code: e.target.value,
                        }))
                      }
                      placeholder="e.g. SYK-2025"
                    />

                    <div className="grid gap-5 sm:grid-cols-2">
                      <Input
                        label="Email Address"
                        name="email"
                        type="email"
                        value={schoolForm.email}
                        onChange={(e) =>
                          setSchoolForm((p) => ({ ...p, email: e.target.value }))
                        }
                        placeholder="info@school.edu.ng"
                      />
                      <Input
                        label="Phone Number"
                        name="phone"
                        value={schoolForm.phone}
                        onChange={(e) =>
                          setSchoolForm((p) => ({ ...p, phone: e.target.value }))
                        }
                        placeholder="+234 800 000 0000"
                      />
                    </div>

                    <Textarea
                      label="Physical Address"
                      name="address"
                      value={schoolForm.address}
                      onChange={(e) =>
                        setSchoolForm((p) => ({
                          ...p,
                          address: e.target.value,
                        }))
                      }
                      placeholder="Enter complete school address..."
                      rows={3}
                    />
                  </div>

                  <Separator className="bg-slate-100" />

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={savingGeneral}
                      className="group gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-500/25 transition-all hover:shadow-xl hover:shadow-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="h-4 w-4 transition-transform group-hover:scale-110" />
                      {savingGeneral ? "Saving Changes..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---------------- PROFILE ---------------- */}
          <TabsContent value="profile" className="space-y-0">
            <Card className="overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-xl shadow-slate-100/50">
              <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-100 to-purple-50">
                    <User className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-slate-900">
                      Your Profile
                    </CardTitle>
                    <CardDescription className="mt-1 text-slate-600">
                      Update your personal account information
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6 p-6">
                <div className="flex items-center gap-5 rounded-2xl border border-slate-200/60 bg-gradient-to-br from-slate-50 to-white p-5">
                  <div className="relative">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-600 to-orange-500 text-xl font-bold text-white shadow-lg shadow-red-500/25">
                      {initials(profile.first_name, profile.last_name)}
                    </div>
                    <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-white bg-green-500 shadow-sm" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-bold text-slate-900">
                      {(profile.first_name ?? "Admin") +
                        " " +
                        (profile.last_name ?? "")}
                    </p>
                    <p className="truncate text-sm text-slate-600">
                      {profile.email ?? "—"}
                    </p>
                  </div>
                </div>

                <form className="space-y-6" onSubmit={onSubmitProfile}>
                  <div className="space-y-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Input
                        label="First Name"
                        name="first_name"
                        required
                        value={profileForm.first_name}
                        onChange={(e) =>
                          setProfileForm((p) => ({
                            ...p,
                            first_name: e.target.value,
                          }))
                        }
                        placeholder="Enter first name"
                      />
                      <Input
                        label="Last Name"
                        name="last_name"
                        required
                        value={profileForm.last_name}
                        onChange={(e) =>
                          setProfileForm((p) => ({
                            ...p,
                            last_name: e.target.value,
                          }))
                        }
                        placeholder="Enter last name"
                      />
                    </div>

                    <Input
                      label="Phone Number"
                      name="phone"
                      value={toFormValue(profileForm.phone)}
                      onChange={(e) =>
                        setProfileForm((p) => ({ ...p, phone: e.target.value }))
                      }
                      placeholder="+234 800 000 0000"
                    />
                  </div>

                  <Separator className="bg-slate-100" />

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={savingProfile}
                      className="group gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-500/25 transition-all hover:shadow-xl hover:shadow-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="h-4 w-4 transition-transform group-hover:scale-110" />
                      {savingProfile ? "Updating Profile..." : "Update Profile"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---------------- SECURITY ---------------- */}
          <TabsContent value="security" className="space-y-0">
            <Card className="overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-xl shadow-slate-100/50">
              <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50">
                    <Lock className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-slate-900">
                      Security Settings
                    </CardTitle>
                    <CardDescription className="mt-1 text-slate-600">
                      Manage your password and security preferences
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6 p-6">
                <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-sky-50 p-5">
                  <div className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100">
                      <Shield className="h-5 w-5 text-blue-700" />
                    </div>
                    <div className="space-y-2">
                      <p className="font-semibold text-blue-900">
                        Password Requirements
                      </p>
                      <ul className="space-y-1.5 text-sm text-blue-800">
                        <li className="flex items-center gap-2">
                          <div className="h-1 w-1 rounded-full bg-blue-600" />
                          Minimum 8 characters in length
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="h-1 w-1 rounded-full bg-blue-600" />
                          Use a strong, unique password
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <form className="space-y-6" onSubmit={onSubmitSecurity}>
                  <div className="max-w-xl space-y-5">
                    <Input
                      label="New Password"
                      name="new_password"
                      type="password"
                      required
                      placeholder="Enter new password"
                    />
                    <Input
                      label="Confirm New Password"
                      name="confirm_password"
                      type="password"
                      required
                      placeholder="Re-enter new password"
                    />
                  </div>

                  <Separator className="bg-slate-100" />

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={savingSecurity}
                      className="group gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-500/25 transition-all hover:shadow-xl hover:shadow-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Lock className="h-4 w-4 transition-transform group-hover:scale-110" />
                      {savingSecurity
                        ? "Changing Password..."
                        : "Change Password"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---------------- NOTIFICATIONS ---------------- */}
          <TabsContent value="notifications" className="space-y-0">
            <Card className="overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-xl shadow-slate-100/50">
              <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-green-100 to-emerald-50">
                    <Bell className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-slate-900">
                      Notification Preferences
                    </CardTitle>
                    <CardDescription className="mt-1 text-slate-600">
                      Choose what notifications you want to receive
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                <form className="space-y-6" onSubmit={onSubmitNotifications}>
                  <div className="space-y-3">
                    <PrefRow
                      label="Email Notifications"
                      desc="Receive email updates about important events and activities"
                      checked={prefs.email_notifications}
                      onCheckedChange={(v) =>
                        setPrefs((p) => ({ ...p, email_notifications: v }))
                      }
                    />
                    <PrefRow
                      label="New Student Enrollment"
                      desc="Get notified when new students register and enroll"
                      checked={prefs.new_student_enrollment}
                      onCheckedChange={(v) =>
                        setPrefs((p) => ({ ...p, new_student_enrollment: v }))
                      }
                    />
                    <PrefRow
                      label="Payment Notifications"
                      desc="Receive alerts for new payments and receipt actions"
                      checked={prefs.payment_notifications}
                      onCheckedChange={(v) =>
                        setPrefs((p) => ({ ...p, payment_notifications: v }))
                      }
                    />
                    <PrefRow
                      label="System Updates"
                      desc="Stay informed about important system and maintenance updates"
                      checked={prefs.system_updates}
                      onCheckedChange={(v) =>
                        setPrefs((p) => ({ ...p, system_updates: v }))
                      }
                    />
                    <PrefRow
                      label="Weekly Reports"
                      desc="Receive comprehensive weekly summary reports via email"
                      checked={prefs.weekly_reports}
                      onCheckedChange={(v) =>
                        setPrefs((p) => ({ ...p, weekly_reports: v }))
                      }
                    />
                  </div>

                  <Separator className="bg-slate-100" />

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={savingNotif}
                      className="group gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-500/25 transition-all hover:shadow-xl hover:shadow-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="h-4 w-4 transition-transform group-hover:scale-110" />
                      {savingNotif ? "Saving Preferences..." : "Save Preferences"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function PrefRow(props: {
  label: string;
  desc: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="group flex items-start justify-between gap-5 rounded-2xl border border-slate-200/60 bg-white p-5 transition-all hover:border-slate-300 hover:shadow-md hover:shadow-slate-100/50">
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-900">{props.label}</p>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">{props.desc}</p>
      </div>

      <div className="shrink-0 pt-0.5">
        <Switch
          checked={props.checked}
          onCheckedChange={props.onCheckedChange}
          className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-red-600 data-[state=checked]:to-red-500"
        />
      </div>
    </div>
  );
}
