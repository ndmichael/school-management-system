"use client";

import { useState, useEffect, useCallback } from "react";
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
  passportImageId: "",
  supportingDocuments: [],
  attestationDate: "",
};

const stepValidations: Record<number, (d: ApplicationFormData) => boolean> = {
  // STEP 1 – basic bio
  1: (d) =>
    d.firstName.trim() !== "" &&
    d.lastName.trim() !== "" &&
    d.email.trim() !== "" &&
    d.phone.trim() !== "" &&
    d.dateOfBirth.trim() !== "",

  // STEP 2 – origin + program
  2: (d) => {
    // core fields
    if (
      d.stateOfOrigin.trim() === "" ||
      d.lgaOfOrigin.trim() === "" ||
      d.address.trim() === "" ||
      d.programId.trim() === "" ||
      d.classAppliedFor.trim() === "" ||
      !d.religion ||
      !d.admissionType
    ) {
      return false;
    }

    // extra requirement for DIRECT ENTRY only
    if (d.admissionType === "direct_entry") {
      const prevSchool = (d.previousSchool ?? "").trim();
      const prevQual = (d.previousQualification ?? "").trim();
      if (prevSchool === "" || prevQual === "") return false;
    }

    return true;
  },

  // STEP 3 – guardian
  3: (d) =>
    d.guardianFirstName.trim() !== "" &&
    d.guardianLastName.trim() !== "" &&
    d.guardianPhone.trim() !== "" &&
    !!d.guardianGender &&
    !!d.guardianStatus,

  // STEP 4 – passport + attestation
  4: (d) =>
    d.passportImageId.trim() !== "" &&
    d.attestationDate.trim() !== "",
};




export default function ApplyPage() {
  const [data, setData] = useState<ApplicationFormData>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("applicationForm");
        return saved ? JSON.parse(saved) : { ...defaultForm };
      } catch {
        return { ...defaultForm };
      }
    }
    return { ...defaultForm };
  });

  const [programs, setPrograms] = useState<{ id: string; name: string }[]>([]);
  const [step, setStep] = useState<number>(1);

  // Auto-save to localStorage (stable and safe)
  useEffect(() => {
    localStorage.setItem("applicationForm", JSON.stringify(data));
  }, [data]);

  // Fetch programs
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/programs");
        if (!res.ok) throw new Error("Failed to load programs.");
        const list = await res.json();
        setPrograms(list);
      } catch (err) {
        console.error(err);
        toast.error("Unable to fetch programs.");
      }
    })();
  }, []);

  // 🔥 Safe merge function (no accidental overrides)
  const updateData = useCallback(
    (patch: Partial<ApplicationFormData>) => {
      setData((prev) => ({ ...prev, ...patch }));
    },
    []
  );

  // Step navigation
  const nextStep = () => {
    if (!stepValidations[step](data)) {
      toast.error("Please fill all required fields before proceeding.");
      return;
    }
    setStep((s) => Math.min(s + 1, 4));
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  // Submit
  const handleSubmit = async () => {
    if (!stepValidations[4](data)) {
      toast.error("Please complete all required fields to submit.");
      return;
    }

    try {
      const res = await fetch("/api/applications/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to submit.");
      }

      toast.success("Application submitted successfully!");
      localStorage.removeItem("applicationForm");

      setData({ ...defaultForm });
      setStep(1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Submission failed.";
      toast.error(msg);
      console.error(err);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 pt-[calc(6rem+1rem)] space-y-6">
      <h1 className="text-2xl font-bold">Apply to SYK Health Tech</h1>

      {/* Progress */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
        <div
          className="bg-primary-500 h-2 rounded-full transition-all"
          style={{ width: `${(step / 4) * 100}%` }}
        />
      </div>

      {/* Steps */}
      {step === 1 && <Step1Personal data={data} setData={updateData} />}
      {step === 2 && (
        <Step2OriginProgram data={data} setData={updateData} programs={programs} />
      )}
      {step === 3 && <Step3Guardian data={data} setData={updateData} />}
      {step === 4 && <Step4AttachmentsReview data={data} setData={updateData} />}

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        {step > 1 ? (
          <SecondaryButton onClick={prevStep}>Back</SecondaryButton>
        ) : (
          <div />
        )}

        {step < 4 ? (
          <PrimaryButton onClick={nextStep}>Next</PrimaryButton>
        ) : (
          <PrimaryButton
            onClick={handleSubmit}
            className="bg-green-600 hover:bg-green-700"
          >
            Submit
          </PrimaryButton>
        )}
      </div>
    </div>
  );
}
