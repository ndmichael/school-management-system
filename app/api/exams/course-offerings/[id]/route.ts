import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireExamsAccess } from "@/lib/guards/requireExamsAccess";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireExamsAccess();
  if ("error" in guard) return guard.error;

  const { id } = params;

  const { data, error } = await supabaseAdmin
    .from("course_offerings")
    .select(`
      *,
      courses (*),
      sessions (*),
      enrollments ( count )
    `)
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  return NextResponse.json({ offering: data });
}
