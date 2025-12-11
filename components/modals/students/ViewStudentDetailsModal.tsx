"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/modals/Modal";
import { toast } from "react-toastify";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
}

interface StudentDetail {
  id: string;
  matric_no: string;
  level: string | null;
  status: string | null;

  profiles: {
    first_name: string;
    middle_name: string | null;
    last_name: string;
    email: string;
  } | null;

  programs: { name: string | null } | null;
  departments: { name: string | null } | null;
  sessions: { name: string | null } | null;

  guardian_first_name: string | null;
  guardian_last_name: string | null;
  guardian_phone: string | null;
  guardian_status: string | null;

  created_at: string;
}

export function ViewStudentDetailsModal({ isOpen, onClose, studentId }: Props) {
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;

    async function load() {
      try {
        setLoading(true);

        const res = await fetch(`/api/admin/students/${studentId}`);
        if (!res.ok) throw new Error("Failed to load student details");

        const json = await res.json();
        if (active) setStudent(json.student);
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [isOpen, studentId]);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Student Details" size="lg">
      {loading || !student ? (
        <p>Loading...</p>
      ) : (
        <div className="space-y-6 text-sm">

          {/* Profile Info */}
          <section>
            <h3 className="font-semibold mb-2">Profile Information</h3>
            <div className="grid grid-cols-2 gap-3">
              <Detail label="First Name" value={student.profiles?.first_name} />
              <Detail label="Last Name" value={student.profiles?.last_name} />
              <Detail label="Email" value={student.profiles?.email} />
            </div>
          </section>

          {/* Academic Info */}
          <section>
            <h3 className="font-semibold mb-2">Academic Information</h3>
            <div className="grid grid-cols-2 gap-3">
              <Detail label="Matric No" value={student.matric_no} />
              <Detail label="Level" value={student.level} />
              <Detail label="Program" value={student.programs?.name} />
              <Detail label="Department" value={student.departments?.name} />
              <Detail label="Session" value={student.sessions?.name} />
              <Detail label="Status" value={student.status} />
            </div>
          </section>

          {/* Guardian Info */}
          <section>
            <h3 className="font-semibold mb-2">Guardian Information</h3>
            <div className="grid grid-cols-2 gap-3">
              <Detail label="First Name" value={student.guardian_first_name} />
              <Detail label="Last Name" value={student.guardian_last_name} />
              <Detail label="Phone" value={student.guardian_phone} />
              <Detail label="Relationship" value={student.guardian_status} />
            </div>
          </section>
        </div>
      )}
    </Modal>
  );
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <p>
      <span className="font-medium">{label}: </span>
      {value || "—"}
    </p>
  );
}
