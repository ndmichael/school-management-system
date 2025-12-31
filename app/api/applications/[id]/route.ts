import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type StoredFile = { bucket: string; path: string };

type ApplicationRow = {
  id: string;
  application_no: string;
  status: "pending" | "accepted" | "rejected";
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
  application_id: string;
  file: unknown;
  doc_type: string | null;
  original_name: string | null;
  mime_type: string | null;
  created_at: string;
};

type FileWithUrl = { file: StoredFile; url: string | null };

type DocumentWithUrl = {
  id: string;
  doc_type: string | null;
  original_name: string | null;
  mime_type: string | null;
  created_at: string;
  file: FileWithUrl | null;
};

type ApplicationDetailsResponse = {
  application: ApplicationRow;
  program: ProgramRow | null;
  session: SessionRow | null;
  department: DepartmentRow | null;
  passport: FileWithUrl | null;
  signature: FileWithUrl | null;
  documents: DocumentWithUrl[];
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function toStoredFile(v: unknown): StoredFile | null {
  if (!isRecord(v)) return null;
  const bucket = v.bucket;
  const path = v.path;
  if (typeof bucket !== "string" || bucket.trim() === "") return null;
  if (typeof path !== "string" || path.trim() === "") return null;
  return { bucket, path };
}

async function fileUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  file: StoredFile
): Promise<string | null> {
  const signed = await supabase.storage.from(file.bucket).createSignedUrl(file.path, 60 * 30);
  if (!signed.error && signed.data?.signedUrl) return signed.data.signedUrl;

  const pub = supabase.storage.from(file.bucket).getPublicUrl(file.path);
  return pub.data?.publicUrl ?? null;
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> } // ✅ IMPORTANT
) {
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ✅ unwrap params Promise
  const { id } = await context.params;

  if (!id || id === "undefined") {
    return NextResponse.json({ error: "Missing application id" }, { status: 400 });
  }
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Invalid application id" }, { status: 400 });
  }

  const { data: app, error: appErr } = await supabase
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

  if (appErr || !app) {
    return NextResponse.json({ error: appErr?.message ?? "Application not found" }, { status: 404 });
  }

  const [programRes, sessionRes, deptRes] = await Promise.all([
    supabase.from("programs").select("id,name,code").eq("id", app.program_id).maybeSingle<ProgramRow>(),
    supabase.from("sessions").select("id,name").eq("id", app.session_id).maybeSingle<SessionRow>(),
    supabase.from("departments").select("id,name").eq("id", app.department_id).maybeSingle<DepartmentRow>(),
  ]);

  const { data: docs } = await supabase
    .from("application_documents")
    .select("id,application_id,file,doc_type,original_name,mime_type,created_at")
    .eq("application_id", id)
    .order("created_at", { ascending: false })
    .returns<ApplicationDocumentRow[]>();

  const passportFile = toStoredFile(app.passport_file);
  const signatureFile = toStoredFile(app.signature_file);

  const [passportUrl, signatureUrl] = await Promise.all([
    passportFile ? fileUrl(supabase, passportFile) : Promise.resolve(null),
    signatureFile ? fileUrl(supabase, signatureFile) : Promise.resolve(null),
  ]);

  const passport: FileWithUrl | null = passportFile ? { file: passportFile, url: passportUrl } : null;
  const signature: FileWithUrl | null = signatureFile ? { file: signatureFile, url: signatureUrl } : null;

  const documents: DocumentWithUrl[] = await Promise.all(
    (docs ?? []).map(async (d) => {
      const f = toStoredFile(d.file);
      const u = f ? await fileUrl(supabase, f) : null;
      return {
        id: d.id,
        doc_type: d.doc_type,
        original_name: d.original_name,
        mime_type: d.mime_type,
        created_at: d.created_at,
        file: f ? { file: f, url: u } : null,
      };
    })
  );

  const payload: ApplicationDetailsResponse = {
    application: app,
    program: programRes.data ?? null,
    session: sessionRes.data ?? null,
    department: deptRes.data ?? null,
    passport,
    signature,
    documents,
  };

  return NextResponse.json(payload);
}
