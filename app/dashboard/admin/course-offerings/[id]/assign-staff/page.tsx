import AssignStaffClient from "./AssignStaffClient";

export default async function AssignStaffPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <AssignStaffClient offeringId={id} />;
}
