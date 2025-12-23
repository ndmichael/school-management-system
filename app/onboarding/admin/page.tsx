export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Suspense } from "react";
import AdminOnboardingClient from "./admin-onboarding-client";

export default function AdminOnboardingPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Suspense fallback={<div className="py-16 text-center text-slate-600">Loading…</div>}>
        <AdminOnboardingClient />
      </Suspense>
    </div>
  );
}
