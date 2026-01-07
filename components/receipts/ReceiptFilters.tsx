import { Search, Filter } from "lucide-react";

export default function ReceiptFilters({
  search,
  status,
  onSearch,
  onStatusChange,
}: {
  search: string;
  status: string;
  onSearch: (v: string) => void;
  onStatusChange: (v: string) => void;
}) {
  return (
    <div className="bg-white p-6 rounded-xl border flex flex-col lg:flex-row gap-4">
      <div className="flex-1 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search receipt…"
          className="w-full pl-12 pr-4 py-3 border rounded-xl text-sm"
        />
      </div>

      <div className="flex items-center gap-2">
        <Filter className="w-5 h-5 text-gray-500" />
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          className="px-4 py-3 border rounded-xl text-sm"
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
    </div>
  );
}
