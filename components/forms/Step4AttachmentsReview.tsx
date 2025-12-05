"use client";

import { FC, ChangeEvent, useState } from "react";
import { ApplicationFormData } from "@/types/applications";
import { Input } from "@/components/shared";
import Image from "next/image";
import { toast } from "react-toastify";

interface Step4Props {
  data: ApplicationFormData;
  setData: (newData: Partial<ApplicationFormData>) => void;
}

const Step4AttachmentsReview: FC<Step4Props> = ({ data, setData }) => {
  const [previewImages, setPreviewImages] = useState<string[]>(data.supportingDocuments || []);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const filesArray = Array.from(e.target.files);
    const newPreviews: string[] = [];

    for (const file of filesArray) {
      const url = URL.createObjectURL(file);
      newPreviews.push(url);
    }

    setPreviewImages((prev) => [...prev, ...newPreviews]);
    setData({ supportingDocuments: [...(data.supportingDocuments || []), ...newPreviews] });

    toast.success(`${filesArray.length} file(s) added!`);
  };

  const removeFile = (index: number) => {
    const updatedPreviews = [...previewImages];
    updatedPreviews.splice(index, 1);
    setPreviewImages(updatedPreviews);

    const updatedData = [...(data.supportingDocuments || [])];
    updatedData.splice(index, 1);
    setData({ supportingDocuments: updatedData });

    toast.info("File removed!");
  };

  return (
    <div className="space-y-4">
      <Input
        label="Upload Supporting Documents"
        type="file"
        onChange={handleFileChange}
        multiple
      />

      {previewImages.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {previewImages.map((src, idx) => (
            <div key={idx} className="relative border p-1 rounded">
              <Image src={src} alt={`file-${idx}`} width={150} height={150} className="object-cover rounded" />
              <button
                type="button"
                className="absolute top-1 right-1 bg-red-500 text-white px-2 py-1 rounded text-sm"
                onClick={() => removeFile(idx)}
              >
                X
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 p-4 border rounded space-y-2 bg-gray-50">
        <h3 className="font-semibold text-lg">Review your information</h3>
        <p><strong>Name:</strong> {data.firstName} {data.middleName} {data.lastName}</p>
        <p><strong>Program:</strong> {data.programId}</p>
        <p><strong>Admission Type:</strong> {data.admissionType}</p>
        <p><strong>Guardian:</strong> {data.guardianFirstName} {data.guardianLastName}</p>
        <p><strong>Uploaded files:</strong> {previewImages.length}</p>
      </div>
    </div>
  );
};

export default Step4AttachmentsReview;
