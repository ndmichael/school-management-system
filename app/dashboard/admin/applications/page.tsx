import AdminApplicationsPage from "@/components/applications/ApplicationsTable";

export default function AdmissionsApplicationsPage() {
  // For now, reuse the same UI.
  // Next step: we’ll disable "Convert" here by adding a small prop to your component.
  return <AdminApplicationsPage detailsBasePath="/dashboard/admin/applications" />
}