// app/api/applications/[id]/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Json = Record<string, unknown>;

type StoredFile = { bucket: string; path: string };
type FileWithUrl = { file: StoredFile; url: string | null };

type ApplicationRow = {
  id: string;
  application_no: string;
  status: "pending" | "accepted" | "rejected" | string;
  created_at: string;

  first_name: string;
  middle_name: string | null;
  last_name: string;

  email: string;
  phone: string | null;

  application_type: string | null;

  program_id: string;
  session_id: string;
  department_id: string;

  class_applied_for: string;

  passport_file: unknown | null;
  signature_file: unknown | null;
};

type ProgramRow = { id: string; name: string; code: string };
type SessionRow = { id: string; name: string };
type DepartmentRow = { id: string; name: string };

type ApplicationDocumentRow = {
  id: string;
  doc_type: string | null;
  original_name: string | null;
  mime_type: string | null;
  created_at: string;
  file: unknown | null; // jsonb
};

type DocumentWithUrl = {
  id: string;
  doc_type: string | null;
  original_name: string | null;
  mime_type: string | null;
  created_at: string;
  file: FileWithUrl | null;
};

type DetailsResponse = {
  application: ApplicationRow;
  program: ProgramRow | null;
  session: SessionRow | null;
  department: DepartmentRow | null;
  passport: FileWithUrl | null;
  signature: FileWithUrl | null;
  documents: DocumentWithUrl[];
};

type UpdatePayload = Partial<
  Pick<
    ApplicationRow,
    | "first_name"
    | "middle_name"
    | "last_name"
    | "email"
    | "phone"
    | "application_type"
    | "class_applied_for"
    | "program_id"
    | "session_id"
    | "passport_file"
    | "signature_file"
  >
> & {
  edit_reason: string;
};

function isObject(v: unknown): v is Json {
  return typeof v === "object" && v !== null;
}

function toStoredFile(v: unknown): StoredFile | null {
  if (!isObject(v)) return null;

  const bucket = typeof v.bucket === "string" ? v.bucket : "";
  const path = typeof v.path === "string" ? v.path : "";

  if (!bucket || !path) return null;
  return { bucket, path };
}

async function signedUrlFor(file: StoredFile): Promise<string | null> {
  const { data, error } = await supabaseAdmin.storage
    .from(file.bucket)
    .createSignedUrl(file.path, 60 * 30); // 30 mins

  if (error) return null;
  return data?.signedUrl ?? null;
}

async function fileWithUrl(v: unknown): Promise<FileWithUrl | null> {
  const stored = toStoredFile(v);
  if (!stored) return null;
  return { file: stored, url: await signedUrlFor(stored) };
}

type RouteParams = { id: string };

export async function GET(
  _req: Request,
  ctx: { params: Promise<RouteParams> | RouteParams }
): Promise<NextResponse> {
  try {
    const params: RouteParams =
      ctx.params instanceof Promise ? await ctx.params : ctx.params;

    const id = params.id?.trim();
    if (!id) {
      return NextResponse.json({ error: "Missing application id." }, { status: 400 });
    }

    // 1) application
    const { data: application, error: appErr } = await supabaseAdmin
      .from("applications")
      .select(
        `
          id,
          application_no,
          status,
          created_at,
          first_name,
          middle_name,
          last_name,
          email,
          phone,
          application_type,
          program_id,
          session_id,
          department_id,
          class_applied_for,
          passport_file,
          signature_file
        `
      )
      .eq("id", id)
      .single<ApplicationRow>();

    if (appErr || !application) {
      return NextResponse.json(
        { error: appErr?.message ?? "Application not found." },
        { status: 404 }
      );
    }

    // 2) lookups (optional)
    const [programRes, sessionRes, departmentRes] = await Promise.all([
      supabaseAdmin
        .from("programs")
        .select("id,name,code")
        .eq("id", application.program_id)
        .maybeSingle<ProgramRow>(),
      supabaseAdmin
        .from("sessions")
        .select("id,name")
        .eq("id", application.session_id)
        .maybeSingle<SessionRow>(),
      supabaseAdmin
        .from("departments")
        .select("id,name")
        .eq("id", application.department_id)
        .maybeSingle<DepartmentRow>(),
    ]);

    // 3) passport/signature
    const [passport, signature] = await Promise.all([
      fileWithUrl(application.passport_file),
      fileWithUrl(application.signature_file),
    ]);

    // 4) supporting docs (application_documents)
    const { data: docs, error: docsErr } = await supabaseAdmin
      .from("application_documents")
      .select("id, doc_type, original_name, mime_type, created_at, file, version")
      .eq("application_id", id)
      .order("doc_type")
      .order("version", { ascending: false })
      .returns<(ApplicationDocumentRow & { version: number })[]>();

    if (docsErr) {
      return NextResponse.json({ error: docsErr.message }, { status: 400 });
    }

    const latestDocs = new Map<string, ApplicationDocumentRow>();

    for (const d of docs ?? []) {
      if (!d.doc_type) continue;
      if (!latestDocs.has(d.doc_type)) {
        latestDocs.set(d.doc_type, d);
      }
    }

    const documents: DocumentWithUrl[] = await Promise.all(
      Array.from(latestDocs.values()).map(async (d): Promise<DocumentWithUrl> => ({
        id: d.id,
        doc_type: d.doc_type,
        original_name: d.original_name,
        mime_type: d.mime_type,
        created_at: d.created_at,
        file: await fileWithUrl(d.file),
      }))
    );

    const payload: DetailsResponse = {
      application,
      program: programRes.data ?? null,
      session: sessionRes.data ?? null,
      department: departmentRes.data ?? null,
      passport,
      signature,
      documents,
    };

    return NextResponse.json(payload);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}


export async function PATCH(
  req: Request,
  ctx: { params: Promise<RouteParams> | RouteParams }
): Promise<NextResponse> {
  try {
    const params =
      ctx.params instanceof Promise ? await ctx.params : ctx.params;

    const id = params.id?.trim();
    if (!id) {
      return NextResponse.json({ error: "Missing application id." }, { status: 400 });
    }

    const body = await req.json();

    const { error } = await supabaseAdmin.rpc("update_application_full", {
      p_application_id: id,
      p_first_name: body.first_name,
      p_middle_name: body.middle_name,
      p_last_name: body.last_name,
      p_email: body.email,
      p_phone: body.phone,
      p_application_type: body.application_type,
      p_class_applied_for: body.class_applied_for,
      p_program_id: body.program_id,
      p_session_id: body.session_id,
      p_passport_file: body.passport_file ?? null,
      p_signature_file: body.signature_file ?? null,
      p_academic_result: body.academic_result ?? null,
      p_birth_certificate: body.birth_certificate ?? null,
    });

    if (error) {
      console.error("PATCH applications error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}