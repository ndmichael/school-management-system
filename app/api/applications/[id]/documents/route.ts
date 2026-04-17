import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type RouteParams = { id: string };
type JsonRecord = Record<string, unknown>;
type StoredFile = { bucket: string; path: string };

function isRecord(v: unknown): v is JsonRecord {
  return typeof v === "object" && v !== null;
}

function strTrim(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t : null;
}

function isFileRef(v: unknown): v is { bucket: string; path: string } {
  return (
    isRecord(v) &&
    typeof v.bucket === "string" &&
    v.bucket.trim().length > 0 &&
    typeof v.path === "string" &&
    v.path.trim().length > 0
  );
}

function isoNow(): string {
  return new Date().toISOString();
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

  if (error) throw new Error(error.message);

  return { bucket, path };
}

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<RouteParams> | RouteParams }
): Promise<NextResponse> {
  try {
    const params = ctx.params instanceof Promise ? await ctx.params : ctx.params;
    const id = params.id?.trim();

    if (!id) {
      return NextResponse.json({ error: "Missing application id." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("application_documents")
      .select("*")
      .eq("application_id", id)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ documents: data ?? [] });
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

    const { data: appRow, error: appErr } = await supabaseAdmin
      .from("applications")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (appErr) {
      return NextResponse.json({ error: appErr.message }, { status: 400 });
    }

    if (!appRow) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    const contentType = req.headers.get("content-type") ?? "";

    let doc_type: string | null = null;
    let original_name: string | null = null;
    let mime_type: string | null = null;
    let file: StoredFile | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();

      doc_type = strTrim(form.get("doc_type"));

      const uploaded = form.get("file");
      if (uploaded instanceof File && uploaded.size > 0) {
        file = await uploadServerFile({
          file: uploaded,
          applicationId: id,
          kind: doc_type ?? "document",
          bucket: "applications",
        });
        original_name = uploaded.name ?? null;
        mime_type = uploaded.type ?? null;
      }
    } else {
      const body: unknown = await req.json();
      if (!isRecord(body)) {
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
      }

      doc_type = strTrim(body.doc_type);
      original_name = strTrim(body.original_name);
      mime_type = strTrim(body.mime_type);

      if (isFileRef(body.file)) {
        file = body.file;
      }
    }

    if (!doc_type) {
      return NextResponse.json({ error: "doc_type is required." }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json(
        { error: "file must contain valid bucket and path." },
        { status: 400 }
      );
    }

    const { data: existing, error: existingErr } = await supabaseAdmin
      .from("application_documents")
      .select("id")
      .eq("application_id", id)
      .eq("doc_type", doc_type)
      .maybeSingle<{ id: string }>();

    if (existingErr) {
      return NextResponse.json({ error: existingErr.message }, { status: 400 });
    }

    if (existing?.id) {
      const { data: updated, error: updateErr } = await supabaseAdmin
        .from("application_documents")
        .update({
          file,
          original_name,
          mime_type,
          updated_at: isoNow(),
        })
        .eq("id", existing.id)
        .select("*")
        .single();

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, document: updated });
    }

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("application_documents")
      .insert({
        application_id: id,
        doc_type,
        file,
        original_name,
        mime_type,
        created_at: isoNow(),
        updated_at: isoNow(),
      })
      .select("*")
      .single();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, document: inserted });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}