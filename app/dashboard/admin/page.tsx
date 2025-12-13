// app/dashboard/admin/page.tsx
import { getAdminDashboardData } from "./actions";
import AdminDashboardClient from "./_components/AdminDashboardClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const data = await getAdminDashboardData();
  return <AdminDashboardClient data={data} />;
}
