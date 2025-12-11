"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Edit, Eye } from "lucide-react";
import { toast } from "react-toastify";

import { StatCard } from "@/components/shared/StatCard";
import { ViewStudentModal } from "@/components/modals/students/ViewStudentModal";
import { EditProfileModal } from "@/components/modals/students/EditProfileModal";
import { EditAcademicModal } from "@/components/modals/students/EditAcademicModal";
import { EditGuardianModal } from "@/components/modals/students/EditGuardianModal";

import { StudentFull } from "@/types/students";

export default function StudentDetailPage() {
  const { id } = useParams();
  const [student, setStudent] = useState<StudentFull | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showEditAcademic, setShowEditAcademic] = useState(false);
  const [showEditGuardian, setShowEditGuardian] = useState(false);

  async function load() {
    try {
      setLoading(true);

      const res = await fetch(`/api/admin/students/${id}`, {
        cache: "no-store",
      });

      if (!res.ok) throw new Error("Failed to fetch student");

      const json = await res.json();
      setStudent(json.student);
    } catch (err: any) {
      toast.error(err.message || "Error loading student");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return <p className="p-6 text-gray-600">Loading student details...</p>;
  }

  if (!student) {
    return <p className="p-6 text-gray-600">Student not found.</p>;
  }

  const fullName = `${student.profiles?.first_name ?? ""} ${
    student.profiles?.last_name ?? ""
  }`.trim();

  return (
    <>
      {/* ALL MODALS */}
      <ViewStudentModal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        student={student}
      />

      <EditProfileModal
        isOpen={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        profile={student.profiles!}
        studentId={student.id}
        onUpdated={load}
      />

      <EditAcademicModal
        isOpen={showEditAcademic}
        onClose={() => setShowEditAcademic(false)}
        studentId={student.id}
        onUpdated={load}
        academic={{
          program_id: student.programs?.id ?? null,
          department_id: student.departments?.id ?? null,
          course_session_id: student.sessions?.id ?? null,
          level: student.level,
          matric_no: student.matric_no,
          cgpa: student.cgpa ?? null,
          enrollment_date: student.enrollment_date ?? null,
          status: student.status,
        }}
      />

      <EditGuardianModal
        isOpen={showEditGuardian}
        onClose={() => setShowEditGuardian(false)}
        studentId={student.id}
        onUpdated={load}
        guardian={{
          guardian_first_name: student.guardian_first_name,
          guardian_last_name: student.guardian_last_name,
          guardian_phone: student.guardian_phone,
          guardian_status: student.guardian_status,
        }}
      />

      <div className="space-y-10">
        {/* ---------------------------------------------- */}
        {/* HEADER */}
        {/* ---------------------------------------------- */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{fullName}</h1>
            <p className="text-gray-600">
              {student.matric_no} • {student.status ?? "N/A"}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowViewModal(true)}
              className="px-4 py-2 bg-gray-100 rounded-lg text-sm flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              View
            </button>

            <button
              onClick={() => setShowEditProfile(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit Profile
            </button>
          </div>
        </div>

        {/* ---------------------------------------------- */}
        {/* STAT CARDS */}
        {/* ---------------------------------------------- */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Program" value={student.programs?.name ?? "—"} theme="admin" />
          <StatCard label="Department" value={student.departments?.name ?? "—"} theme="info" />
          <StatCard label="Level" value={student.level ?? "—"} theme="warning" />
          <StatCard label="Status" value={student.status ?? "—"} theme="success" />
        </div>

        {/* ---------------------------------------------- */}
        {/* PROFILE INFO */}
        {/* ---------------------------------------------- */}
        <DetailCard
          title="Profile Information"
          onEdit={() => setShowEditProfile(true)}
        >
          <DetailRow label="First Name" value={student.profiles?.first_name} />
          <DetailRow label="Last Name" value={student.profiles?.last_name} />
          <DetailRow label="Email" value={student.profiles?.email} />
          <DetailRow label="Phone" value={student.profiles?.phone} />
          <DetailRow label="Date of Birth" value={student.profiles?.date_of_birth} />
          <DetailRow label="Gender" value={student.profiles?.gender} />
        </DetailCard>

        {/* ---------------------------------------------- */}
        {/* ACADEMIC INFO */}
        {/* ---------------------------------------------- */}
        <DetailCard
          title="Academic Information"
          onEdit={() => setShowEditAcademic(true)}
        >
          <DetailRow label="Matric No" value={student.matric_no} />
          <DetailRow label="Level" value={student.level} />
          <DetailRow label="Program" value={student.programs?.name} />
          <DetailRow label="Department" value={student.departments?.name} />
          <DetailRow label="Session" value={student.sessions?.name} />
          <DetailRow label="Status" value={student.status} />
        </DetailCard>

        {/* ---------------------------------------------- */}
        {/* GUARDIAN INFO */}
        {/* ---------------------------------------------- */}
        <DetailCard
          title="Guardian Information"
          onEdit={() => setShowEditGuardian(true)}
        >
          <DetailRow label="Guardian First Name" value={student.guardian_first_name} />
          <DetailRow label="Guardian Last Name" value={student.guardian_last_name} />
          <DetailRow label="Phone" value={student.guardian_phone} />
          <DetailRow label="Relationship" value={student.guardian_status} />
        </DetailCard>
      </div>
    </>
  );
}

/* ---------------------------------------------- */
/* COMPONENTS */
/* ---------------------------------------------- */

function DetailCard({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <button
          onClick={onEdit}
          className="text-sm px-3 py-1.5 rounded-lg bg-red-600 text-white flex items-center gap-1"
        >
          <Edit className="w-4 h-4" /> Edit
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value || "—"}</span>
    </div>
  );
}
