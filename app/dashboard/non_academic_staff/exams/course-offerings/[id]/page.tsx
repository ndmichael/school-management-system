"use client";

import { useEffect, useState, type ComponentProps } from "react";
import { useParams } from "next/navigation";
import { toast } from "react-toastify";

import RosterTable from "@/components/exams/roster/RosterTable";
import AddStudentModal from "@/components/exams/roster/AddStudentModal";
import { Button } from "@/components/ui/button";

type Offering = {
  id: string;
  session_id: string;
  level: string | null;
  course_id: string;
};

// ✅ Use the exact type RosterTable expects
type RosterEnrollment = ComponentProps<typeof RosterTable>["enrollments"][number];
type RosterEnrollments = ComponentProps<typeof RosterTable>["enrollments"];

type ApiEnrollment = {
  id: string;
  students: RosterEnrollment["students"] | null; // API may return null
};

type GetRosterResponse = {
  offering: Offering;
  roster: ApiEnrollment[];
  error?: string;
};

export default function CourseOfferingRosterPage() {
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(false);
  const [enrollments, setEnrollments] = useState<RosterEnrollments>([]);
  const [offering, setOffering] = useState<Offering | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  async function loadRoster() {
    try {
      setLoading(true);

      const res = await fetch(`/api/exams/enrollments/${id}`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as GetRosterResponse | null;

      if (!res.ok) {
        throw new Error(json?.error ?? `Failed to load roster (${res.status})`);
      }

      const roster = (json?.roster ?? [])
        .map((e): RosterEnrollment | null => (e.students ? { id: e.id, students: e.students } : null))
        .filter((x): x is RosterEnrollment => x !== null);

      setEnrollments(roster);
      setOffering(json?.offering ?? null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load roster");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) loadRoster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Course Roster</h1>
          {offering ? (
            <p className="text-sm text-gray-600">
              Offering: <span className="font-medium">{offering.id}</span>
              {" • "}
              Session: <span className="font-medium">{offering.session_id}</span>
              {" • "}
              Level: <span className="font-medium">{offering.level ?? "All"}</span>
            </p>
          ) : (
            <p className="text-sm text-gray-600">Loading offering details…</p>
          )}
        </div>

        <Button className="bg-green-600 hover:bg-green-700" onClick={() => setAddOpen(true)}>
          Add Students
        </Button>
      </div>

      {offering && (
        <div className="border rounded-xl p-4 bg-white">
          <h2 className="text-sm font-semibold mb-2">Course Offering Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700">
            <div>
              <span className="text-gray-500">Offering ID:</span>{" "}
              <span className="font-medium">{offering.id}</span>
            </div>
            <div>
              <span className="text-gray-500">Course ID:</span>{" "}
              <span className="font-medium">{offering.course_id}</span>
            </div>
            <div>
              <span className="text-gray-500">Session ID:</span>{" "}
              <span className="font-medium">{offering.session_id}</span>
            </div>
            <div>
              <span className="text-gray-500">Level:</span>{" "}
              <span className="font-medium">{offering.level ?? "All levels"}</span>
            </div>
          </div>
        </div>
      )}

      <RosterTable
        loading={loading}
        enrollments={enrollments}
        onRemoved={loadRoster}
        offeringId={id}
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
