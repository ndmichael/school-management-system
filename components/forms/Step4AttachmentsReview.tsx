"use client";

import { FC, ChangeEvent, useState } from "react";
import { ApplicationFormData } from "@/types/applications";
import { Input } from "@/components/shared";
import Image from "next/image";
import { toast } from "react-toastify";
import { supabase } from "@/lib/supabase/supabase"; // ✅ adjust if your file is different

interface Step4Props {
  data: ApplicationFormData;
  setData: (newData: Partial<ApplicationFormData>) => void;
}

const MAX_DOCS = 4;
const MAX_FILE_SIZE_MB = 1; // 1 MB per file
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const PASSPORT_FOLDER = "passports";
const DOCUMENTS_FOLDER = "documents";

const Step4AttachmentsReview: FC<Step4Props> = ({ data, setData }) => {
  const [uploading, setUploading] = useState(false);

  // 🔹 derive from parent state
  const passportPreview = data.passportImageId || "";
  const previewImages = data.supportingDocuments || [];

  const uploadFileToStorage = async (
    file: File,
    folder: string
  ): Promise<string | null> => {
    // size guard
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error(
        `File "${file.name}" is too large. Max allowed is ${MAX_FILE_SIZE_MB}MB.`
      );
      return null;
    }

    const ext = file.name.split(".").pop() || "bin";
    const filePath = `${folder}/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from("applications")
      .upload(filePath, file);

    if (error) {
      console.error("Supabase upload error:", error);
      toast.error(error.message || "Failed to upload file.");
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from("applications")
      .getPublicUrl(filePath);

    return publicUrlData?.publicUrl ?? null;
  };

  const handlePassportChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;

    const file = e.target.files[0];

    setUploading(true);
    const url = await uploadFileToStorage(file, PASSPORT_FOLDER);
    setUploading(false);

    if (!url) return;

    setData({ passportImageId: url });
    toast.success("Passport uploaded successfully.");
  };

  const handleSupportingFilesChange = async (
    e: ChangeEvent<HTMLInputElement>
  ) => {
    if (!e.target.files) return;

    const filesArray = Array.from(e.target.files);
    const existingCount = previewImages.length;
    const availableSlots = MAX_DOCS - existingCount;

    if (availableSlots <= 0) {
      toast.error(`You can upload a maximum of ${MAX_DOCS} documents.`);
      return;
    }

    const filesToUpload = filesArray.slice(0, availableSlots);

    setUploading(true);
    const uploadedUrls: string[] = [];

    for (const file of filesToUpload) {
      const url = await uploadFileToStorage(file, DOCUMENTS_FOLDER);
      if (url) uploadedUrls.push(url);
    }
    setUploading(false);

    if (!uploadedUrls.length) return;

    const merged = [...previewImages, ...uploadedUrls];

    setData({ supportingDocuments: merged });

    toast.success(`${uploadedUrls.length} document(s) uploaded.`);
  };

  const removeSupportingFile = (index: number) => {
    const updated = previewImages.filter((_, i) => i !== index);
    setData({ supportingDocuments: updated });

    toast.info("File removed from application (not deleted from storage).");
  };

  const isImageUrl = (url: string) =>
    /\.(jpe?g|png|webp|gif)$/i.test(url.split("?")[0]);

  return (
    <div className="space-y-6">
      {/* Passport upload */}
      <div className="space-y-2">
        <Input
          label="Passport Photograph"
          type="file"
          accept="image/*"
          onChange={handlePassportChange}
          required
          disabled={uploading}
        />
        {passportPreview && isImageUrl(passportPreview) && (
          <div className="mt-2 w-32 h-32 relative">
            <Image
              src={passportPreview}
              alt="Passport preview"
              fill
              className="object-cover rounded border"
            />
          </div>
        )}
      </div>

      {/* Supporting docs */}
      <div className="space-y-2">
        <Input
          label="Upload Supporting Documents"
          type="file"
          multiple
          onChange={handleSupportingFilesChange}
          disabled={uploading}
        />

        {previewImages.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
            {previewImages.map((src, idx) => (
              <div key={idx} className="relative border p-1 rounded">
                {isImageUrl(src) ? (
                  <Image
                    src={src}
                    alt={`file-${idx}`}
                    width={150}
                    height={150}
                    className="object-cover rounded"
                  />
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
            ))}
          </div>
        )}
      </div>

      {/* Attestation */}
      <div className="space-y-2">
        <Input
          label="Attestation Date"
          type="date"
          value={data.attestationDate}
          onChange={(e) => setData({ attestationDate: e.target.value })}
          required
          disabled={uploading}
        />
        <p className="text-xs text-gray-600">
          By selecting this date, you confirm that all information provided is
          accurate and complete to the best of your knowledge.
        </p>
      </div>

      {uploading && (
        <p className="text-sm text-blue-600">Uploading files, please wait…</p>
      )}

      {/* Review summary */}
      <div className="mt-4 p-4 border rounded space-y-2 bg-gray-50 text-sm">
        <h3 className="font-semibold text-lg">Review your information</h3>
        <p>
          <strong>Name:</strong> {data.firstName}{" "}
          {data.middleName ? `${data.middleName} ` : ""}
          {data.lastName}
        </p>
        <p>
          <strong>Program:</strong> {data.programId || "Not selected"}
        </p>
        <p>
          <strong>Admission Type:</strong> {data.admissionType}
        </p>
        <p>
          <strong>Guardian:</strong> {data.guardianFirstName}{" "}
          {data.guardianLastName}
        </p>
        <p>
          <strong>Uploaded supporting files:</strong>{" "}
          {previewImages.length || 0}
        </p>
      </div>
    </div>
  );
};

export default Step4AttachmentsReview;
