"use client";

import { Modal } from "@/components/modals/Modal";
import { BookOpen, User, Users } from "lucide-react";

interface EditStudentSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  onSelect: (
    mode: "profile" | "academic" | "guardian",
  ) => void;
}

export function EditStudentSelectModal({
  isOpen,
  onClose,
  onSelect,
}: EditStudentSelectModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Student"
      size="sm"
    >
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => onSelect("profile")}
          className="flex w-full items-center gap-3 rounded-xl border p-4 hover:bg-gray-50"
        >
          <User className="h-5 w-5 text-primary" />
          <span>Edit Profile Information</span>
        </button>

        <button
          type="button"
          onClick={() => onSelect("academic")}
          className="flex w-full items-center gap-3 rounded-xl border p-4 hover:bg-gray-50"
        >
          <BookOpen className="h-5 w-5 text-blue-600" />
          <span>Edit Academic Information</span>
        </button>

        <button
          type="button"
          onClick={() => onSelect("guardian")}
          className="flex w-full items-center gap-3 rounded-xl border p-4 hover:bg-gray-50"
        >
          <Users className="h-5 w-5 text-emerald-600" />
          <span>Edit Guardian Information</span>
        </button>
      </div>
    </Modal>
  );
}