import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type PatchBody = {
  publish: boolean; // true => publish, false => unpublish
};

type ErrorResponse = { error: string };
type SuccessResponse = { id: string; is_published: boolean };

function isUuid(v: string): boolean {
  // simple UUID v4-ish validation (good enough for routing safety)
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function isPatchBody(v: unknown): v is PatchBody {
  return typeof v === "object" && v !== null && "publish" in v && typeof (v as { publish?: unknown }).publish === "boolean";
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  if (!isUuid(id)) {
    return NextResponse.json<ErrorResponse>({ error: "Invalid offering id" }, { status: 400 });
  }

  let raw: unknown;
  try {
    raw = (await req.json()) as unknown;
  } catch {
    return NextResponse.json<ErrorResponse>({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isPatchBody(raw)) {
    return NextResponse.json<ErrorResponse>(
      { error: "Body must be: { publish: boolean }" },
      { status: 422 },
    );
  }

  const publish = raw.publish;

  const { data, error } = await supabaseAdmin
    .from("course_offerings")
    .update({
      is_published: publish,
      // optional: if you later add published_at column, set it here.
      // published_at: publish ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .select("id, is_published")
    .single();

  if (error) {
    return NextResponse.json<ErrorResponse>(
      { error: error.message || "Failed to update publish state" },
      { status: 500 },
    );
  }

  return NextResponse.json<SuccessResponse>(
    { id: data.id, is_published: data.is_published },
    { status: 200 },
  );
}
