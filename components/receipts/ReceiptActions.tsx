"use client";

import { Eye, Download } from "lucide-react";
import type { ReceiptRow, ReceiptRole } from "./ReceiptTable";

export default function ReceiptActions({
  receipt,
  onView,
}: {
  receipt: ReceiptRow;
  role: ReceiptRole;
  onView: () => void;
  onRefresh: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-2 whitespace-nowrap">
      <button
        onClick={onView}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm"
        title="View receipt"
      >
        <Eye className="w-4 h-4" />
        <span className="hidden xl:inline">View</span>
      </button>

      <a
        href={receipt.receipt_url ?? "#"}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm"
        title="Download receipt"
        onClick={(e) => {
          if (!receipt.receipt_url) e.preventDefault();
        }}
      >
        <Download className="w-4 h-4" />
        <span className="hidden xl:inline">Download</span>
      </a>
    </div>
  );
}