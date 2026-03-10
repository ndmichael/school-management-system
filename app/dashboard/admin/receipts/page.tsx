"use client";

import ReceiptTable from "@/components/receipts/ReceiptTable";

export default function AdminReceiptsPage() {
  return (
    <div className="w-full min-h-screen bg-gray-50 pb-20 overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 space-y-6 min-w-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Receipt Review</h1>
          <p className="text-sm text-gray-500 mt-1">
            Review, preview, download, and manage submitted payment receipts.
          </p>
        </div>

        <ReceiptTable role="admin" />
      </div>
    </div>
  );
}