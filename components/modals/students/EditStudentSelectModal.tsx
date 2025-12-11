"use client";

import { Modal } from "@/components/modals/Modal";
import { User, BookOpen, Users } from "lucide-react";

interface EditStudentSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  onSelect: (mode: "profile" | "academic" | "guardian") => void;
}

export function EditStudentSelectModal({
  isOpen,
  onClose,
  onSelect,
}: EditStudentSelectModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Student" size="sm">
      <div className="space-y-4">
        <button
          onClick={() => onSelect("profile")}
          className="w-full flex items-center gap-3 p-4 border rounded-xl hover:bg-gray-50"
        >
          <User className="w-5 h-5 text-primary" />
          <span>Edit Profile Information</span>
        </button>

        <button
          onClick={() => onSelect("academic")}
          className="w-full flex items-center gap-3 p-4 border rounded-xl hover:bg-gray-50"
        >
          <BookOpen className="w-5 h-5 text-blue-600" />
          <span>Edit Academic Information</span>
        </button>

        <button
          onClick={() => onSelect("guardian")}
          className="w-full flex items-center gap-3 p-4 border rounded-xl hover:bg-gray-50"
        >
          <Users className="w-5 h-5 text-emerald-600" />
          <span>Edit Guardian Information</span>
        </button>
      </div>
    </Modal>
  );
}
