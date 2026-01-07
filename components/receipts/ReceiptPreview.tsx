"use client";

import ViewReceiptModal from "@/components/modals/ViewReceiptModal";

interface Props {
  receiptId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onVerified?: () => void;
}

export default function ReceiptPreview(props: Props) {
  return <ViewReceiptModal {...props} />;
}
