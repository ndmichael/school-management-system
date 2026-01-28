import { NextResponse } from "next/server";
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
  // application_documents doc_type values (you control these)
  if (docType === "academic_result") return "academic_result";
  if (docType === "birth_or_age") return "birth_or_age";
  if (docType === "sponsorship_letter") return "sponsorship_letter";
  if (docType === "supporting_optional") return "supporting_optional";
  return null; // ignore unknown
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: applicationId } = await ctx.params;

  if (!isUuid(applicationId)) {
    return NextResponse.json<ErrorResponse>({ error: "Invalid application id" }, { status: 400 });
  }

  const raw: unknown = await req.json().catch(() => null);
  if (!isRecord(raw)) {
    return NextResponse.json<ErrorResponse>({ error: "Invalid payload" }, { status: 400 });
  }

  const student_id = typeof raw.student_id === "string" ? raw.student_id : "";
  if (!isUuid(student_id)) {
    return NextResponse.json<ErrorResponse>({ error: "Invalid student_id" }, { status: 400 });
  }

  const sponsorship_type: SponsorshipType | null =
    raw.sponsorship_type === null
      ? null
      : isSponsorshipType(raw.sponsorship_type)
      ? raw.sponsorship_type
      : null;

  // 1) Load application (passport/signature)
  const { data: app, error: appErr } = await supabaseAdmin
    .from("applications")
    .select("id, passport_file, signature_file")
    .eq("id", applicationId)
    .single<ApplicationRow>();

  if (appErr || !app) {
    return NextResponse.json<ErrorResponse>(
      { error: appErr?.message ?? "Application not found" },
      { status: 404 }
    );
  }

  // 2) Load application_documents (typed)
  const { data: docs, error: docsErr } = await supabaseAdmin
    .from("application_documents")
    .select("doc_type, file, original_name, mime_type")
    .eq("application_id", applicationId)
    .returns<AppDocRow[]>();

  if (docsErr) {
    return NextResponse.json<ErrorResponse>({ error: docsErr.message }, { status: 500 });
  }

  // 3) Build the final student doc list (including passport/signature)
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

  // 4) Validate policy at conversion time
  const check = validateDocSet(
    mapped.map((m) => m.doc_type),
    sponsorship_type
  );

  if (!check.ok) {
    return NextResponse.json<ErrorResponse>({ error: check.error }, { status: 422 });
  }

  // 5) Update student sponsorship_type (single source of truth)
  const { error: stErr } = await supabaseAdmin
    .from("students")
    .update({ sponsorship_type })
    .eq("id", student_id);

  if (stErr) {
    return NextResponse.json<ErrorResponse>({ error: stErr.message }, { status: 500 });
  }

  // 6) Replace docs by doc_type (clean, deterministic)
  // delete existing doc_types we are writing
  const docTypes = mapped.map((m) => m.doc_type);

  const { error: delErr } = await supabaseAdmin
    .from("student_documents")
    .delete()
    .eq("student_id", student_id)
    .in("doc_type", docTypes);

  if (delErr) {
    return NextResponse.json<ErrorResponse>({ error: delErr.message }, { status: 500 });
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
    return NextResponse.json<ErrorResponse>({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
