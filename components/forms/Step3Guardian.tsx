"use client";

import { FC } from "react";
import { ApplicationFormData, Gender, GuardianStatus } from "@/types/applications";
import { Input, Select } from "@/components/shared";

interface Step3Props {
  data: ApplicationFormData;
  setData: (newData: Partial<ApplicationFormData>) => void;
}

const genders: Gender[] = ["male", "female", "other"];
const statuses: GuardianStatus[] = ["father", "mother", "guardian", "other"];

const Step3Guardian: FC<Step3Props> = ({ data, setData }) => {
  return (
    <div className="space-y-4">
      <Input
        label="Guardian First Name"
        placeholder="John"
        value={data.guardianFirstName}
        onChange={(e) => setData({ guardianFirstName: e.target.value })}
        required
      />
      <Input
        label="Guardian Middle Name"
        placeholder="Optional"
        value={data.guardianMiddleName || ""}
        onChange={(e) => setData({ guardianMiddleName: e.target.value })}
      />
      <Input
        label="Guardian Last Name"
        placeholder="Doe"
        value={data.guardianLastName}
        onChange={(e) => setData({ guardianLastName: e.target.value })}
        required
      />

      <Select
        label="Guardian Gender"
        value={data.guardianGender}
        onChange={(val: Gender) => setData({ guardianGender: val })}
        options={genders.map((g) => ({ value: g, label: g.charAt(0).toUpperCase() + g.slice(1) }))}
        required
      />

      <Select
        label="Guardian Status"
        value={data.guardianStatus}
        onChange={(val: GuardianStatus) => setData({ guardianStatus: val })}
        options={statuses.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
        required
      />

      <Input
        label="Guardian Phone"
        placeholder="+2348012345678"
        value={data.guardianPhone}
        onChange={(e) => setData({ guardianPhone: e.target.value })}
        required
      />
      <Input
        label="Guardian Email"
        placeholder="guardian@example.com"
        value={data.guardianEmail}
        onChange={(e) => setData({ guardianEmail: e.target.value })}
        required
      />

      <Input
        label="Guardian Image"
        type="file"
        onChange={(e) => {
          if (e.target.files?.[0]) setData({ guardianImageId: URL.createObjectURL(e.target.files[0]) });
        }}
      />
    </div>
  );
};

export default Step3Guardian;
