"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "react-toastify";

import RosterTable from "@/components/exams/roster/RosterTable";
import AddStudentModal from "@/components/exams/roster/AddStudentModal";
import { Button } from "@/components/ui/button";

type Enrollment = {
  id: string;
  students: {
    matric_no: string;
    level?: string | null;
    profiles: {
      first_name: string;
      last_name: string;
    };
    program?: { name: string } | null;
  };
};

export default function Page() {
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(false);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [addOpen, setAddOpen] = useState(false);

  async function loadRoster() {
    try {
      setLoading(true);
      const res = await fetch(`/api/exams/enrollments/${id}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setEnrollments(json.enrollments ?? []);
    } catch {
      toast.error("Failed to load roster");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRoster();
  }, [id]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Course Roster</h1>

        <Button
          className="bg-green-600 hover:bg-green-700"
          onClick={() => setAddOpen(true)}
        >
          Add Students
        </Button>
      </div>

      <RosterTable
        loading={loading}
        enrollments={enrollments}
        onRemoved={loadRoster}
      />

      <AddStudentModal
        courseOfferingId={id}
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={loadRoster}
      />
    </div>
  );
}
