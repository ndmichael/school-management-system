import { notFound, redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth/super-admin";
import InviteAdminClient from "./invite-admin-client";

export default async function InviteAdminPage() {
  const auth = await requireSuperAdmin();

  if (!auth.user) redirect("/login");
  if (!auth.ok) notFound();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-3xl">
        <InviteAdminClient superAdminEmail={auth.user.email ?? ""} />
      </div>
    </div>
  );
}
