"use client";

import type { FC, ChangeEvent } from "react";
import { useMemo, useState } from "react";
import Image from "next/image";
import { toast } from "react-toastify";

import type { ApplicationFormData, StorageFileRef } from "@/types/applications";
import { Input } from "@/components/shared";
import { createClient } from "@/lib/supabase/client";

interface Step4Props {
  data: ApplicationFormData;
  setData: (patch: Partial<ApplicationFormData>) => void;
}

const MAX_SUPPORTING_DOCS = 4;
const MAX_FILE_SIZE_MB = 1;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const BUCKET = "applications";
const PASSPORT_FOLDER = "passports";
const SIGNATURE_FOLDER = "signatures";
const DOCUMENTS_FOLDER = "documents";

function isImageRef(ref: StorageFileRef | null): boolean {
  if (!ref?.path) return false;
  if (ref.contentType?.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|gif|bmp|svg)$/i.test(ref.path);
}

function safeExt(name: string): string {
  const ext = name.split(".").pop()?.trim().toLowerCase();
  return ext && ext.length <= 8 ? ext : "bin";
}

const Step4AttachmentsReview: FC<Step4Props> = ({ data, setData }) => {
  const supabase = useMemo(() => createClient(), []);
  const [uploading, setUploading] = useState(false);

  const publicUrlFromRef = (ref: StorageFileRef | null) => {
    if (!ref?.bucket || !ref.path) return "";
    const { data: urlData } = supabase.storage.from(ref.bucket).getPublicUrl(ref.path);
    return urlData?.publicUrl ?? "";
  };

  const uploadFileToStorage = async (
    file: File,
    folder: string
  ): Promise<StorageFileRef | null> => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error(`File "${file.name}" is too large. Max ${MAX_FILE_SIZE_MB}MB.`);
      return null;
    }

    const ext = safeExt(file.name);
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      upsert: false,
      contentType: file.type || undefined,
    });

    if (error) {
      console.error("Supabase upload error:", error);
      toast.error(error.message || "Failed to upload file.");
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

  const handlePassportChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const ref = await uploadFileToStorage(file, PASSPORT_FOLDER);
    setUploading(false);

    if (!ref) return;
    setData({ passportFile: ref });
    toast.success("Passport uploaded.");
  };

  const handleSignatureChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const ref = await uploadFileToStorage(file, SIGNATURE_FOLDER);
    setUploading(false);

    if (!ref) return;
    setData({ signatureFile: ref });
    toast.success("Signature uploaded.");
  };

  const handleSupportingFilesChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const filesArray = Array.from(e.target.files);
    const current = data.supportingFiles ?? [];
    const availableSlots = MAX_SUPPORTING_DOCS - current.length;

    if (availableSlots <= 0) {
      toast.error(`Max ${MAX_SUPPORTING_DOCS} documents allowed.`);
      return;
    }

    const filesToUpload = filesArray.slice(0, availableSlots);

    setUploading(true);
    const uploaded: StorageFileRef[] = [];

    for (const file of filesToUpload) {
      const ref = await uploadFileToStorage(file, DOCUMENTS_FOLDER);
      if (ref) uploaded.push(ref);
    }

    setUploading(false);

    if (!uploaded.length) return;

    setData({ supportingFiles: [...current, ...uploaded] });
    toast.success(`${uploaded.length} document(s) uploaded.`);
  };

  const removeSupportingFile = (index: number) => {
    const current = data.supportingFiles ?? [];
    setData({ supportingFiles: current.filter((_, i) => i !== index) });
    toast.info("Removed (not deleted from storage).");
  };

  const passportUrl = publicUrlFromRef(data.passportFile);
  const signatureUrl = publicUrlFromRef(data.signatureFile);

  return (
    <div className="space-y-6">
      {/* Passport */}
      <div className="space-y-2">
        <Input
          label="Passport Photograph"
          type="file"
          accept="image/*"
          onChange={handlePassportChange}
          required
          disabled={uploading}
        />

        {passportUrl && isImageRef(data.passportFile) && (
          <div className="mt-2 w-32 h-32 relative">
            <Image
              src={passportUrl}
              alt="Passport preview"
              fill
              sizes="128px"
              className="object-cover rounded border"
            />
          </div>
        )}
      </div>

      {/* Signature (required) */}
      <div className="space-y-2">
        <Input
          label="Signature"
          type="file"
          accept="image/*"
          onChange={handleSignatureChange}
          required
          disabled={uploading}
        />

        {signatureUrl && isImageRef(data.signatureFile) && (
          <div className="mt-2 w-32 h-32 relative">
            <Image
              src={signatureUrl}
              alt="Signature preview"
              fill
              sizes="128px"
              className="object-cover rounded border"
            />
          </div>
        )}
      </div>

      {/* Supporting docs */}
      <div className="space-y-2">
        <Input
          label="Upload Supporting Documents (optional)"
          type="file"
          multiple
          accept="image/*,application/pdf"
          onChange={handleSupportingFilesChange}
          disabled={uploading}
        />

        {(data.supportingFiles?.length ?? 0) > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
            {(data.supportingFiles ?? []).map((ref, idx) => {
              const url = publicUrlFromRef(ref);
              const isImg = isImageRef(ref);

              return (
                <div key={`${ref.path}-${idx}`} className="relative border p-1 rounded">
                  {url && isImg ? (
                    <Image
                      src={url}
                      alt={ref.originalName ? ref.originalName : `document-${idx + 1}`}
                      width={150}
                      height={150}
                      className="object-cover rounded"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-[150px] text-xs text-gray-700 bg-gray-100 rounded px-2 text-center">
                      {ref.originalName ? ref.originalName : `Document ${idx + 1}`}
                    </div>
                  )}

                  <button
                    type="button"
                    className="absolute top-1 right-1 bg-red-500 text-white px-2 py-1 rounded text-xs"
                    onClick={() => removeSupportingFile(idx)}
                    disabled={uploading}
                  >
                    X
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Attestation date */}
      <div className="space-y-2">
        <Input
          label="Attestation Date"
          type="date"
          value={data.attestationDate}
          onChange={(e) => setData({ attestationDate: e.target.value })}
          required
          disabled={uploading}
        />
      </div>

      {uploading && <p className="text-sm text-blue-600">Uploading…</p>}
    </div>
  );
};

export default Step4AttachmentsReview;
