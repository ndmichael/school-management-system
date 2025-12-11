"use client";

interface StatCardProps {
  label: string;
  value: number | string;
  color?: string; // optional color override (text-* classes)
}

export function StatCard({ label, value, color = "text-gray-900" }: StatCardProps) {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200">
      <p className="text-gray-600 text-sm">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
