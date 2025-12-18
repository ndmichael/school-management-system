import { createClient } from '@supabase/supabase-js';
import CoursesClient from './courses-client';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type DepartmentOption = { id: string; name: string };

export const dynamic = 'force-dynamic';

export default async function AdminCoursesPage() {
  const [{ data: departments }] = await Promise.all([
    supabase.from('departments').select('id, name').order('name'),
  ]);

  return (
    <CoursesClient
      departments={(departments ?? []) as DepartmentOption[]}
    />
  );
}
