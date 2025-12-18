import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type CourseRow = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  credits: number;
  department_id: string | null;
  level: string | null;
  created_at: string;
  updated_at: string;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('id, code, title, description, credits, department_id, level, created_at, updated_at')
      .order('code', { ascending: true })
      .returns<CourseRow[]>();

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (e) {
    console.error('GET /api/admin/courses error:', e);
    return NextResponse.json({ error: 'Failed to load courses' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<{
      code: string;
      title: string;
      description: string;
      credits: number;
      department_id: string;
      level: string;
    }>;

    const code = typeof body.code === 'string' ? body.code.trim() : '';
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const description = typeof body.description === 'string' && body.description.trim()
      ? body.description.trim()
      : null;

    const credits = Number(body.credits);
    const department_id = typeof body.department_id === 'string' && body.department_id ? body.department_id : null;
    const level = typeof body.level === 'string' && body.level.trim() ? body.level.trim() : null;

    if (!code || !title || !Number.isFinite(credits)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
    if (credits < 0 || credits > 30) {
      return NextResponse.json({ error: 'Credits out of range' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('courses')
      .insert({ code, title, description, credits, department_id, level })
      .select('id, code, title, description, credits, department_id, level, created_at, updated_at')
      .single<CourseRow>();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    console.error('POST /api/admin/courses error:', e);
    return NextResponse.json({ error: 'Failed to create course' }, { status: 500 });
  }
}
