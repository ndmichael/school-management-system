"use client";

import { useEffect, useState, useMemo } from "react";
import { toPublicImageSrc } from "@/lib/storage-images";
import { createClient } from "@/lib/supabase/client";

import { Modal } from "../Modal";
import Image from "next/image";
import { toast } from "react-toastify";

interface ViewStaffDetailsModalProps {
  isOpen: boolean;
  staffId: string;
  onClose: () => void;
}

type StaffDetails = {
  staff_id: string;
  status: string;
  designation: string | null;
  specialization: string | null;
  departments: { name: string | null } | null;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    email: string;
    phone: string | null;
    avatar_file: { bucket: string; path: string } | null;
  } | null; // ✅ make nullable to match usage
};

export function ViewStaffDetailsModal({
  isOpen,
  staffId,
  onClose,
}: ViewStaffDetailsModalProps) {
  const supabase = useMemo(() => createClient(), []);
  const [staff, setStaff] = useState<StaffDetails | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!staffId || !isOpen) return;

    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/staff/${staffId}`);
        const json = (await res.json()) as { staff?: StaffDetails; error?: string };

        if (!res.ok) throw new Error(json.error || "Failed to load staff");

        setStaff(json.staff ?? null);
      } catch (error) {
        console.error(error);
        toast.error("Unable to load staff details");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [staffId, isOpen]);

  if (!isOpen) return null;

  return (
    <Modal title="Staff Details" isOpen={isOpen} onClose={onClose} size="lg">
      {loading || !staff ? (
        <div className="py-12 text-center text-gray-500 animate-pulse">
          Loading staff details…
        </div>
      ) : (
        <div className="space-y-8">
          {/* Avatar & Name */}
          <div className="flex flex-col justify-center items-center text-center gap-4">
            <div className="relative w-28 h-28 rounded-full overflow-hidden shadow-md bg-gray-100">
              <Image
                src={toPublicImageSrc(
                  supabase,
                  staff.profiles?.avatar_file,
                  "/avatar.png"
                )}
                fill
                alt="Staff Photo"
                className="object-cover"
              />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {staff.profiles?.first_name ?? ""} {staff.profiles?.last_name ?? ""}
              </h2>
              <p className="text-gray-500 font-medium">{staff.staff_id}</p>
            </div>
          </div>

          <div className="border-t pt-6"></div>

          {/* Information Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
            <Info label="Email" value={staff.profiles?.email} />
            <Info label="Phone" value={staff.profiles?.phone} />
            <Info label="Department" value={staff.departments?.name} />
            <Info label="Designation" value={staff.designation} />
            <Info label="Specialization" value={staff.specialization} />
            <StatusBadge status={staff.status} />
          </div>

          <div className="border-t pt-6"></div>

          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition"
          >
            Close
          </button>
        </div>
      )}
    </Modal>
  );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="space-y-1">
      <p className="text-gray-500 font-medium">{label}</p>
      <p className="font-semibold text-gray-900">{value ?? "—"}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles =
    status === "active"
      ? "bg-green-100 text-green-700"
      : "bg-gray-200 text-gray-700";

  return (
    <div className="space-y-1">
      <p className="text-gray-500 font-medium">Status</p>
      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${styles}`}>
        {status}
      </span>
    </div>
  );
}
