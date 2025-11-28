"use client";

import { FC } from "react";
import { ApplicationFormData, Gender } from "@/types/applications";
import { Input, Textarea } from "@/components/shared";

interface Step1Props {
  data: ApplicationFormData;
  setData: (newData: Partial<ApplicationFormData>) => void;
}

const genders: Gender[] = ["male", "female", "other"];

const Step1Personal: FC<Step1Props> = ({ data, setData }) => {
  return (
    <div className="space-y-4">
      <Input
        label="First Name"
        placeholder="John"
        value={data.firstName}
        onChange={(e) => setData({ firstName: e.target.value })}
        required
      />

      <Input
        label="Middle Name"
        placeholder="Optional"
        value={data.middleName || ""}
        onChange={(e) => setData({ middleName: e.target.value })}
      />

      <Input
        label="Last Name"
        placeholder="Doe"
        value={data.lastName}
        onChange={(e) => setData({ lastName: e.target.value })}
        required
      />

      <div>
        <label className="block text-sm font-medium mb-1">Gender</label>
        <div className="flex gap-4">
          {genders.map((g) => (
            <label key={g} className="flex items-center gap-1">
              <input
                type="radio"
                name="gender"
                value={g}
                checked={data.gender === g}
                onChange={() => setData({ gender: g })}
              />
              {g.charAt(0).toUpperCase() + g.slice(1)}
            </label>
          ))}
        </div>
      </div>

      <Input
        label="Date of Birth"
        type="date"
        value={data.dateOfBirth}
        onChange={(e) => setData({ dateOfBirth: e.target.value })}
        required
      />

      <Input
        label="Email"
        type="email"
        placeholder="john@example.com"
        value={data.email}
        onChange={(e) => setData({ email: e.target.value })}
        required
      />

      <Input
        label="Phone"
        type="tel"
        placeholder="+2348012345678"
        value={data.phone}
        onChange={(e) => setData({ phone: e.target.value })}
        required
      />

      <Input
        label="NIN"
        placeholder="Optional"
        value={data.nin || ""}
        onChange={(e) => setData({ nin: e.target.value })}
      />

      <Textarea
        label="Special Needs"
        placeholder="Optional"
        value={data.specialNeeds || ""}
        onChange={(e) => setData({ specialNeeds: e.target.value })}
      />
    </div>
  );
};

export default Step1Personal;
