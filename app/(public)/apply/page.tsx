"use client";

import { useState, useEffect } from "react";
import Step1Personal from "@/components/forms/Step1Personal";
import Step2OriginProgram from "@/components/forms/Step2OriginProgram";
import Step3Guardian from "@/components/forms/Step3Guardian";
import Step4AttachmentsReview from "@/components/forms/Step4AttachmentsReview";
import { ApplicationFormData } from "@/types/applications";
import { PrimaryButton, SecondaryButton } from "@/components/shared";
import { toast } from "react-toastify";

const defaultForm: ApplicationFormData = {
  firstName: "",
  middleName: "",
  lastName: "",
  gender: "male",
  dateOfBirth: "",
  email: "",
  phone: "",
  nin: "",
  specialNeeds: "",
  stateOfOrigin: "Kano",
  lgaOfOrigin: "Karaye",
  religion: "muslim",
  address: "",
  programId: "",
  classAppliedFor: "",
  admissionType: "fresh",
  previousSchool: "",
  previousQualification: "",
  guardianFirstName: "",
  guardianMiddleName: "",
  guardianLastName: "",
  guardianGender: "male",
  guardianStatus: "father",
  guardianPhone: "",
  guardianEmail: "",
  guardianImageId: "",
  passportImageId: "",
  supportingDocuments: [],
  attestationDate: "",
};

// ✅ Step validation rules
const stepValidations: Record<number, (data: ApplicationFormData) => boolean> = {
  1: (data) =>
    !!data.firstName.trim() &&
    !!data.lastName.trim() &&
    !!data.email.trim() &&
    !!data.phone.trim() &&
    !!data.dateOfBirth.trim(),

  2: (data) =>
    !!data.stateOfOrigin.trim() &&
    !!data.lgaOfOrigin.trim() &&
    !!data.programId &&
    !!data.classAppliedFor &&
    !!data.admissionType,

  3: (data) =>
    !!data.guardianFirstName.trim() &&
    !!data.guardianLastName.trim() &&
    !!data.guardianPhone.trim() &&
    !!data.guardianEmail.trim() &&
    !!data.guardianStatus &&
    !!data.guardianGender,

  4: (data) =>
    !!data.passportImageId && !!data.attestationDate, // optional supporting docs can be skipped
};

export default function ApplyPage() {
  const [data, setData] = useState<ApplicationFormData>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("applicationForm");
      return saved ? JSON.parse(saved) : defaultForm;
    }
    return defaultForm;
  });

  const [programs, setPrograms] = useState<{ id: string; name: string }[]>([]);
  const [step, setStep] = useState(1);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem("applicationForm", JSON.stringify(data));
  }, [data]);

  // Fetch programs dynamically from API
  useEffect(() => {
    fetch("/api/programs")
      .then((res) => res.json())
      .then((progs) => setPrograms(progs))
      .catch(console.error);
  }, []);

  // ✅ Navigate steps with validation
  const nextStep = () => {
    if (!stepValidations[step](data)) {
      toast.error("Please fill all required fields before proceeding.");
      return;
    }
    setStep((s) => Math.min(s + 1, 4));
  };
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    if (!stepValidations[4](data)) {
      toast.error("Please complete all required attachments before submitting.");
      return;
    }

    try {
      const submissionData: ApplicationFormData = {
        ...data,
        supportingDocuments: data.supportingDocuments || [],
      };

      const res: Response = await fetch("/api/applications/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submissionData),
      });

      if (!res.ok) {
        const json: { error?: string } = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to submit");
      }

      localStorage.removeItem("applicationForm");
      toast.success("Application submitted successfully!");
      setData(defaultForm);
      setStep(1);
    } catch (err: unknown) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "Failed to submit. Try again.";
      toast.error(errorMessage);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 pt-[calc(6rem+1rem)] space-y-6">
      <h1 className="text-2xl font-bold">Apply to SYK Health Tech</h1>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
        <div
          className="bg-primary-500 h-2 rounded-full transition-all"
          style={{ width: `${(step / 4) * 100}%` }}
        />
      </div>

      {/* Steps */}
      {step === 1 && <Step1Personal data={data} setData={(newData) => setData({ ...data, ...newData })} />}
      {step === 2 && <Step2OriginProgram data={data} setData={(newData) => setData({ ...data, ...newData })} programs={programs} />}
      {step === 3 && <Step3Guardian data={data} setData={(newData) => setData({ ...data, ...newData })} />}
      {step === 4 && <Step4AttachmentsReview data={data} setData={(newData) => setData({ ...data, ...newData })} />}

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        {step > 1 ? (
          <SecondaryButton onClick={prevStep}>Back</SecondaryButton>
        ) : <div />}

        {step < 4 ? (
          <PrimaryButton onClick={nextStep}>Next</PrimaryButton>
        ) : (
          <PrimaryButton onClick={handleSubmit} className="bg-green-600 hover:bg-green-700">
            Submit
          </PrimaryButton>
        )}
      </div>
    </div>
  );
}
