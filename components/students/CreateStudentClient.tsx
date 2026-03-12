"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { Input } from "@/components/shared/Input";
import { Select } from "@/components/shared/Select";
import { Textarea } from "@/components/shared/Textarea";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { X } from "lucide-react";

import { normalizeNigerianPhone, normalizeNin } from "@/lib/validation/nigeria";

type FileRef = {
  bucket: string;
  path: string;
};

type UploadDocType =
  | "academic_result"
  | "birth_or_age"
  | "sponsorship_letter"
  | "supporting_optional";

type UploadDocItem = {
  id: string;
  doc_type: UploadDocType;
  label: string;
  file: File | null;
  previewUrl: string | null;
};

const REQUIRED_DOC_TYPES: UploadDocType[] = [
  "academic_result",
  "birth_or_age",
];

const MAX_FILE_SIZE_MB = 1;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

const PASSPORT_BUCKET = "avatars";
const DOCUMENTS_BUCKET = "applications";

const IMAGE_ONLY_TYPES = ["image/jpeg", "image/png", "image/webp"];
const DOC_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

type Program = {
  id: string;
  name: string;
  code?: string | null;
  department_id: string | null;
  departments?: { name: string | null } | null;
};

type Session = { id: string; name: string };

type CreateStudentBody = {
  first_name: string;
  middle_name: string | null;
  last_name: string;
  email: string;

  phone: string | null;
  gender: string | null;
  date_of_birth: string | null;

  state_of_origin: string | null;
  lga_of_origin: string | null;
  nin: string | null;
  religion: string | null;
  address: string | null;

  program_id: string;
  session_id: string;
  level: string | null;

  admission_type: "fresh" | "direct_entry";
  previous_school: string | null;
  previous_qualification: string | null;
  special_needs?: string | null;

  guardian_first_name: string | null;
  guardian_last_name: string | null;
  guardian_phone: string | null;
  guardian_status: string | null;

  passport_file: FileRef | null;
  signature_file: FileRef | null;

  documents: {
    doc_type: UploadDocType;
    file: FileRef;
    original_name?: string | null;
    mime_type?: string | null;
  }[];
};

type ProgramsResp = { programs: Program[]; error?: string };
type SessionsResp = { sessions: Session[]; error?: string };

type Props = { onCreated?: () => void };

function toStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function clean(v: string): string | null {
  const t = v.trim();
  return t.length ? t : null;
}

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function isImageFile(file: File | null): boolean {
  return !!file && file.type.startsWith("image/");
}

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function makeDocRow(doc_type: UploadDocType, label: string): UploadDocItem {
  return {
    id: `${doc_type}-${Math.random().toString(36).slice(2, 10)}`,
    doc_type,
    label,
    file: null,
    previewUrl: null,
  };
}

function validateUploadFile(
  file: File,
  options?: { imageOnly?: boolean }
): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return `File too large. Max ${MAX_FILE_SIZE_MB}MB`;
  }

  const allowed = options?.imageOnly ? IMAGE_ONLY_TYPES : DOC_ALLOWED_TYPES;

  if (!allowed.includes(file.type)) {
    return options?.imageOnly
      ? "Only JPG, PNG, or WebP images are allowed"
      : "Only JPG, PNG, WebP, PDF, DOC, or DOCX files are allowed";
  }

  return null;
}


// NIN PHONE VALIDATION HANDLER
const handlePhoneBlur = (
  value: string,
  setter: (value: string) => void,
  label = "Phone number"
) => {
  try {
    if (!value.trim()) return;
    setter(normalizeNigerianPhone(value));
  } catch (error) {
    toast.error(error instanceof Error ? error.message : `Invalid ${label}`);
  }
};

const handleNinBlur = (value: string, setter: (value: string) => void) => {
  try {
    if (!value.trim()) return;
    setter(normalizeNin(value));
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Invalid NIN");
  }
};

export default function CreateStudentClient({ onCreated }: Props) {
  const supabase = useMemo(() => createClient(), []);

  const passportInputRef = useRef<HTMLInputElement | null>(null);
  const signatureInputRef = useRef<HTMLInputElement | null>(null);
  const documentInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [programs, setPrograms] = useState<Program[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(true);

  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");

  const [stateOfOrigin, setStateOfOrigin] = useState("");
  const [lga, setLga] = useState("");
  const [nin, setNin] = useState("");
  const [religion, setReligion] = useState("islam");
  const [address, setAddress] = useState("");

  const [programId, setProgramId] = useState("");
  const [sessionId, setSessionId] = useState("");

  const [classAppliedFor, setClassAppliedFor] = useState("");

  const [admissionType, setAdmissionType] = useState<"fresh" | "direct_entry">("fresh");
  const [prevSchool, setPrevSchool] = useState("");
  const [prevQual, setPrevQual] = useState("");
  const [specialNeeds, setSpecialNeeds] = useState("");

  const [gFirst, setGFirst] = useState("");
  const [gMiddle, setGMiddle] = useState("");
  const [gLast, setGLast] = useState("");
  const [gPhone, setGPhone] = useState("");
  const [gGender, setGGender] = useState("male");
  const [gStatus, setGStatus] = useState("father");

  const [passportFile, setPassportFile] = useState<File | null>(null);
  const [passportPreview, setPassportPreview] = useState<string | null>(null);

  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);

  const [documents, setDocuments] = useState<UploadDocItem[]>([
    makeDocRow("academic_result", "Academic Result"),
    makeDocRow("birth_or_age", "Birth / Age Declaration"),
    makeDocRow("sponsorship_letter", "Sponsorship Letter"),
    makeDocRow("supporting_optional", "Supporting Document"),
  ]);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadLookups() {
      try {
        setLoadingLookups(true);

        const [pRes, sRes] = await Promise.all([
          fetch("/api/programs", { cache: "no-store" }),
          fetch("/api/admin/sessions", { cache: "no-store" }),
        ]);

        const pJson = (await pRes.json().catch(() => null)) as ProgramsResp | null;
        const sJson = (await sRes.json().catch(() => null)) as SessionsResp | null;

        if (!pRes.ok) throw new Error(pJson?.error ?? "Failed to load programs");
        if (!sRes.ok) throw new Error(sJson?.error ?? "Failed to load sessions");

        if (cancelled) return;

        setPrograms(Array.isArray(pJson?.programs) ? pJson.programs : []);
        setSessions(Array.isArray(sJson?.sessions) ? sJson.sessions : []);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load form data");
      } finally {
        if (!cancelled) setLoadingLookups(false);
      }
    }

    loadLookups();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (passportPreview) URL.revokeObjectURL(passportPreview);
      if (signaturePreview) URL.revokeObjectURL(signaturePreview);

      for (const doc of documents) {
        if (doc.previewUrl) URL.revokeObjectURL(doc.previewUrl);
      }
    };
  }, [passportPreview, signaturePreview, documents]);

  type ProgramGroup = { deptName: string; programs: Program[] };

  const groupedPrograms = useMemo<ProgramGroup[]>(() => {
    const map = new Map<string, ProgramGroup>();

    for (const p of programs) {
      const deptName = p.departments?.name?.trim() || "Other";
      const key = `${p.department_id ?? "other"}:${deptName}`;

      const group = map.get(key) ?? { deptName, programs: [] };
      group.programs.push(p);
      map.set(key, group);
    }

    const groups = Array.from(map.values());
    for (const g of groups) {
      g.programs.sort((a, b) => a.name.localeCompare(b.name));
    }

    return groups.sort((a, b) => a.deptName.localeCompare(b.deptName));
  }, [programs]);

  const requiredSupportingDocsPresent = useMemo(() => {
    return REQUIRED_DOC_TYPES.every((requiredType) =>
      documents.some((doc) => doc.doc_type === requiredType && !!doc.file)
    );
  }, [documents]);

  const hasRequiredMainFiles = !!passportFile && !!signatureFile;

  const formLocked = saving || uploading;

  const canSubmit = useMemo(() => {
    if (saving || uploading) return false;

    if (
      !clean(firstName) ||
      !clean(lastName) ||
      !clean(email) ||
      !clean(phone) ||
      !clean(gender) ||
      !clean(dob) ||
      !clean(stateOfOrigin) ||
      !clean(lga) ||
      !clean(nin) ||
      !clean(religion) ||
      !clean(address)
    ) {
      return false;
    }

    const em = clean(email)?.toLowerCase() ?? "";
    if (!em.includes("@") || !em.includes(".")) return false;

    if (!isUuid(programId) || !isUuid(sessionId)) return false;

    if (admissionType === "direct_entry") {
      if (!clean(prevSchool) || !clean(prevQual)) return false;
    }

    if (!hasRequiredMainFiles) return false;
    if (!requiredSupportingDocsPresent) return false;

    return true;
  }, [
    saving,
    uploading,
    firstName,
    lastName,
    email,
    phone,
    gender,
    dob,
    stateOfOrigin,
    lga,
    nin,
    religion,
    address,
    programId,
    sessionId,
    admissionType,
    prevSchool,
    prevQual,
    hasRequiredMainFiles,
    requiredSupportingDocsPresent,
  ]);

  async function uploadFile(
    file: File,
    bucket: string,
    folder: string
  ): Promise<FileRef> {
    const ext = file.name.split(".").pop()?.trim().toLowerCase() || "bin";
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      upsert: false,
      contentType: file.type || undefined,
    });

    if (error) {
      throw new Error(error.message);
    }

    return {
      bucket,
      path,
    };
  }

  function handlePassportChange(file: File | null) {
    if (passportPreview) URL.revokeObjectURL(passportPreview);

    if (file) {
      const err = validateUploadFile(file, { imageOnly: true });
      if (err) {
        toast.error(`Passport: ${err}`);
        setPassportFile(null);
        setPassportPreview(null);
        return;
      }
    }

    setPassportFile(file);
    setPassportPreview(file && isImageFile(file) ? URL.createObjectURL(file) : null);
  }

  function handleSignatureChange(file: File | null) {
    if (signaturePreview) URL.revokeObjectURL(signaturePreview);

    if (file) {
      const err = validateUploadFile(file, { imageOnly: true });
      if (err) {
        toast.error(`Signature: ${err}`);
        setSignatureFile(null);
        setSignaturePreview(null);
        return;
      }
    }

    setSignatureFile(file);
    setSignaturePreview(file && isImageFile(file) ? URL.createObjectURL(file) : null);
  }

  function updateDocumentFile(docId: string, file: File | null) {
    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id !== docId) return doc;

        if (doc.previewUrl) URL.revokeObjectURL(doc.previewUrl);

        if (file) {
          const err = validateUploadFile(file);
          if (err) {
            toast.error(`${doc.label}: ${err}`);
            return {
              ...doc,
              file: null,
              previewUrl: null,
            };
          }
        }

        return {
          ...doc,
          file,
          previewUrl: file && isImageFile(file) ? URL.createObjectURL(file) : null,
        };
      })
    );
  }

  async function submit() {
    if (!canSubmit) return;

    let normalizedPhone: string;
    let normalizedGuardianPhone: string;
    let normalizedNin: string;

    try {
      normalizedPhone = normalizeNigerianPhone(phone);
      normalizedGuardianPhone = normalizeNigerianPhone(gPhone);
      normalizedNin = normalizeNin(nin);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Validation failed");
      return;
    }

    if (!passportFile) {
      toast.error("Passport photograph is required");
      return;
    }

    if (!signatureFile) {
      toast.error("Signature is required");
      return;
    }

    for (const requiredType of REQUIRED_DOC_TYPES) {
      const found = documents.some((doc) => doc.doc_type === requiredType && !!doc.file);
      if (!found) {
        const label =
          requiredType === "academic_result"
            ? "Academic Result"
            : "Birth / Age Declaration";
        toast.error(`${label} is required`);
        return;
      }
    }

    try {
      setUploading(true);

      const passportRef = await uploadFile(passportFile, PASSPORT_BUCKET, "passports");
      const signatureRef = await uploadFile(signatureFile, DOCUMENTS_BUCKET, "signatures");

      const uploadedDocuments: CreateStudentBody["documents"] = [];

      for (const doc of documents) {
        if (!doc.file) continue;

        let folder = "supporting";
        if (doc.doc_type === "academic_result") folder = "results";
        if (doc.doc_type === "birth_or_age") folder = "birth-certificates";
        if (doc.doc_type === "sponsorship_letter") folder = "sponsorships";

        const docRef = await uploadFile(doc.file, DOCUMENTS_BUCKET, folder);

        uploadedDocuments.push({
          doc_type: doc.doc_type,
          file: docRef,
          original_name: doc.file.name,
          mime_type: doc.file.type || null,
        });
      }

      setUploading(false);
      setSaving(true);

      const body: CreateStudentBody = {
        first_name: clean(firstName) ?? "",
        middle_name: clean(middleName),
        last_name: clean(lastName) ?? "",
        email: (clean(email) ?? "").toLowerCase(),

        phone: clean(normalizedPhone),
        gender: clean(gender),
        date_of_birth: clean(dob),

        state_of_origin: clean(stateOfOrigin),
        lga_of_origin: clean(lga),
        nin: clean(normalizedNin),
        religion: clean(religion),
        address: clean(address),

        program_id: programId,
        session_id: sessionId,
        level: clean(classAppliedFor),

        admission_type: admissionType,
        previous_school: admissionType === "direct_entry" ? clean(prevSchool) : null,
        previous_qualification: admissionType === "direct_entry" ? clean(prevQual) : null,
        special_needs: clean(specialNeeds),

        guardian_first_name: clean(gFirst),
        guardian_last_name: clean(gLast),
        guardian_phone: clean(normalizedGuardianPhone),
        guardian_status: clean(gStatus),

        passport_file: passportRef,
        signature_file: signatureRef,
        documents: uploadedDocuments,
      };

      const res = await fetch("/api/students/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = (await res.json().catch(() => null)) as {
        error?: string;
        matricNo?: string;
        warning?: string;
      } | null;

      if (!res.ok) {
        throw new Error(json?.error ?? "Failed to create student");
      }

      toast.success(`Student created${json?.matricNo ? ` (${json.matricNo})` : ""}. Invite queued.`);
      if (json?.warning) toast.warn(json.warning);

      setFirstName("");
      setMiddleName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setGender("");
      setDob("");

      setStateOfOrigin("");
      setLga("");
      setNin("");
      setReligion("islam");
      setAddress("");

      setProgramId("");
      setSessionId("");
      setClassAppliedFor("");

      setAdmissionType("fresh");
      setPrevSchool("");
      setPrevQual("");
      setSpecialNeeds("");

      setGFirst("");
      setGMiddle("");
      setGLast("");
      setGPhone("");
      setGGender("male");
      setGStatus("father");

      handlePassportChange(null);
      handleSignatureChange(null);

      setDocuments([
        makeDocRow("academic_result", "Academic Result"),
        makeDocRow("birth_or_age", "Birth / Age Declaration"),
        makeDocRow("sponsorship_letter", "Sponsorship Letter"),
        makeDocRow("supporting_optional", "Supporting Document"),
      ]);

      if (passportInputRef.current) passportInputRef.current.value = "";
      if (signatureInputRef.current) signatureInputRef.current.value = "";

      Object.values(documentInputRefs.current).forEach((input) => {
        if (input) input.value = "";
      });

      onCreated?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create student");
    } finally {
      setSaving(false);
      setUploading(false);
    }
  }

  if (loadingLookups) {
    return <div className="text-gray-600">Loading form…</div>;
  }

  const requiredDocuments = documents.filter(
    (doc) => doc.doc_type === "academic_result" || doc.doc_type === "birth_or_age"
  );

  const optionalDocuments = documents.filter(
    (doc) => doc.doc_type === "sponsorship_letter" || doc.doc_type === "supporting_optional"
  );

  function removePassport() {
    if (passportPreview) URL.revokeObjectURL(passportPreview);
    setPassportFile(null);
    setPassportPreview(null);

    if (passportInputRef.current) {
      passportInputRef.current.value = "";
    }
  }

  function removeSignature() {
    if (signaturePreview) URL.revokeObjectURL(signaturePreview);
    setSignatureFile(null);
    setSignaturePreview(null);

    if (signatureInputRef.current) {
      signatureInputRef.current.value = "";
    }
  }

  function removeDocument(docId: string) {
    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id !== docId) return doc;

        if (doc.previewUrl) URL.revokeObjectURL(doc.previewUrl);

        return {
          ...doc,
          file: null,
          previewUrl: null,
        };
      })
    );

    const input = documentInputRefs.current[docId];
    if (input) {
      input.value = "";
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold">Personal Information</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input label="First name *" value={firstName} onChange={(e) => setFirstName(toStr(e.target.value))} disabled={formLocked} />
          <Input label="Middle name" value={middleName} onChange={(e) => setMiddleName(toStr(e.target.value))} disabled={formLocked} />
          <Input label="Last name *" value={lastName} onChange={(e) => setLastName(toStr(e.target.value))} disabled={formLocked} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input label="Email *" value={email} onChange={(e) => setEmail(toStr(e.target.value))} disabled={formLocked} />
          <Input
            label="Phone *"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={() => handlePhoneBlur(phone, setPhone)}
            disabled={formLocked}
          />
          
          <Select
            label="Gender *"
            value={gender}
            onChange={(v) => setGender(v)}
            disabled={formLocked}
            options={[
              { label: "Male", value: "male" },
              { label: "Female", value: "female" },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input label="Date of birth *" type="date" value={dob} onChange={(e) => setDob(toStr(e.target.value))} disabled={formLocked} />
          <Input
            label="NIN *"
            value={nin}
            onChange={(e) => setNin(e.target.value.replace(/\D/g, "").slice(0, 11))}
            onBlur={() => handleNinBlur(nin, setNin)}
            disabled={formLocked}
          />
          <Select
            label="Religion *"
            value={religion}
            onChange={(v) => setReligion(v)}
            disabled={formLocked}
            options={[
              { label: "Islam", value: "islam" },
              { label: "Christianity", value: "christianity" },
              { label: "Other", value: "other" },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input label="State of origin *" value={stateOfOrigin} onChange={(e) => setStateOfOrigin(toStr(e.target.value))} disabled={formLocked} />
          <Input label="LGA of origin *" value={lga} onChange={(e) => setLga(toStr(e.target.value))} disabled={formLocked} />
        </div>

        <Textarea label="Address *" value={address} onChange={(e) => setAddress(toStr(e.target.value))} disabled={formLocked} />
      </div>

      <div className="bg-white border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold">Academic Information</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Program *</label>
            <select
              value={programId}
              onChange={(e) => setProgramId(e.target.value)}
              disabled={formLocked}
              className="w-full border rounded-xl px-3 py-3 text-sm bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Select program</option>
              {groupedPrograms.map((g) => (
                <optgroup key={g.deptName} label={g.deptName}>
                  {g.programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <Select
            label="Admission Session *"
            value={sessionId}
            onChange={(v) => setSessionId(v)}
            disabled={formLocked}
            options={[...sessions.map((s) => ({ label: s.name, value: s.id }))]}
          />

          <Input
            label="Class Applied For (optional)"
            placeholder="ND1, ND2, DIPLOMA"
            value={classAppliedFor}
            onChange={(e) => setClassAppliedFor(toStr(e.target.value))}
            disabled={formLocked}
          />
        </div>

        <Select
          label="Admission type *"
          value={admissionType}
          onChange={(v) => setAdmissionType(v === "direct_entry" ? "direct_entry" : "fresh")}
          disabled={formLocked}
          options={[
            { label: "Fresh admission", value: "fresh" },
            { label: "Direct entry", value: "direct_entry" },
          ]}
        />

        {admissionType === "direct_entry" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input label="Previous school *" value={prevSchool} onChange={(e) => setPrevSchool(toStr(e.target.value))} disabled={formLocked} />
            <Input
              label="Previous qualification *"
              value={prevQual}
              onChange={(e) => setPrevQual(toStr(e.target.value))}
              disabled={formLocked}
            />
          </div>
        )}

        <Textarea
          label="Special needs (optional)"
          value={specialNeeds}
          onChange={(e) => setSpecialNeeds(toStr(e.target.value))}
          disabled={formLocked}
        />
      </div>

      <div className="bg-white border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold">Guardian</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input
            label="Guardian first name *"
            value={gFirst}
            onChange={(e) => setGFirst(toStr(e.target.value))}
            disabled={formLocked}
          />

          <Input
            label="Guardian middle name"
            value={gMiddle}
            onChange={(e) => setGMiddle(toStr(e.target.value))}
            disabled={formLocked}
          />

          <Input
            label="Guardian last name *"
            value={gLast}
            onChange={(e) => setGLast(toStr(e.target.value))}
            disabled={formLocked}
          />

          <Input
            label="Guardian phone *"
            value={gPhone}
            onChange={(e) => setGPhone(toStr(e.target.value))}
             onBlur={() => handlePhoneBlur(gPhone, setGPhone, "guardian phone number")}
            disabled={formLocked}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Select
            label="Guardian gender *"
            value={gGender}
            onChange={(v) => setGGender(v)}
            disabled={formLocked}
            options={[
              { label: "Male", value: "male" },
              { label: "Female", value: "female" },
            ]}
          />

          <Select
            label="Guardian status *"
            value={gStatus}
            onChange={(v) => setGStatus(v)}
            disabled={formLocked}
            options={[
              { label: "Father", value: "father" },
              { label: "Mother", value: "mother" },
              { label: "Guardian", value: "guardian" },
            ]}
          />
        </div>
      </div>

      <div className="bg-white border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold">Required Documents</h2>

        <p className="text-xs text-gray-500">
          Max file size: {MAX_FILE_SIZE_MB}MB each.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Passport *</label>
            <input
              ref={passportInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={formLocked}
              onChange={(e) => handlePassportChange(e.target.files?.[0] ?? null)}
              className="block w-full rounded-xl border px-3 py-3 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            {passportFile && (
              <div className="rounded-lg border p-3 bg-gray-50 relative">
                <button
                  type="button"
                  onClick={removePassport}
                  disabled={formLocked}
                  className="absolute top-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full border bg-white text-red-600 hover:bg-red-50 disabled:opacity-50"
                  aria-label="Remove passport"
                  title="Remove passport"
                >
                  <X className="h-4 w-4" />
                </button>

                {passportPreview ? (
                  <img src={passportPreview} alt="Passport preview" className="h-24 w-24 rounded object-cover border" />
                ) : (
                  <div className="text-sm text-gray-700">{passportFile.name}</div>
                )}

                <div className="mt-2 text-xs text-gray-600">
                  {passportFile.name} • {formatFileSize(passportFile.size)}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Signature *</label>
            <input
              ref={signatureInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={formLocked}
              onChange={(e) => handleSignatureChange(e.target.files?.[0] ?? null)}
              className="block w-full rounded-xl border px-3 py-3 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            {signatureFile && (
              <div className="rounded-lg border p-3 bg-gray-50 relative">
                <button
                  type="button"
                  onClick={removeSignature}
                  disabled={formLocked}
                  className="absolute top-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full border bg-white text-red-600 hover:bg-red-50 disabled:opacity-50"
                  aria-label="Remove signature"
                  title="Remove signature"
                >
                  <X className="h-4 w-4" />
                </button>

                {signaturePreview ? (
                  <img src={signaturePreview} alt="Signature preview" className="h-20 w-32 rounded object-contain border bg-white" />
                ) : (
                  <div className="text-sm text-gray-700">{signatureFile.name}</div>
                )}

                <div className="mt-2 text-xs text-gray-600">
                  {signatureFile.name} • {formatFileSize(signatureFile.size)}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Required Supporting Documents</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {requiredDocuments.map((doc) => (
                <div key={doc.id} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {doc.label} *
                  </label>

                  <input
                    ref={(el) => {
                      documentInputRefs.current[doc.id] = el;
                    }}
                    type="file"
                    accept="image/*,.pdf,.doc,.docx"
                    disabled={formLocked}
                    onChange={(e) => updateDocumentFile(doc.id, e.target.files?.[0] ?? null)}
                    className="block w-full rounded-xl border px-3 py-3 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />

                  {doc.file && (
                    <div className="rounded-lg border p-3 bg-gray-50 relative">
                      <button
                        type="button"
                        onClick={() => removeDocument(doc.id)}
                        disabled={formLocked}
                        className="absolute top-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full border bg-white text-red-600 hover:bg-red-50 disabled:opacity-50"
                        aria-label={`Remove ${doc.label}`}
                        title={`Remove ${doc.label}`}
                      >
                        <X className="h-4 w-4" />
                      </button>

                      {doc.previewUrl ? (
                        <img
                          src={doc.previewUrl}
                          alt={`${doc.label} preview`}
                          className="h-24 w-24 rounded object-cover border"
                        />
                      ) : (
                        <div className="text-sm text-gray-700">{doc.file.name}</div>
                      )}

                      <div className="mt-2 text-xs text-gray-600">
                        {doc.file.name} • {formatFileSize(doc.file.size)}
                      </div>
                    </div>
                  )}
               </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Optional Supporting Documents</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {optionalDocuments.map((doc) => (
                <div key={doc.id} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {doc.label}
                  </label>

                  <input
                    type="file"
                    accept="image/*,.pdf,.doc,.docx"
                    disabled={formLocked}
                    onChange={(e) => updateDocumentFile(doc.id, e.target.files?.[0] ?? null)}
                    className="block w-full rounded-xl border px-3 py-3 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />

                  {doc.file && (
                    <div className="rounded-lg border p-3 bg-gray-50">
                      {doc.previewUrl ? (
                        <img
                          src={doc.previewUrl}
                          alt={`${doc.label} preview`}
                          className="h-24 w-24 rounded object-cover border"
                        />
                      ) : (
                        <div className="text-sm text-gray-700">{doc.file.name}</div>
                      )}
                      <div className="mt-2 text-xs text-gray-600">
                        {doc.file.name} • {formatFileSize(doc.file.size)}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={submit} disabled={!canSubmit} className="bg-admin-600 hover:bg-admin-700">
          {uploading ? "Uploading documents…" : saving ? "Creating…" : "Create & Send Invite"}
        </Button>
      </div>
    </div>
  );
}