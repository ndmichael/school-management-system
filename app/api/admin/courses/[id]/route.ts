import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ✅ Works in Next 14 (sync params) and Next 15+ (params promise)
type Ctx = { params: { id: string } | Promise<{ id: string }> };

async function getId(ctx: Ctx): Promise<string> {
  const p = await ctx.params;
  return typeof p.id === 'string' ? p.id : '';
}

type UpdateCourseBody = {
  code?: string;
  title?: string;
  description?: string | null;
  credits?: number;
  department_id?: string | null;
};

export async function PUT(req: Request, ctx: Ctx) {
  const id = await getId(ctx);
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const body = (await req.json()) as UpdateCourseBody;

  const code = typeof body.code === 'string' ? body.code.trim() : '';
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const description =
    body.description === null
      ? null
      : typeof body.description === 'string' && body.description.trim()
        ? body.description.trim()
        : null;

  const credits = Number(body.credits);
  const department_id =
    typeof body.department_id === 'string' && body.department_id
      ? body.department_id
      : null;

  if (!code || !title || !Number.isFinite(credits) || credits <= 0) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('courses')
    .update({ code, title, description, credits, department_id })
    .eq('id', id)
    .select('id, code, title, description, credits, department_id, level, created_at, updated_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_: Request, ctx: Ctx) {
  const id = await getId(ctx);
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { error } = await supabase.from('courses').delete().eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
