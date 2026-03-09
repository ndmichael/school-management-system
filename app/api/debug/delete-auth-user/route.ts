// app/api/debug/delete-auth-user/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST() {
  const userId = "2960a273-50a7-4af9-b5eb-85a02e71158c";

  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (error) {
    return NextResponse.json(
      { error: error.message, raw: error },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}