import { redirect } from "next/navigation";

type PageProps = {
  params: { id: string };
};

export default function ReceiptDetailsPage({ params }: PageProps) {
  // MVP: you don't need a separate details page.
  // Your ViewReceiptModal already handles viewing.
  redirect(`/dashboard/non_academic_staff/receipts?view=${encodeURIComponent(params.id)}`);
}
