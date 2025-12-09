import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from("programs")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    console.error("Supabase programs error:", error);
    return NextResponse.json(
      { error: "Failed to load programs" },
      { status: 500 }
    );
  }

  return NextResponse.json(data ?? []);
}
