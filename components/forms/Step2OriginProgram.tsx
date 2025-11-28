"use client";

import { FC } from "react";
import { ApplicationFormData, AdmissionType } from "@/types/applications";
import { Input, Select } from "@/components/shared";

interface Step2Props {
  data: ApplicationFormData;
  setData: (newData: Partial<ApplicationFormData>) => void;
  programs: { id: string; name: string }[]; // from DB
}

const admissionTypes: AdmissionType[] = ["fresh", "direct_entry", "transfer"];

const Step2OriginProgram: FC<Step2Props> = ({ data, setData, programs }) => {
  return (
    <div className="space-y-4">
      <Input
        label="State of Origin"
        placeholder="Kano"
        value={data.stateOfOrigin}
        onChange={(e) => setData({ stateOfOrigin: e.target.value })}
        required
      />

      <Input
        label="LGA of Origin"
        placeholder="Karaye"
        value={data.lgaOfOrigin}
        onChange={(e) => setData({ lgaOfOrigin: e.target.value })}
        required
      />

      <Select
        label="Religion"
        value={data.religion || "muslim"}   // default to Muslim
        onChange={(val) => setData({ religion: val })}
        options={[
                { value: "muslim", label: "Muslim" },
                { value: "christianity", label: "Christianity" },
                { value: "other", label: "Other" },
            ]}
      />

      <Input
        label="Address"
        placeholder="123 Street, City"
        value={data.address}
        onChange={(e) => setData({ address: e.target.value })}
        required
      />

      <Select
        label="Program"
        value={data.programId}
        onChange={(val) => setData({ programId: val })}
        options={programs.map((p) => ({ value: p.id, label: p.name }))}
        required
      />

      <Input
        label="Class Applied For"
        placeholder="100L / 200L etc."
        value={data.classAppliedFor}
        onChange={(e) => setData({ classAppliedFor: e.target.value })}
        required
      />

      <Select
        label="Admission Type"
        value={data.admissionType}
        onChange={(val: AdmissionType) => setData({ admissionType: val })}
        options={admissionTypes.map((type) => ({
          value: type,
          label: type.replace("_", " ").toUpperCase(),
        }))}
        required
      />

      {/* Conditional fields based on Admission Type */}
      {data.admissionType !== "fresh" && (
        <>
          <Input
            label="Previous School"
            placeholder="Previous institution"
            value={data.previousSchool || ""}
            onChange={(e) => setData({ previousSchool: e.target.value })}
          />

          <Input
            label="Previous Qualification"
            placeholder="e.g. WAEC, Diploma"
            value={data.previousQualification || ""}
            onChange={(e) => setData({ previousQualification: e.target.value })}
          />
        </>
      )}
    </div>
  );
};

export default Step2OriginProgram;
