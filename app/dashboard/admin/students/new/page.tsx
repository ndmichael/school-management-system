import CreateStudentClient from "@/components/students/CreateStudentClient";

export default function AdminCreateStudentPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Create Student</h1>
      <p className="text-sm text-gray-600">
        Create a student account from physical form data and send an invite.
      </p>
      <CreateStudentClient />
    </div>
  );
}
