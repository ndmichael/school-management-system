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
  file: unknown | null;
  version?: number;
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

function safeString(v: unknown, max = 300): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  return s.length > max ? s.slice(0, max) : s;
}

function buildObjectPath({
  applicationId,
  kind,
  ext,
}: {
  applicationId: string;
  kind: string;
  ext: string;
}) {
  const ts = Date.now();
  return `applications/${applicationId}/${kind}-${ts}.${ext}`;
}

async function signedUrlFor(file: StoredFile): Promise<string | null> {
  const { data, error } = await supabaseAdmin.storage
    .from(file.bucket)
    .createSignedUrl(file.path, 60 * 30);

  if (error) return null;
  return data?.signedUrl ?? null;
}

async function fileWithUrl(v: unknown): Promise<FileWithUrl | null> {
  const stored = toStoredFile(v);
  if (!stored) return null;
  return { file: stored, url: await signedUrlFor(stored) };
}

async function uploadServerFile({
  file,
  applicationId,
  kind,
  bucket,
}: {
  file: File;
  applicationId: string;
  kind: string;
  bucket: "applications" | "avatars";
}): Promise<StoredFile> {
  const ext = file.name.split(".").pop() ?? "bin";
  const path = buildObjectPath({ applicationId, kind, ext });

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error } = await supabaseAdmin.storage.from(bucket).upload(path, buffer, {
    upsert: true,
    contentType: file.type || undefined,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { bucket, path };
}

async function upsertApplicationDocument({
  applicationId,
  docType,
  file,
  originalName,
  mimeType,
}: {
  applicationId: string;
  docType: string;
  file: StoredFile;
  originalName: string | null;
  mimeType: string | null;
}): Promise<void> {
  const { data: existing, error: existingErr } = await supabaseAdmin
    .from("application_documents")
    .select("id")
    .eq("application_id", applicationId)
    .eq("doc_type", docType)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (existingErr) {
    throw new Error(existingErr.message);
  }

  if (existing?.id) {
    const { error: updateErr } = await supabaseAdmin
      .from("application_documents")
      .update({
        file,
        original_name: originalName,
        mime_type: mimeType,
      })
      .eq("id", existing.id);

    if (updateErr) {
      throw new Error(updateErr.message);
    }

    return;
  }

  const { error: insertErr } = await supabaseAdmin
    .from("application_documents")
    .insert({
      application_id: applicationId,
      doc_type: docType,
      file,
      original_name: originalName,
      mime_type: mimeType,
      version: 1,
    });

  if (insertErr) {
    throw new Error(insertErr.message);
  }
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

    const [passport, signature] = await Promise.all([
      fileWithUrl(application.passport_file),
      fileWithUrl(application.signature_file),
    ]);

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
    const params = ctx.params instanceof Promise ? await ctx.params : ctx.params;

    const id = params.id?.trim();
    if (!id) {
      return NextResponse.json({ error: "Missing application id." }, { status: 400 });
    }

    const contentType = req.headers.get("content-type") ?? "";

    let first_name: string | null = null;
    let middle_name: string | null = null;
    let last_name: string | null = null;
    let email: string | null = null;
    let phone: string | null = null;
    let application_type: string | null = null;
    let class_applied_for: string | null = null;
    let program_id: string | null = null;
    let session_id: string | null = null;

    let passport_file: StoredFile | null = null;
    let signature_file: StoredFile | null = null;

    let academic_result_file: StoredFile | null = null;
    let academic_result_name: string | null = null;
    let academic_result_type: string | null = null;

    let birth_certificate_file: StoredFile | null = null;
    let birth_certificate_name: string | null = null;
    let birth_certificate_type: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();

      first_name = safeString(form.get("first_name"), 80);
      middle_name = safeString(form.get("middle_name"), 80);
      last_name = safeString(form.get("last_name"), 80);

      email = safeString(form.get("email"), 120);
      phone = safeString(form.get("phone"), 40);

      application_type = safeString(form.get("application_type"), 80);
      class_applied_for = safeString(form.get("class_applied_for"), 80);

      program_id = safeString(form.get("program_id"), 80);
      session_id = safeString(form.get("session_id"), 80);

      const passport = form.get("passport_file");
      if (passport instanceof File && passport.size > 0) {
        passport_file = await uploadServerFile({
          file: passport,
          applicationId: id,
          kind: "passport",
          bucket: "avatars",
        });
      }

      const signature = form.get("signature_file");
      if (signature instanceof File && signature.size > 0) {
        signature_file = await uploadServerFile({
          file: signature,
          applicationId: id,
          kind: "signature",
          bucket: "applications",
        });
      }

      const academicResult = form.get("academic_result");
      if (academicResult instanceof File && academicResult.size > 0) {
        academic_result_file = await uploadServerFile({
          file: academicResult,
          applicationId: id,
          kind: "academic_result",
          bucket: "applications",
        });
        academic_result_name = academicResult.name ?? null;
        academic_result_type = academicResult.type ?? null;
      }

      const birthCertificate = form.get("birth_certificate");
      if (birthCertificate instanceof File && birthCertificate.size > 0) {
        birth_certificate_file = await uploadServerFile({
          file: birthCertificate,
          applicationId: id,
          kind: "birth_certificate",
          bucket: "applications",
        });
        birth_certificate_name = birthCertificate.name ?? null;
        birth_certificate_type = birthCertificate.type ?? null;
      }
    } else {
      const body = await req.json();

      first_name = safeString(body.first_name, 80);
      middle_name = safeString(body.middle_name, 80);
      last_name = safeString(body.last_name, 80);

      email = safeString(body.email, 120);
      phone = safeString(body.phone, 40);

      application_type = safeString(body.application_type, 80);
      class_applied_for = safeString(body.class_applied_for, 80);

      program_id = safeString(body.program_id, 80);
      session_id = safeString(body.session_id, 80);

      passport_file = toStoredFile(body.passport_file);
      signature_file = toStoredFile(body.signature_file);
    }

    const { error } = await supabaseAdmin.rpc("update_application_full", {
      p_application_id: id,
      p_first_name: first_name,
      p_middle_name: middle_name,
      p_last_name: last_name,
      p_email: email,
      p_phone: phone,
      p_application_type: application_type,
      p_class_applied_for: class_applied_for,
      p_program_id: program_id,
      p_session_id: session_id,
      p_passport_file: passport_file,
      p_signature_file: signature_file,
      p_academic_result: null,
      p_birth_certificate: null,
    });

    if (error) {
      console.error("PATCH applications error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (academic_result_file) {
      await upsertApplicationDocument({
        applicationId: id,
        docType: "academic_result",
        file: academic_result_file,
        originalName: academic_result_name,
        mimeType: academic_result_type,
      });
    }

    if (birth_certificate_file) {
      await upsertApplicationDocument({
        applicationId: id,
        docType: "birth_certificate",
        file: birth_certificate_file,
        originalName: birth_certificate_name,
        mimeType: birth_certificate_type,
      });
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}