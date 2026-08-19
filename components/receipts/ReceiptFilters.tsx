"use client";

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
    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search by student name, email, matric no..."
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 text-gray-500">
            <Filter className="w-5 h-5" />
            <span className="text-sm font-medium">Status</span>
          </div>

          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="reversed">Reversed</option>
          </select>
        </div>
      </div>
    </div>
  );
}