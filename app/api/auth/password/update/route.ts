import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Mode = "set" | "reset";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  return null;
}

export async function POST(req: Request) {
  const body: unknown = await req.json().catch(() => null);

  if (!isRecord(body)) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const password = typeof body.password === "string" ? body.password : "";
  const mode = body.mode === "set" || body.mode === "reset" ? (body.mode as Mode) : null;

  if (!mode) {
    return NextResponse.json({ error: "Invalid password update mode." }, { status: 400 });
  }

  const passwordError = validatePassword(password);

  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) {
    return NextResponse.json({ error: userErr.message }, { status: 401 });
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { error: updateErr } = await supabase.auth.updateUser({
    password,
  });

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 400 });
  }

  if (mode === "set") {
    const { error: onboardingErr } = await supabase
      .from("profiles")
      .update({
        onboarding_status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (onboardingErr) {
      return NextResponse.json({ error: onboardingErr.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}