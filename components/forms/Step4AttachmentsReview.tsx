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

  /* ============ HELPERS ============ */

  const validateFile = (file: File): boolean => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File too large. Max ${MAX_FILE_SIZE_MB}MB`);
      return false;
    }
    return true;
  };

  const upload = async (
    file: File,
    folder: string
  ): Promise<StorageFileRef | null> => {
    if (!validateFile(file)) return null;

    const ext = file.name.split(".").pop() || "bin";
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type });

    if (error) {
      toast.error(error.message);
      return null;
    }

    return {
      bucket: BUCKET,
      path,
      contentType: file.type,
      size: file.size,
      originalName: file.name,
    };
  };

  const makePreview = async (ref: StorageFileRef, key: keyof PreviewMap) => {
    const { data } = supabase.storage.from(ref.bucket).getPublicUrl(ref.path);
    setPreviews((p) => ({ ...p, [key]: data.publicUrl }));
  };

  /* ============ HANDLERS ============ */

  const handleFile =
    (
      key: keyof ApplicationFormData,
      folder: string,
      previewKey: keyof PreviewMap
    ) =>
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);
      const ref = await upload(file, folder);
      setUploading(false);

      if (!ref) return;

      setData({ [key]: ref } as Partial<ApplicationFormData>);
      await makePreview(ref, previewKey);
      toast.success("Uploaded");
    };

  /* ============ INIT PREVIEWS (EDIT / BACK NAV) ============ */

  useEffect(() => {
    const init = async () => {
      if (data.passportFile) await makePreview(data.passportFile, "passport");
      if (data.signatureFile) await makePreview(data.signatureFile, "signature");
      if (data.academicResultFile) await makePreview(data.academicResultFile, "academic");
      if (data.birthCertificateFile) await makePreview(data.birthCertificateFile, "birth");
      if (data.sponsorshipLetterFile) await makePreview(data.sponsorshipLetterFile, "sponsor");
    };
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ================= RENDER ================= */

  return (
    <div className="space-y-6">
      <Input
        label="Passport Photograph"
        type="file"
        accept="image/*"
        required
        disabled={uploading}
        onChange={handleFile("passportFile", PASSPORT_FOLDER, "passport")}
      />
      {previews.passport && (
        <Image src={previews.passport} alt="passport" width={120} height={120} />
      )}

      <Input
        label="Signature"
        type="file"
        accept="image/*"
        required
        disabled={uploading}
        onChange={handleFile("signatureFile", SIGNATURE_FOLDER, "signature")}
      />
      {previews.signature && (
        <Image src={previews.signature} alt="signature" width={120} height={120} />
      )}

      <Input
        label="Academic Result (WAEC / NECO / NABTEB)"
        type="file"
        accept="image/*,application/pdf"
        required
        disabled={uploading}
        onChange={handleFile("academicResultFile", RESULTS_FOLDER, "academic")}
      />
      {previews.academic && (
        <a href={previews.academic} target="_blank" className="text-sm text-blue-600">
          View academic result
        </a>
      )}

      <Input
        label="Birth Certificate / Age Declaration"
        type="file"
        accept="image/*,application/pdf"
        required
        disabled={uploading}
        onChange={handleFile("birthCertificateFile", BIRTH_FOLDER, "birth")}
      />
      {previews.birth && (
        <a href={previews.birth} target="_blank" className="text-sm text-blue-600">
          View birth document
        </a>
      )}

      <Input
        label="Sponsorship Letter (optional)"
        type="file"
        accept="image/*,application/pdf"
        disabled={uploading}
        onChange={handleFile("sponsorshipLetterFile", SPONSOR_FOLDER, "sponsor")}
      />
      {previews.sponsor && (
        <a href={previews.sponsor} target="_blank" className="text-sm text-blue-600">
          View sponsorship letter
        </a>
      )}

      {uploading && <p className="text-sm text-blue-600">Uploading…</p>}
    </div>
  );
};

export default Step4AttachmentsReview;
