import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Program = {
  id: string;
  name: string;
};

type ErrorResponse = { error: string };

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("programs")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json<ErrorResponse>({ error: error.message }, { status: 400 });
    }

    return NextResponse.json<{ programs: Program[] }>({
      programs: (data ?? []) as Program[],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected server error";
    return NextResponse.json<ErrorResponse>({ error: message }, { status: 500 });
  }
}
