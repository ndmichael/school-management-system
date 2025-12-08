"use client";

import { FC } from "react";
import {
  ApplicationFormData,
  Gender,
  GuardianStatus,
} from "@/types/applications";
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
      {/* Names */}
      <div className="grid grid-cols-2 gap-4">
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
      </div>

      {/* Last + Gender */}
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Guardian Last Name"
          placeholder="Doe"
          value={data.guardianLastName}
          onChange={(e) => setData({ guardianLastName: e.target.value })}
          required
        />
        <Select<Gender>
          label="Guardian Gender"
          value={data.guardianGender}
          onChange={(val) => setData({ guardianGender: val })}
          options={genders.map((g) => ({
            value: g,
            label: g.charAt(0).toUpperCase() + g.slice(1),
          }))}
          required
        />
      </div>

      {/* Status + Phone */}
      <div className="grid grid-cols-2 gap-4">
        <Select<GuardianStatus>
          label="Guardian Status"
          value={data.guardianStatus}
          onChange={(val) => setData({ guardianStatus: val })}
          options={statuses.map((s) => ({
            value: s,
            label: s.charAt(0).toUpperCase() + s.slice(1),
          }))}
          required
        />
        <Input
          label="Guardian Phone"
          placeholder="+2348012345678"
          type="tel"
          value={data.guardianPhone}
          onChange={(e) => setData({ guardianPhone: e.target.value })}
          required
        />
      </div>
    </div>
  );
};

export default Step3Guardian;
