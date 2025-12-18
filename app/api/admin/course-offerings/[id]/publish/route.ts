import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { is_published } = await req.json();

    if (typeof is_published !== 'boolean') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // ❗ Check assigned staff FIRST
    const { count: staffCount } = await supabase
      .from('course_offering_staff')
      .select('id', { count: 'exact', head: true })
      .eq('course_offering_id', params.id);

    if (is_published && (staffCount ?? 0) === 0) {
      return NextResponse.json(
        { error: 'Cannot publish without assigned staff' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('course_offerings')
      .update({ is_published })
      .eq('id', params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: 'Failed to update publish status' },
      { status: 500 }
    );
  }
}
