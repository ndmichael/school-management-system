"use client";

import { FC } from "react";
import { ApplicationFormData } from "@/types/applications";
import { Input } from "@/components/shared";

interface Step4Props {
  data: ApplicationFormData;
  setData: (newData: Partial<ApplicationFormData>) => void;
}

const Step4AttachmentsReview: FC<Step4Props> = ({ data, setData }) => {
  return (
    <div className="space-y-4">
      <Input
        label="Passport Image"
        type="file"
        onChange={(e) => {
          if (e.target.files?.[0]) setData({ passportImageId: URL.createObjectURL(e.target.files[0]) });
        }}
      />

      <Input
        label="Supporting Documents"
        type="file"
        multiple
        onChange={(e) => {
          if (e.target.files) {
            const filesArray = Array.from(e.target.files).map((f) => URL.createObjectURL(f));
            setData({ supportingDocuments: filesArray });
          }
        }}
      />

      <Input
        label="Attestation Date"
        type="date"
        value={data.attestationDate || ""}
        onChange={(e) => setData({ attestationDate: e.target.value })}
      />

      <div className="pt-4 border-t border-gray-200">
        <h3 className="text-lg font-semibold mb-2">Review Your Information</h3>
        <pre className="bg-gray-50 p-4 rounded-lg max-h-64 overflow-auto text-sm">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default Step4AttachmentsReview;
