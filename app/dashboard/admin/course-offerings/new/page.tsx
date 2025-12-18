import { createClient } from "@supabase/supabase-js";
import CreateOfferingForm from "./CreateOfferingForm";
import { ArrowLeft, BookOpen } from "lucide-react";

type Course = { id: string; code: string; title: string };
type Session = { id: string; name: string };
type Program = { id: string; name: string };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export default async function NewCourseOfferingPage() {
  const [{ data: courses }, { data: sessions }, { data: programs }] = await Promise.all([
    supabase.from("courses").select("id, code, title").order("code").returns<Course[]>(),
    supabase.from("sessions").select("id, name").order("name").returns<Session[]>(),
    supabase.from("programs").select("id, name").order("name").returns<Program[]>(),
  ]);

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-slate-50/50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Create Course Offering
            </h1>
            <p className="text-base text-slate-600">Attach a course to a session and semester</p>
          </div>

          <a
            href="/dashboard/admin/course-offerings"
            className="group inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition-all hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back
          </a>
        </div>

        {/* Keep your header card styling if you want; the form is now client-side */}
        <div className="overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-xl shadow-slate-100/50">
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Course Details</h2>
                <p className="mt-0.5 text-sm text-slate-600">
                  Fill in the required information to create a new course offering
                </p>
              </div>
            </div>
          </div>

          <CreateOfferingForm
            courses={courses ?? []}
            sessions={sessions ?? []}
            programs={programs ?? []}
          />
        </div>
      </div>
    </div>
  );
}
