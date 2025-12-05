"use client";

import { FC } from "react";
import { ApplicationFormData, Gender } from "@/types/applications";
import { Input, Select } from "@/components/shared";

interface Step1Props {
  data: ApplicationFormData;
  setData: (newData: Partial<ApplicationFormData>) => void;
}

const genders: Gender[] = ["male", "female", "other"];

const Step1Personal: FC<Step1Props> = ({ data, setData }) => {
  return (
    <div className="space-y-4">
      {/* First + Middle Name */}
      <div className="grid grid-cols-2 gap-4">
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
      </div>

      {/* Last Name + Gender */}
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Last Name"
          placeholder="Doe"
          value={data.lastName}
          onChange={(e) => setData({ lastName: e.target.value })}
          required
        />
        <Select<Gender>
          label="Gender"
          value={data.gender}
          onChange={(val) => setData({ gender: val })}
          options={genders.map((g) => ({
            value: g,
            label: g.charAt(0).toUpperCase() + g.slice(1),
          }))}
          required
        />
      </div>

      {/* Date of Birth + NIN */}
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Date of Birth"
          type="date"
          value={data.dateOfBirth}
          onChange={(e) => setData({ dateOfBirth: e.target.value })}
          required
        />
        <Input
          label="NIN"
          placeholder="National Identification Number"
          value={data.nin}
          onChange={(e) => setData({ nin: e.target.value })}
          required
        />
      </div>

      {/* Email + Phone */}
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Email"
          placeholder="john@example.com"
          type="email"
          value={data.email}
          onChange={(e) => setData({ email: e.target.value })}
          required
        />
        <Input
          label="Phone"
          placeholder="+2348012345678"
          type="tel"
          value={data.phone}
          onChange={(e) => setData({ phone: e.target.value })}
          required
        />
      </div>

      {/* Special Needs */}
      <Input
        label="Special Needs (if any)"
        placeholder="Optional"
        value={data.specialNeeds || ""}
        onChange={(e) => setData({ specialNeeds: e.target.value })}
      />
    </div>
  );
};

export default Step1Personal;
