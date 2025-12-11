'use client';

import { useEffect, useState } from "react";
import { Modal } from "../Modal";
import { toast } from "react-toastify";

interface Profile {
  first_name: string;
  middle_name: string | null;
  last_name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  nin: string | null;
  address: string | null;
  state_of_origin: string | null;
  lga_of_origin: string | null;
  religion: string | null;
}

interface Props {
  studentId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export function EditProfileModal({ studentId, isOpen, onClose, onUpdated }: Props) {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  // Load profile
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    async function loadProfile() {
      try {
        setLoading(true);

        const res = await fetch(`/api/admin/students/${studentId}/profile`, {
          cache: "no-store",
        });

        if (!res.ok) {
          const { error } = await res.json().catch(() => ({ error: "Failed to load profile" }));
          throw new Error(error);
        }

        const { profile } = await res.json();

        if (isMounted) setProfile(profile);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [isOpen, studentId]);

  async function save() {
    if (!profile) return;
    try {
      setLoading(true);

      const res = await fetch(`/api/admin/students/${studentId}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });

      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Failed to update profile" }));
        throw new Error(error);
      }

      toast.success("Profile updated");
      onUpdated();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Profile" size="lg">
      {!profile ? (
        <p className="text-gray-600">Loading...</p>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">First Name</label>
            <input
              className="w-full mt-1 p-2 border rounded"
              value={profile.first_name}
              onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Last Name</label>
            <input
              className="w-full mt-1 p-2 border rounded"
              value={profile.last_name}
              onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Phone</label>
            <input
              className="w-full mt-1 p-2 border rounded"
              value={profile.phone ?? ""}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            />
          </div>

          <button
            onClick={save}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}
    </Modal>
  );
}
