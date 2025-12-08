"use client";

import { FC } from "react";
import {
  ApplicationFormData,
  AdmissionType,
  Religion,
} from "@/types/applications";
import { Input, Select } from "@/components/shared";

interface Step2Props {
  data: ApplicationFormData;
  setData: (newData: Partial<ApplicationFormData>) => void;
  programs: { id: string; name: string }[];
}

const admissionTypes: AdmissionType[] = ["fresh", "direct_entry"];

const religions: { value: Religion; label: string }[] = [
  { value: "muslim", label: "Muslim" },
  { value: "christian", label: "Christian" },
  { value: "other", label: "Other" },
];

const Step2OriginProgram: FC<Step2Props> = ({ data, setData, programs }) => {
  return (
    <div className="space-y-4">
      {/* State & LGA */}
      <div className="grid grid-cols-2 gap-4">
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
      </div>

      {/* Religion */}
      <Select<Religion>
        label="Religion"
        value={data.religion}
        onChange={(val) => setData({ religion: val })}
        options={religions}
        required
      />

      {/* Address */}
      <Input
        label="Address"
        placeholder="Full residential address"
        value={data.address}
        onChange={(e) => setData({ address: e.target.value })}
        required
      />

      {/* Program + Class Applied For */}
      <div className="grid grid-cols-2 gap-4">
        <Select<string>
          label="Program"
          value={data.programId}
          onChange={(val) => setData({ programId: val })}
          options={programs.map((p) => ({ value: p.id, label: p.name }))}
          required
        />

        <Input
          label="Class Applied For"
          placeholder="e.g. ND1, ND2, 100 Level"
          value={data.classAppliedFor}
          onChange={(e) => setData({ classAppliedFor: e.target.value })}
          required
        />
      </div>

      {/* Admission Type */}
      <Select<AdmissionType>
        label="Admission Type"
        value={data.admissionType}
        onChange={(val) => setData({ admissionType: val })}
        options={[
          { value: "fresh", label: "FRESH ADMISSION" },
          { value: "direct_entry", label: "DIRECT ENTRY" },
        ]}
        required
      />

      {/* Previous School / Qualification only if DIRECT ENTRY */}
      {data.admissionType === "direct_entry" && (
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Previous School"
            placeholder="Name of previous institution"
            value={data.previousSchool || ""}
            onChange={(e) => setData({ previousSchool: e.target.value })}
          />

          <Input
            label="Previous Qualification"
            placeholder="e.g. WAEC, Diploma, Certificate"
            value={data.previousQualification || ""}
            onChange={(e) =>
              setData({ previousQualification: e.target.value })
            }
          />
        </div>
      )}
    </div>
  );
};

export default Step2OriginProgram;
