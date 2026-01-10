"use client";

import { useParams } from "next/navigation";

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Results</h1>

      {/* NEXT:
          - fetch enrollments
          - render table
          - enter CA / Exam
      */}
      <p className="text-gray-600">
        Results entry for course offering {id}
      </p>
    </div>
  );
}
