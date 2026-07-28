import SingleSessionRegistrationForm from "@/components/admin/students/SingleSessionRegistrationForm";

export default function SessionRegistrationPage() {
  return (
    <main className="space-y-6 p-6">
      {/* Page introduction */}
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">
          Session Registration
        </h1>

        <p className="mt-1 text-sm text-slate-600">
          Register individual students into an academic session.
        </p>
      </header>

      {/* The bulk-registration workflow will later be added beside this form. */}
      <SingleSessionRegistrationForm />
    </main>
  );
}