import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type ProfileRow = {
  id: string;
  email: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  main_role: 'admin' | 'student' | 'academic_staff' | 'non_academic_staff';
};

type StaffRow = {
  profile_id: string;
  staff_id: string;
  status: string | null;
  designation: string | null;
  profiles: ProfileRow;
};

type StaffOption = {
  profile_id: string;
  staff_id: string;
  name: string;
  email: string;
  designation: string | null;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function fullName(p: ProfileRow): string {
  return [p.first_name, p.middle_name, p.last_name]
    .filter(Boolean)
    .join(' ');
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('staff')
      .select(`
        profile_id,
        staff_id,
        status,
        designation,
        profiles!inner (
          id,
          email,
          first_name,
          middle_name,
          last_name,
          main_role
        )
      `)
      .eq('status', 'active')
      .eq('profiles.main_role', 'academic_staff')
      .order('staff_id', { ascending: true })
      .returns<StaffRow[]>();

    if (error) throw error;

    const result: StaffOption[] = (data ?? []).map((s) => ({
      profile_id: s.profile_id,
      staff_id: s.staff_id,
      name: fullName(s.profiles),
      email: s.profiles.email,
      designation: s.designation,
    }));

    return NextResponse.json(result);
  } catch (e) {
    console.error('academic staff list error:', e);
    return NextResponse.json(
      { error: 'Failed to load academic staff' },
      { status: 500 }
    );
  }
}
