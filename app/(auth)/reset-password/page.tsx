import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PasswordUpdateForm from "../_components/password-update-form";

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) redirect("/login");

  return (
    <main className="mx-auto w-full max-w-md px-4 py-12">
      <h1 className="text-2xl font-semibold">Reset password</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Choose a strong new password.
      </p>

      <div className="mt-6">
        <PasswordUpdateForm mode="reset" />
      </div>
    </main>
  );
}
