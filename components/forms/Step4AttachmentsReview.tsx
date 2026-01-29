"use client";

import type { FC, ChangeEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { toast } from "react-toastify";
import { Input } from "@/components/shared";
import { createClient } from "@/lib/supabase/client";
import type { ApplicationFormData, StorageFileRef } from "@/types/applications";

/* ================= CONSTANTS ================= */

const MAX_FILE_SIZE_MB = 1;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

const BUCKET = "applications";
const PASSPORT_FOLDER = "passports";
const SIGNATURE_FOLDER = "signatures";
const RESULTS_FOLDER = "results";
const BIRTH_FOLDER = "birth-certificates";
const SPONSOR_FOLDER = "sponsorships";

/* ================= HELPERS ================= */

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function isImageRef(ref: StorageFileRef | null): boolean {
  if (!ref?.path) return false;
  if (ref.contentType?.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|gif|bmp|svg)$/i.test(ref.path);
}

/* ================= TYPES ================= */

type PreviewMap = {
  passport?: string;
  signature?: string;
  academic?: string;
  birth?: string;
  sponsor?: string;
};

/* ================= COMPONENT ================= */

interface Props {
  data: ApplicationFormData;
  setData: (patch: Partial<ApplicationFormData>) => void;
}

const Step4AttachmentsReview: FC<Props> = ({ data, setData }) => {
  const supabase = useMemo(() => createClient(), []);
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState<PreviewMap>({});

  const validateFile = (file: File): boolean => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File too large. Max ${MAX_FILE_SIZE_MB}MB`);
      return false;
    }
    return true;
  };

  const upload = async (file: File, folder: string): Promise<StorageFileRef | null> => {
    if (!validateFile(file)) return null;

    const ext = file.name.split(".").pop()?.trim().toLowerCase() || "bin";
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;

    // keep costs down: never upsert (prevents silent overwrites + storage bloat confusion)
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      upsert: false,
      contentType: file.type || undefined,
    });

    if (error) {
      toast.error(error.message);
      return null;
    }

    return {
      bucket: BUCKET,
      path,
      contentType: file.type || undefined,
      size: file.size,
      originalName: file.name,
    };
  };

  const makePreview = (ref: StorageFileRef, key: keyof PreviewMap) => {
    const { data: urlData } = supabase.storage.from(ref.bucket).getPublicUrl(ref.path);
    setPreviews((p) => ({ ...p, [key]: urlData.publicUrl ?? "" }));
  };

  const handleFile =
    (key: keyof ApplicationFormData, folder: string, previewKey: keyof PreviewMap) =>
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);
      const ref = await upload(file, folder);
      setUploading(false);

      if (!ref) return;

      setData({ [key]: ref } as Partial<ApplicationFormData>);

      // preview only if image; PDFs get link
      if (isImageRef(ref)) makePreview(ref, previewKey);

      toast.success("Uploaded");
    };

  useEffect(() => {
    // init previews (back nav / edit)
    if (data.passportFile && isImageRef(data.passportFile)) makePreview(data.passportFile, "passport");
    if (data.signatureFile && isImageRef(data.signatureFile)) makePreview(data.signatureFile, "signature");
    if (data.academicResultFile && isImageRef(data.academicResultFile)) makePreview(data.academicResultFile, "academic");
    if (data.birthCertificateFile && isImageRef(data.birthCertificateFile)) makePreview(data.birthCertificateFile, "birth");
    if (data.sponsorshipLetterFile && isImageRef(data.sponsorshipLetterFile)) makePreview(data.sponsorshipLetterFile, "sponsor");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const linkFromRef = (ref: StorageFileRef | null): string => {
    if (!ref?.bucket || !ref.path) return "";
    const { data: urlData } = supabase.storage.from(ref.bucket).getPublicUrl(ref.path);
    return urlData.publicUrl ?? "";
  };

  const FileMeta = ({ refFile }: { refFile: StorageFileRef | null }) => {
    if (!refFile) return <p className="text-xs text-gray-500 mt-1">—</p>;

    return (
      <p className="text-xs text-gray-500 mt-1">
        <span className="font-medium text-gray-700">{refFile.originalName || "file"}</span>
        {" · "}
        <span>{formatBytes(refFile.size)}</span>
        {refFile.contentType ? (
          <>
            {" · "}
            <span className="font-mono">{refFile.contentType}</span>
          </>
        ) : null}
      </p>
    );
  };

  const PdfOrLink = ({ label, refFile }: { label: string; refFile: StorageFileRef | null }) => {
    if (!refFile) return null;
    const url = linkFromRef(refFile);
    if (!url) return null;

    // if image, thumbnail is shown elsewhere; for PDFs/others show link
    if (isImageRef(refFile)) return null;

    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-block mt-2 text-sm text-blue-600 hover:underline"
      >
        View {label}
      </a>
    );
  };

  return (
    <div className="space-y-6">
      <p className="text-xs text-gray-500">
        Max file size: {MAX_FILE_SIZE_MB}MB each. Use clear scans/photos. Uploading wrong documents may delay admission.
      </p>
      {/* Attestation Date */}
      <div className="space-y-2">
        <Input
          label="Attestation Date"
          type="date"
          value={data.attestationDate}
          onChange={(e) => setData({ attestationDate: e.target.value })}
          required
          disabled={uploading}
        />
        <p className="text-xs text-gray-500">Required.</p>
      </div>

      {/* Passport */}
      <div className="space-y-2">
        <Input
          label="Passport Photograph"
          type="file"
          accept="image/*"
          required
          disabled={uploading}
          onChange={handleFile("passportFile", PASSPORT_FOLDER, "passport")}
        />
        <FileMeta refFile={data.passportFile} />
        {previews.passport ? (
          <Image src={previews.passport} alt="passport" width={120} height={120} className="rounded border object-cover" />
        ) : null}
      </div>

      {/* Signature */}
      <div className="space-y-2">
        <Input
          label="Signature"
          type="file"
          accept="image/*"
          required
          disabled={uploading}
          onChange={handleFile("signatureFile", SIGNATURE_FOLDER, "signature")}
        />
        <FileMeta refFile={data.signatureFile} />
        {previews.signature ? (
          <Image src={previews.signature} alt="signature" width={120} height={120} className="rounded border object-cover" />
        ) : null}
      </div>

      {/* Academic Result */}
      <div className="space-y-2">
        <Input
          label="Academic Result (WAEC / NECO / NABTEB)"
          type="file"
          accept="image/*,application/pdf"
          required
          disabled={uploading}
          onChange={handleFile("academicResultFile", RESULTS_FOLDER, "academic")}
        />
        <FileMeta refFile={data.academicResultFile} />
        {previews.academic ? (
          <Image src={previews.academic} alt="academic result" width={160} height={160} className="rounded border object-cover" />
        ) : (
          <PdfOrLink label="academic result" refFile={data.academicResultFile} />
        )}
      </div>

      {/* Birth / Age */}
      <div className="space-y-2">
        <Input
          label="Birth Certificate / Age Declaration"
          type="file"
          accept="image/*,application/pdf"
          required
          disabled={uploading}
          onChange={handleFile("birthCertificateFile", BIRTH_FOLDER, "birth")}
        />
        <FileMeta refFile={data.birthCertificateFile} />
        {previews.birth ? (
          <Image src={previews.birth} alt="birth document" width={160} height={160} className="rounded border object-cover" />
        ) : (
          <PdfOrLink label="birth document" refFile={data.birthCertificateFile} />
        )}
      </div>

      {/* Sponsorship */}
      <div className="space-y-2">
        <Input
          label="Sponsorship Letter (optional)"
          type="file"
          accept="image/*,application/pdf"
          disabled={uploading}
          onChange={handleFile("sponsorshipLetterFile", SPONSOR_FOLDER, "sponsor")}
        />
        <FileMeta refFile={data.sponsorshipLetterFile} />
        {previews.sponsor ? (
          <Image src={previews.sponsor} alt="sponsorship letter" width={160} height={160} className="rounded border object-cover" />
        ) : (
          <PdfOrLink label="sponsorship letter" refFile={data.sponsorshipLetterFile} />
        )}
      </div>

      {uploading ? <p className="text-sm text-blue-600">Uploading…</p> : null}

      <p className="text-xs text-gray-500">
        Max file size: {MAX_FILE_SIZE_MB}MB each. Use clear scans/photos. Uploading wrong documents may delay admission.
      </p>
    </div>
  );
};

export default Step4AttachmentsReview;
