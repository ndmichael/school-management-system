import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type Staff = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
};

export default async function AssignStaffPage({
  params,
}: {
  params: { id: string };
}) {
  const offeringId = params.id;

  // Fetch staff
  const { data: staff } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email')
    .eq('main_role', 'academic_staff')
    .order('last_name');

  // Fetch assigned staff
  const { data: assigned } = await supabase
    .from('course_offering_staff')
    .select('staff_profile_id')
    .eq('course_offering_id', offeringId);

  const assignedIds = new Set(
    (assigned ?? []).map(a => a.staff_profile_id)
  );

  async function toggleStaff(formData: FormData) {
    'use server';

    const staffId = formData.get('staff_id') as string;
    const assigned = formData.get('assigned') === 'true';

    if (assigned) {
      await supabase
        .from('course_offering_staff')
        .delete()
        .eq('course_offering_id', offeringId)
        .eq('staff_profile_id', staffId);
    } else {
      await supabase.from('course_offering_staff').insert({
        course_offering_id: offeringId,
        staff_profile_id: staffId,
      });
    }

    redirect(`/dashboard/admin/course-offerings/${offeringId}/assign-staff`);
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Assign Staff</h2>
        <p className="text-sm text-gray-600 mt-1">
          Assign academic staff to this course offering.
        </p>
      </div>

      <div className="bg-white border rounded-xl divide-y">
        {staff?.map(s => {
          const isAssigned = assignedIds.has(s.id);

          return (
            <form
              key={s.id}
              action={toggleStaff}
              className="flex items-center justify-between p-4"
            >
              <input type="hidden" name="staff_id" value={s.id} />
              <input
                type="hidden"
                name="assigned"
                value={String(isAssigned)}
              />

              <div>
                <p className="font-semibold text-gray-900">
                  {s.first_name} {s.last_name}
                </p>
                <p className="text-xs text-gray-600">{s.email}</p>
              </div>

              <button
                type="submit"
                className={`px-4 py-2 rounded-lg font-semibold ${
                  isAssigned
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                {isAssigned ? 'Remove' : 'Assign'}
              </button>
            </form>
          );
        })}
      </div>

      <a
        href="/dashboard/admin/course-offerings"
        className="inline-block text-sm font-semibold text-gray-600 hover:text-gray-800"
      >
        ← Back to Course Offerings
      </a>
    </div>
  );
}
