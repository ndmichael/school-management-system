"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";

import Step1Personal from "@/components/forms/Step1Personal";
import Step2OriginProgram from "@/components/forms/Step2OriginProgram";
import Step3Guardian from "@/components/forms/Step3Guardian";
import Step4AttachmentsReview from "@/components/forms/Step4AttachmentsReview";

import type { ApplicationFormData } from "@/types/applications";
import { PrimaryButton, SecondaryButton } from "@/components/shared";

/* =========================
   CONSTANTS
========================= */

type ProgramOption = { id: string; name: string };
const STORAGE_KEY = "applicationForm";

/* =========================
   DEFAULT FORM (SOURCE OF TRUTH)
========================= */

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

  attestationDate: "",

  passportFile: null,
  signatureFile: null,
  academicResultFile: null,
  birthCertificateFile: null,
  sponsorshipLetterFile: null,
};

/* =========================
   STEP VALIDATIONS
========================= */

const stepValidations: Record<number, (d: ApplicationFormData) => boolean> = {
  1: (d) =>
    d.firstName.trim() !== "" &&
    d.lastName.trim() !== "" &&
    d.email.trim() !== "" &&
    d.phone.trim() !== "" &&
    d.dateOfBirth.trim() !== "",

  2: (d) => {
    if (
      !d.stateOfOrigin ||
      !d.lgaOfOrigin ||
      !d.address ||
      !d.programId ||
      !d.classAppliedFor
    ) {
      return false;
    }

    if (
      d.admissionType === "direct_entry" &&
      (!d.previousSchool.trim() || !d.previousQualification.trim())
    ) {
      return false;
    }

    return true;
  },

  3: (d) =>
    d.guardianFirstName.trim() !== "" &&
    d.guardianLastName.trim() !== "" &&
    d.guardianPhone.trim() !== "",

  4: (d) =>
    !!d.passportFile?.path &&
    !!d.signatureFile?.path &&
    !!d.academicResultFile?.path &&
    !!d.birthCertificateFile?.path &&
    d.attestationDate.trim() !== "",
};

/* =========================
   HELPERS
========================= */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/* =========================
   PAGE
========================= */

export default function ApplyPage() {
  const [data, setData] = useState<ApplicationFormData>(() => {
    if (typeof window === "undefined") return defaultForm;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return defaultForm;

      const parsed: unknown = JSON.parse(saved);
      if (!isRecord(parsed)) return defaultForm;

      return { ...defaultForm, ...(parsed as Partial<ApplicationFormData>) };
    } catch {
      return defaultForm;
    }
  });

  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  /* =========================
     PERSIST FORM
  ========================= */

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  /* =========================
     LOAD PROGRAMS
  ========================= */

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/programs");
        if (!res.ok) throw new Error();

        const json: unknown = await res.json();
        if (!isRecord(json) || !Array.isArray(json.programs)) throw new Error();

        setPrograms(
          json.programs
            .filter(isRecord)
            .map((p) => ({ id: String(p.id), name: String(p.name) }))
        );
      } catch {
        toast.error("Failed to load programs.");
      }
    })();
  }, []);

  /* =========================
     ACTIONS
  ========================= */

  const updateData = useCallback(
    (patch: Partial<ApplicationFormData>) =>
      setData((prev) => ({ ...prev, ...patch })),
    []
  );

  const nextStep = () => {
    if (!stepValidations[step](data)) {
      toast.error("Please complete all required fields.");
      return;
    }
    setStep((s) => Math.min(s + 1, 4));
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    if (!stepValidations[4](data)) {
      toast.error("Please complete all required documents.");
      return;
    }

    try {
      setSubmitting(true);

      const res = await fetch("/api/applications/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ?? "Submission failed");
      }

      toast.success("Application submitted successfully");
      localStorage.removeItem(STORAGE_KEY);
      setData(defaultForm);
      setStep(1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  /* =========================
     RENDER
  ========================= */

  return (
    <div className="max-w-3xl mx-auto p-6 pt-24 space-y-6">
      <h1 className="text-2xl font-bold">
        Apply to SYK School of Health Technology
      </h1>

      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-primary-500 h-2 rounded-full transition-all"
          style={{ width: `${(step / 4) * 100}%` }}
        />
      </div>

      {step === 1 && <Step1Personal data={data} setData={updateData} />}
      {step === 2 && (
        <Step2OriginProgram
          data={data}
          setData={updateData}
          programs={programs}
        />
      )}
      {step === 3 && <Step3Guardian data={data} setData={updateData} />}
      {step === 4 && <Step4AttachmentsReview data={data} setData={updateData} />}

      <div className="flex justify-between pt-4">
        {step > 1 ? (
          <SecondaryButton onClick={prevStep} disabled={submitting}>
            Back
          </SecondaryButton>
        ) : (
          <span />
        )}

        {step < 4 ? (
          <PrimaryButton onClick={nextStep} disabled={submitting}>
            Next
          </PrimaryButton>
        ) : (
          <PrimaryButton
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-green-600 hover:bg-green-700"
          >
            {submitting ? "Submitting…" : "Submit"}
          </PrimaryButton>
        )}
      </div>
    </div>
  );
}
