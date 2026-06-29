import AdminApplicationsPage from "@/components/applications/ApplicationsTable";

export default function AdmissionsApplicationsPage() {
/*
  == Shared UI for admin and admin officer.
  == Next step: I disable "Convert" here by adding a small prop to your component.
  == So only admin can convert app to student but admin officer can review, reject or accept application
*/
  return <AdminApplicationsPage detailsBasePath="/dashboard/admin/applications" />
}