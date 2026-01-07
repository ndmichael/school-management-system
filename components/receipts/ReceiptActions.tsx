import { Eye, Download, XCircle } from "lucide-react";
import { toast } from "react-toastify";
import type { ReceiptRow, ReceiptRole } from "./ReceiptTable";

export default function ReceiptActions({
  receipt,
  role,
  onView,
  onRefresh,
}: {
  receipt: ReceiptRow;
  role: ReceiptRole;
  onView: () => void;
  onRefresh: () => void;
}) {
  async function deleteReceipt() {
    if (!confirm("Delete receipt?")) return;
    const res = await fetch(`/api/admin/receipts/${receipt.id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Delete failed");
    toast.success("Deleted");
    onRefresh();
  }

  return (
    <div className="flex justify-end gap-3">
      <button onClick={onView} className="p-2 hover:bg-gray-100 rounded-lg">
        <Eye className="w-4 h-4" />
      </button>

      <a href={receipt.receipt_url} target="_blank" className="p-2 hover:bg-gray-100 rounded-lg">
        <Download className="w-4 h-4" />
      </a>

      {role === "admin" && (
        <button onClick={deleteReceipt} className="p-2 hover:bg-red-100 rounded-lg">
          <XCircle className="w-4 h-4 text-red-600" />
        </button>
      )}
    </div>
  );
}
