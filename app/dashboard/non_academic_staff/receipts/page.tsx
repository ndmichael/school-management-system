"use client";

import ReceiptTable from "@/components/receipts/ReceiptTable";

export default function BursaryReceiptsPage() {
  return (
    <div className="w-full min-h-screen bg-gray-50 pb-20">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10">
        <ReceiptTable role="bursary" />
      </div>
    </div>
  );
}
