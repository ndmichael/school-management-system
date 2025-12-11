import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Department Shape
interface Department {
  id: string;
  name: string;
  code: string;
  created_at: string | null;
  updated_at: string | null;
}

// Error Shape
interface ErrorResponse {
  error: string;
}

// ================================
// GET ALL DEPARTMENTS
// ================================
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("departments")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json<ErrorResponse>(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json<{ departments: Department[] }>({
      departments: data ?? [],
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unexpected server error";

    return NextResponse.json<ErrorResponse>(
      { error: message },
      { status: 500 }
    );
  }
}

// ================================
// CREATE NEW DEPARTMENT (OPTIONAL)
// ================================
interface CreateDeptBody {
  name: string;
  code: string;
}

export async function POST(req: Request) {
  try {
    const body: CreateDeptBody = await req.json();
    const { name, code } = body;

    if (!name || !code) {
      return NextResponse.json<ErrorResponse>(
        { error: "Department name and code are required." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("departments")
      .insert({ name, code })
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json<ErrorResponse>(
        { error: error?.message ?? "Failed to create department." },
        { status: 400 }
      );
    }

    return NextResponse.json<{ department: Department }>({
      department: data,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unexpected server error";

    return NextResponse.json<ErrorResponse>(
      { error: message },
      { status: 500 }
    );
  }
}
