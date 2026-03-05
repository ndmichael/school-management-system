import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  validateDocSet,
  type SponsorshipType,
  type StudentDocType,
} from "@/lib/documents/policy";

type ErrorResponse = { error: string };

type FileRef = { bucket: string; path: string };

type ApplicationRow = {
  id: string;
  passport_file: FileRef;
  signature_file: FileRef;
  status: string;
};

type AppDocRow = {
  doc_type: string;
  file: FileRef;
  original_name: string | null;
  mime_type: string | null;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function isSponsorshipType(v: unknown): v is SponsorshipType {
  return v === "government" || v === "school_owner" || v === "external_body";
}

function mapAppDocTypeToStudentDocType(docType: string): StudentDocType | null {
  if (docType === "academic_result") return "academic_result";
  if (docType === "birth_or_age") return "birth_or_age";
  if (docType === "sponsorship_letter") return "sponsorship_letter";
  if (docType === "supporting_optional") return "supporting_optional";
  return null;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: applicationId } = await ctx.params;

  if (!isUuid(applicationId)) {
    return NextResponse.json<ErrorResponse>(
      { error: "Invalid application id" },
      { status: 400 }
    );
  }

  // ------------------------------------------------------------------
  // AUTHENTICATE USER (Modern Supabase SSR pattern)
  // ------------------------------------------------------------------

const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {
          // not needed in route handlers
        },
        remove() {
          // not needed in route handlers
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // ------------------------------------------------------------------
  // AUTHORIZE ROLE
  // ------------------------------------------------------------------
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from("profiles")
    .select("main_role, unit")
    .eq("id", user.id)
    .single();

  if (profileErr || !profile) {
    return NextResponse.json(
      { error: "Profile not found" },
      { status: 403 }
    );
  }

  const authorized =
    profile.main_role === "admin" ||
    (profile.main_role === "non_academic_staff" &&
      profile.unit === "admissions");

  if (!authorized) {
    return NextResponse.json(
      { error: "Not authorized to convert applications" },
      { status: 403 }
    );
  }

  // ------------------------------------------------------------------
  // LOAD APPLICATION
  // ------------------------------------------------------------------
  const { data: app, error: appErr } = await supabaseAdmin
    .from("applications")
    .select("id, passport_file, signature_file, status")
    .eq("id", applicationId)
    .single<ApplicationRow>();

  if (appErr || !app) {
    return NextResponse.json(
      { error: appErr?.message ?? "Application not found" },
      { status: 404 }
    );
  }

  if (app.status === "converted") {
    return NextResponse.json(
      { error: "Application already converted" },
      { status: 400 }
    );
  }

  if (app.status !== "accepted") {
    return NextResponse.json(
      { error: "Application must be accepted before conversion" },
      { status: 400 }
    );
  }

  // ------------------------------------------------------------------
  // VALIDATE REQUEST BODY
  // ------------------------------------------------------------------
  const raw: unknown = await req.json().catch(() => null);

  if (!isRecord(raw)) {
    return NextResponse.json(
      { error: "Invalid payload" },
      { status: 400 }
    );
  }

  const student_id =
    typeof raw.student_id === "string" ? raw.student_id : "";

  if (!isUuid(student_id)) {
    return NextResponse.json(
      { error: "Invalid student_id" },
      { status: 400 }
    );
  }

  const sponsorship_type: SponsorshipType | null =
    raw.sponsorship_type === null
      ? null
      : isSponsorshipType(raw.sponsorship_type)
      ? raw.sponsorship_type
      : null;

  // ------------------------------------------------------------------
  // LOAD APPLICATION DOCUMENTS
  // ------------------------------------------------------------------
  const { data: docs, error: docsErr } = await supabaseAdmin
    .from("application_documents")
    .select("doc_type, file, original_name, mime_type")
    .eq("application_id", applicationId)
    .returns<AppDocRow[]>();

  if (docsErr) {
    return NextResponse.json(
      { error: docsErr.message },
      { status: 500 }
    );
  }

  const mapped: {
    doc_type: StudentDocType;
    file: FileRef;
    original_name: string | null;
    mime_type: string | null;
  }[] = [];

  mapped.push({
    doc_type: "passport",
    file: app.passport_file,
    original_name: "passport",
    mime_type: null,
  });

  mapped.push({
    doc_type: "signature",
    file: app.signature_file,
    original_name: "signature",
    mime_type: null,
  });

  for (const d of docs ?? []) {
    const t = mapAppDocTypeToStudentDocType(d.doc_type);
    if (!t) continue;

    mapped.push({
      doc_type: t,
      file: d.file,
      original_name: d.original_name ?? null,
      mime_type: d.mime_type ?? null,
    });
  }

  const check = validateDocSet(
    mapped.map((m) => m.doc_type),
    sponsorship_type
  );

  if (!check.ok) {
    return NextResponse.json(
      { error: check.error },
      { status: 422 }
    );
  }

  // ------------------------------------------------------------------
  // UPDATE STUDENT
  // ------------------------------------------------------------------
  const { error: stErr } = await supabaseAdmin
    .from("students")
    .update({ sponsorship_type })
    .eq("id", student_id);

  if (stErr) {
    return NextResponse.json(
      { error: stErr.message },
      { status: 500 }
    );
  }

  // ------------------------------------------------------------------
  // REPLACE STUDENT DOCUMENTS
  // ------------------------------------------------------------------
  const docTypes = mapped.map((m) => m.doc_type);

  const { error: delErr } = await supabaseAdmin
    .from("student_documents")
    .delete()
    .eq("student_id", student_id)
    .in("doc_type", docTypes);

  if (delErr) {
    return NextResponse.json(
      { error: delErr.message },
      { status: 500 }
    );
  }

  const insertRows = mapped.map((m) => ({
    student_id,
    doc_type: m.doc_type,
    file: m.file,
    original_name: m.original_name,
    mime_type: m.mime_type,
  }));

  const { error: insErr } = await supabaseAdmin
    .from("student_documents")
    .insert(insertRows);

  if (insErr) {
    return NextResponse.json(
      { error: insErr.message },
      { status: 500 }
    );
  }

  // ------------------------------------------------------------------
  // MARK APPLICATION AS CONVERTED
  // ------------------------------------------------------------------
  const { error: lockErr } = await supabaseAdmin
    .from("applications")
    .update({
      status: "converted",
      converted_by: user.id,
      converted_at: new Date().toISOString(),
    })
    .eq("id", applicationId);

  if (lockErr) {
    return NextResponse.json(
      { error: lockErr.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}