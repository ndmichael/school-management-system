"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type StoredFile = { bucket: string; path: string };
type FileWithUrl = { file: StoredFile; url: string | null };

type ApplicationStatus = "pending" | "accepted" | "rejected";

type ApplicationRow = {
  id: string;
  application_no: string;
  status: ApplicationStatus;
  created_at: string;

  first_name: string;
  middle_name: string | null;
  last_name: string;

  email: string;
  phone: string | null;

  application_type: string | null;

  program_id: string;
  session_id: string;

  class_applied_for: string;

  passport_file: StoredFile | null;
  signature_file: StoredFile | null;
};

type ProgramRow = { id: string; name: string; code: string };
type SessionRow = { id: string; name: string };

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
  passport: FileWithUrl | null;
  signature: FileWithUrl | null;
  documents: DocumentWithUrl[];
};

type UpdatePayload = Partial<Pick<
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
>> & {
  edit_reason: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isUuid(v: string): boolean {
  return /^[0-9a-f-]{36}$/i.test(v);
}

function safeString(v: unknown, max = 300): string {
  if (typeof v !== "string") return "";
  const s = v.trim();
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

function InlineError({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      {message}
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  type = "text",
  required,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "email" | "tel";
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">
        {label} {required && "*"}
      </label>
      <input
        value={value}
        type={type}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded p-2 text-sm"
      />
    </div>
  );
}

function SelectInput({
  label,
  value,
  onChange,
  options,
  required,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">
        {label} {required && "*"}
      </label>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded p-2 text-sm"
      >
        <option value="">Select</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function FileCard({
  label,
  current,
  selected,
  onSelect,
}: {
  label: string
  current: FileWithUrl | null
  selected: File | null
  onSelect: (f: File | null) => void
}) {

  const previewUrl = useMemo(() => {
    if (selected) return URL.createObjectURL(selected)
    return current?.url ?? null
  }, [selected, current])

  return (
    <div className="border rounded-xl p-4 bg-white space-y-4">

      <div className="text-sm font-semibold">{label}</div>

      {/* PREVIEW */}

      {previewUrl && (
        <div className="relative w-32 h-32 border rounded-md overflow-hidden">
          <Image
            src={previewUrl}
            alt={label}
            fill
            sizes="128px"
            className="object-cover"
          />
        </div>
      )}

      {/* CURRENT FILE ACTION */}

      {current?.url && !selected && (
        <div className="space-y-1 text-sm">

          <div className="text-gray-500">
            Current file
          </div>

          <a
            href={current.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-blue-600 underline"
          >
            Open file
          </a>

        </div>
      )}

      {/* SELECTED FILE */}

      {selected && (
        <div className="text-xs text-blue-700">
          Selected file: {selected.name}
        </div>
      )}

      {/* DIVIDER */}

      <div className="border-t pt-3 space-y-2">

        <div className="text-xs text-gray-500">
          Replace file
        </div>

        <input
          type="file"
          onChange={(e) => onSelect(e.target.files?.[0] ?? null)}
          className="block text-sm"
        />

      </div>

    </div>
  )
}

export default function EditApplicationPage() {

  const router = useRouter();
  const params = useParams<{ id?: string | string[] }>();
  const idRaw = params?.id;
  const id = Array.isArray(idRaw) ? idRaw[0] : idRaw;

  const supabase = useMemo(() => createClient(), []);
  const abortRef = useRef<AbortController | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [details, setDetails] = useState<DetailsResponse | null>(null);

  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);

  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [applicationType, setApplicationType] = useState("");
  const [classAppliedFor, setClassAppliedFor] = useState("");

  const [programId, setProgramId] = useState("");
  const [sessionId, setSessionId] = useState("");

  const [editReason, setEditReason] = useState("");

  const [passportNew, setPassportNew] = useState<File | null>(null);
  const [signatureNew, setSignatureNew] = useState<File | null>(null);

  const [academicResultNew, setAcademicResultNew] = useState<File | null>(null);
  const [birthCertNew, setBirthCertNew] = useState<File | null>(null);

  const academicResult = details?.documents.find(d => d.doc_type === "academic_result");
  const birthCertificate = details?.documents.find(d => d.doc_type === "birth_certificate");

  useEffect(() => {

    if (!id || !isUuid(id)) {
      setError("Invalid application id.");
      setLoading(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    (async () => {

      try {

        const [detailsRes, progRes, sessRes] = await Promise.all([
          fetch(`/api/applications/${id}`),
          fetch(`/api/programs`),
          fetch(`/api/admin/sessions`)
        ]);

        const detailsJson = await detailsRes.json();
        const progJson = await progRes.json();
        const sessJson = await sessRes.json();

        const d = detailsJson as DetailsResponse;

        setDetails(d);

        setPrograms(progJson.programs ?? progJson);
        setSessions(sessJson.sessions ?? sessJson);

        const a = d.application;

        setFirstName(a.first_name);
        setMiddleName(a.middle_name ?? "");
        setLastName(a.last_name);
        setEmail(a.email);
        setPhone(a.phone ?? "");
        setApplicationType(a.application_type ?? "");
        setClassAppliedFor(a.class_applied_for);
        setProgramId(a.program_id);
        setSessionId(a.session_id);

      } catch {
        setError("Failed to load application");
      }

      setLoading(false);

    })();

    return () => controller.abort();

  }, [id]);

  const hasChanges = useMemo(() => {

    if (!details) return false;

    const a = details.application;

    return (
      firstName !== a.first_name ||
      middleName !== (a.middle_name ?? "") ||
      lastName !== a.last_name ||
      email !== a.email ||
      phone !== (a.phone ?? "") ||
      applicationType !== (a.application_type ?? "") ||
      classAppliedFor !== a.class_applied_for ||
      programId !== a.program_id ||
      sessionId !== a.session_id ||
      passportNew !== null ||
      signatureNew !== null ||
      academicResultNew !== null ||
      birthCertNew !== null
    );

  }, [
    details,
    firstName,
    middleName,
    lastName,
    email,
    phone,
    applicationType,
    classAppliedFor,
    programId,
    sessionId,
    passportNew,
    signatureNew,
    academicResultNew,
    birthCertNew
  ]);

  const canSave = hasChanges && editReason.trim().length >= 5;

  async function uploadFile(file: File, kind: string) {

    const ext = file.name.split(".").pop() ?? "bin";
    const path = buildObjectPath({ applicationId: id!, kind, ext });

    const { error } = await supabase.storage
      .from("applications")
      .upload(path, file, { upsert: true });

    if (error) throw new Error(error.message);

    return { bucket: "applications", path };

  }

  async function handleSave() {

    if (!details || !id) return;

    setSaving(true);
    setError(null);

    try {

      let passport_file;
      let signature_file;

      if (passportNew)
        passport_file = await uploadFile(passportNew, "passport");

      if (signatureNew)
        signature_file = await uploadFile(signatureNew, "signature");

      const payload: UpdatePayload = {

        first_name: safeString(firstName, 80),
        middle_name: safeString(middleName, 80) || null,
        last_name: safeString(lastName, 80),

        email: safeString(email, 120),
        phone: safeString(phone, 40) || null,

        application_type: safeString(applicationType, 80) || null,
        class_applied_for: safeString(classAppliedFor, 80),

        program_id: programId,
        session_id: sessionId,

        edit_reason: safeString(editReason, 500)

      };

      if (passport_file) payload.passport_file = passport_file;
      if (signature_file) payload.signature_file = signature_file;

      const res = await fetch(`/api/applications/${id}`, {

        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)

      });

      if (!res.ok) throw new Error("Update failed");

      if (academicResultNew) {

        const ref = await uploadFile(academicResultNew, "academic_result");

        await fetch(`/api/applications/${id}/documents`, {

          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            doc_type: "academic_result",
            file: ref
          })

        });

      }

      if (birthCertNew) {

        const ref = await uploadFile(birthCertNew, "birth_certificate");

        await fetch(`/api/applications/${id}/documents`, {

          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            doc_type: "birth_certificate",
            file: ref
          })

        });

      }

      router.push(`/dashboard/admin/applications/${id}`);

    } catch (e) {

      setError("Save failed");

    } finally {

      setSaving(false);

    }

  }

  if (loading)
    return <main className="p-6">Update Loading...</main>;

  if (!details)
    return <main className="p-6"><InlineError message={error ?? "Application not found"} /></main>;

  const programOptions = programs.map((p) => ({
    value: p.id,
    label: p.code ? `${p.name} (${p.code})` : p.name,
  }));

  const sessionOptions = sessions.map(s => ({
    value: s.id,
    label: s.name
  }));

  return (

<main className="p-6 max-w-5xl space-y-8">

<h1 className="text-2xl font-bold">Edit Application</h1>

{error && <InlineError message={error} />}

{/* APPLICATION INFORMATION */}

<div className="bg-white border rounded-xl p-6 space-y-4">

<h2 className="text-lg font-semibold">Application Information</h2>

<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

<TextInput label="First Name" value={firstName} onChange={setFirstName} required />

<TextInput label="Middle Name" value={middleName} onChange={setMiddleName} />

<TextInput label="Last Name" value={lastName} onChange={setLastName} required />

<TextInput label="Email" type="email" value={email} onChange={setEmail} required />

<TextInput label="Phone" value={phone} onChange={setPhone} />

</div>

</div>


{/* APPLICATION DETAILS */}

<div className="bg-white border rounded-xl p-6 space-y-4">

<h2 className="text-lg font-semibold">Application Details</h2>

<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

<TextInput
label="Application Type"
value={applicationType}
onChange={setApplicationType}
/>

<TextInput
label="Class Applied For"
value={classAppliedFor}
onChange={setClassAppliedFor}
required
/>

<SelectInput
label="Program"
value={programId}
onChange={setProgramId}
options={programOptions}
required
/>

<SelectInput
label="Session"
value={sessionId}
onChange={setSessionId}
options={sessionOptions}
required
/>

</div>

</div>


{/* DOCUMENTS */}

<div className="bg-white border rounded-xl p-6 space-y-4">

<h2 className="text-lg font-semibold">Documents</h2>

<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

<FileCard
label="Passport"
current={details.passport}
selected={passportNew}
onSelect={setPassportNew}
/>

<FileCard
label="Signature"
current={details.signature}
selected={signatureNew}
onSelect={setSignatureNew}
/>

<FileCard
label="Academic Result"
current={academicResult?.file ?? null}
selected={academicResultNew}
onSelect={setAcademicResultNew}
/>

<FileCard
label="Birth / Age Certificate"
current={birthCertificate?.file ?? null}
selected={birthCertNew}
onSelect={setBirthCertNew}
/>

</div>

</div>


{/* EDIT REASON */}

<div className="bg-white border rounded-xl p-6 space-y-2">

<label className="text-sm font-medium">Edit Reason *</label>

<textarea
value={editReason}
onChange={(e) => setEditReason(e.target.value)}
className="w-full border rounded p-2"
/>

</div>


{/* ACTION BUTTONS */}

<div className="flex gap-3">

<button
onClick={handleSave}
disabled={!canSave || saving}
className="px-5 py-2 bg-slate-900 text-white rounded-md disabled:opacity-50"
>
{saving ? "Saving..." : "Save Changes"}
</button>

<button
onClick={() => router.back()}
className="px-5 py-2 border rounded-md"
>
Cancel
</button>

</div>

</main>

);
}