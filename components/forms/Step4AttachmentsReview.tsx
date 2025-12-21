"use client";

import { FC, ChangeEvent, useMemo, useState } from "react";
import { ApplicationFormData } from "@/types/applications";
import { Input } from "@/components/shared";
import Image from "next/image";
import { toast } from "react-toastify";
import { createClient } from "@/lib/supabase/client"; // ✅ use your createBrowserClient wrapper

interface Step4Props {
  data: ApplicationFormData;
  setData: (newData: Partial<ApplicationFormData>) => void;
}

const MAX_DOCS = 4;
const MAX_FILE_SIZE_MB = 1;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const BUCKET = "applications";
const PASSPORT_FOLDER = "passports";
const DOCUMENTS_FOLDER = "documents";

const Step4AttachmentsReview: FC<Step4Props> = ({ data, setData }) => {
  const supabase = useMemo(() => createClient(), []);
  const [uploading, setUploading] = useState(false);

  const passportPath = data.passportPath || "";
  const supportingPaths = data.supportingPaths || [];

  const publicUrlFromPath = (path: string) => {
    if (!path) return "";
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data?.publicUrl ?? "";
  };

  const uploadFileToStorage = async (file: File, folder: string): Promise<string | null> => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error(`File "${file.name}" is too large. Max ${MAX_FILE_SIZE_MB}MB.`);
      return null;
    }

    const ext = file.name.split(".").pop() || "bin";
    const filePath = `${folder}/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from(BUCKET).upload(filePath, file, {
      upsert: false,
      contentType: file.type || undefined,
    });

    if (error) {
      console.error("Supabase upload error:", error);
      toast.error(error.message || "Failed to upload file.");
      return null;
    }

    return filePath; // ✅ store path only
  };

  const handlePassportChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const path = await uploadFileToStorage(file, PASSPORT_FOLDER);
    setUploading(false);

    if (!path) return;
    setData({ passportPath: path });
    toast.success("Passport uploaded.");
  };

  const handleSupportingFilesChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const filesArray = Array.from(e.target.files);
    const availableSlots = MAX_DOCS - supportingPaths.length;

    if (availableSlots <= 0) {
      toast.error(`Max ${MAX_DOCS} documents allowed.`);
      return;
    }

    const filesToUpload = filesArray.slice(0, availableSlots);

    setUploading(true);
    const uploaded: string[] = [];

    for (const file of filesToUpload) {
      const path = await uploadFileToStorage(file, DOCUMENTS_FOLDER);
      if (path) uploaded.push(path);
    }

    setUploading(false);

    if (!uploaded.length) return;

    setData({ supportingPaths: [...supportingPaths, ...uploaded] });
    toast.success(`${uploaded.length} document(s) uploaded.`);
  };

  const removeSupportingFile = (index: number) => {
    setData({ supportingPaths: supportingPaths.filter((_, i) => i !== index) });
    toast.info("Removed (not deleted from storage).");
  };

  const isImageUrl = (url: string) => /\.(jpe?g|png|webp|gif)$/i.test(url.split("?")[0]);

  const passportPreviewUrl = passportPath ? publicUrlFromPath(passportPath) : "";

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Input
          label="Passport Photograph"
          type="file"
          accept="image/*"
          onChange={handlePassportChange}
          required
          disabled={uploading}
        />

        {passportPreviewUrl && isImageUrl(passportPreviewUrl) && (
          <div className="mt-2 w-32 h-32 relative">
            <Image src={passportPreviewUrl} alt="Passport preview" fill className="object-cover rounded border" />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Input
          label="Upload Supporting Documents"
          type="file"
          multiple
          accept="image/*,application/pdf"
          onChange={handleSupportingFilesChange}
          disabled={uploading}
        />

        {supportingPaths.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
            {supportingPaths.map((path, idx) => {
              const url = publicUrlFromPath(path);
              return (
                <div key={idx} className="relative border p-1 rounded">
                  {url && isImageUrl(url) ? (
                    <Image src={url} alt={`file-${idx}`} width={150} height={150} className="object-cover rounded" />
                  ) : (
                    <div className="flex items-center justify-center h-[150px] text-xs text-gray-700 bg-gray-100 rounded">
                      Document {idx + 1}
                    </div>
                  )}

                  <button
                    type="button"
                    className="absolute top-1 right-1 bg-red-500 text-white px-2 py-1 rounded text-xs"
                    onClick={() => removeSupportingFile(idx)}
                  >
                    X
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
