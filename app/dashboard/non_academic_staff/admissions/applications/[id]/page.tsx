// export { default } from "@/app/dashboard/admin/applications/[id]/page";
import ApplicationDetailsPage from "@/components/applications/ApplicationDetailsPage"

export default function AdmissionsApplicationDetailsRoute() {
  return (
    <ApplicationDetailsPage detailsBasePath="/dashboard/non_academic_staff/admissions/applications" />
  )
}
