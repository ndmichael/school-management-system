"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type StoredFile = { bucket: string; path: string };
type FileWithUrl = { file: StoredFile; url: string | null };

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

function formatDateTime(value?: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString();
}

function fileExt(path: string): string {
  const i = path.lastIndexOf(".");
  return i >= 0 ? path.slice(i + 1).toLowerCase() : "";
}

function isImage(mimeType: string | null | undefined, path: string): boolean {
  if (mimeType?.startsWith("image/")) return true;
  const ext = fileExt(path);
  return ["png", "jpg", "jpeg", "webp", "gif"].includes(ext);
}

function isPdf(mimeType: string | null | undefined, path: string): boolean {
  if (mimeType === "application/pdf") return true;
  return fileExt(path) === "pdf";
}

function FilePreview({
  label,
  mimeType,
  file,
}: {
  label: string;
  mimeType?: string | null;
  file: FileWithUrl | null;
}) {
  if (!file) {
    return (
      <div className="rounded-lg border p-4 bg-white">
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-sm text-gray-500 mt-2">—</div>
      </div>
    );
  }

  const path = file.file.path;
  const url = file.url;

  return (
    <div className="rounded-lg border p-4 bg-white space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{label}</div>
          <div className="text-xs text-gray-500 font-mono">
            {file.file.bucket}/{file.file.path}
          </div>
        </div>

        {url ? (
          <a
            className="px-3 py-1 text-xs rounded bg-gray-900 text-white hover:bg-gray-800"
            href={url}
            target="_blank"
            rel="noreferrer"
          >
            Open
          </a>
        ) : (
          <span className="px-3 py-1 text-xs rounded border bg-gray-50 text-gray-600">
            No link
          </span>
        )}
      </div>

      {url ? (
        isImage(mimeType ?? null, path) ? (
          <div className="relative w-full h-[420px] rounded-md border bg-gray-50 overflow-hidden">
            <Image
              src={url}
              alt={label}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-contain"
            />
          </div>
        ) : isPdf(mimeType ?? null, path) ? (
          <iframe
            src={url}
            title={label}
            className="w-full h-[520px] rounded-md border bg-white"
          />
        ) : (
          <div className="text-sm text-gray-700">
            Preview not available. Use <span className="font-semibold">Open</span> to view/download.
          </div>
        )
      ) : (
        <div className="text-sm text-gray-700">Could not generate a view URL for this file.</div>
      )}
    </div>
  );
}

export default function ApplicationDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id?: string | string[] }>();

  const idRaw = params?.id;
  const id = Array.isArray(idRaw) ? idRaw[0] : idRaw;

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DetailsResponse | null>(null);

  const fullName = useMemo(() => {
    if (!data) return "";
    const a = data.application;
    return [a.first_name, a.middle_name, a.last_name].filter(Boolean).join(" ");
  }, [data]);

  useEffect(() => {
    if (!id) {
      setError("Missing application id.");
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    (async () => {
      // ✅ yield once so React doesn't warn about sync setState in effect
      await Promise.resolve();
      if (controller.signal.aborted) return;

      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/applications/${id}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        const json = (await res.json().catch(() => ({}))) as Partial<DetailsResponse> & {
          error?: string;
        };

        if (!res.ok) throw new Error(json.error ?? "Failed to load application details.");

        if (controller.signal.aborted) return;
        setData(json as DetailsResponse);
      } catch (e) {
        if (controller.signal.aborted) return;
        setData(null);
        setError(e instanceof Error ? e.message : "Unexpected error");
      } finally {
        if (controller.signal.aborted) return;
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [id]);

  if (loading) {
    return (
      <main className="p-6 max-w-5xl">
        <div className="rounded-lg border bg-white p-5 text-sm text-gray-600">
          Loading application details...
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="p-6 max-w-5xl space-y-4">
        <div className="rounded-lg border bg-white p-5">
          <div className="text-sm font-semibold text-red-700">Could not load application</div>
          <div className="text-sm text-gray-700 mt-2">{error ?? "Unknown error"}</div>

          <button
            onClick={() => router.push("/dashboard/admin/applications")}
            className="mt-4 px-3 py-1.5 text-sm rounded bg-gray-900 text-white hover:bg-gray-800"
          >
            Back
          </button>
        </div>
      </main>
    );
  }

  const a = data.application;

  return (
    <main className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Application Details</h1>
          <p className="text-sm text-gray-600 font-mono">{a.application_no}</p>
          <p className="text-xs text-gray-500 mt-1">Submitted: {formatDateTime(a.created_at)}</p>
        </div>

        <button
          onClick={() => router.push("/dashboard/admin/applications")}
          className="px-3 py-1 text-sm rounded border bg-white hover:bg-gray-50"
        >
          Back
        </button>
      </div>

      <section className="border rounded-lg bg-white p-5 space-y-3">
        <div className="text-lg font-semibold">{fullName}</div>
        <div className="text-sm text-gray-600">
          {a.email}
          {a.phone ? ` · ${a.phone}` : ""}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 text-sm">
          <div>
            <span className="text-gray-500">Status:</span>{" "}
            <span className="font-medium">{a.status}</span>
          </div>
          <div>
            <span className="text-gray-500">Type:</span>{" "}
            <span className="font-medium">{a.application_type ?? "-"}</span>
          </div>

          <div>
            <span className="text-gray-500">Program:</span>{" "}
            <span className="font-medium">{data.program?.name ?? "-"}</span>
          </div>
          <div>
            <span className="text-gray-500">Session:</span>{" "}
            <span className="font-medium">{data.session?.name ?? "-"}</span>
          </div>

          <div>
            <span className="text-gray-500">Department:</span>{" "}
            <span className="font-medium">{data.department?.name ?? "-"}</span>
          </div>
          <div>
            <span className="text-gray-500">Class Applied:</span>{" "}
            <span className="font-medium">{a.class_applied_for ?? "-"}</span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FilePreview label="Passport" file={data.passport} />
        <FilePreview label="Signature" file={data.signature} />
      </section>

      <section className="border rounded-lg bg-white p-5">
        <div className="text-sm font-semibold mb-3">Supporting Documents</div>

        {data.documents.length === 0 ? (
          <p className="text-sm text-gray-500">No supporting documents uploaded.</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {data.documents.map((d) => (
              <FilePreview
                key={d.id}
                label={d.doc_type ?? d.original_name ?? "Document"}
                mimeType={d.mime_type}
                file={d.file}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
