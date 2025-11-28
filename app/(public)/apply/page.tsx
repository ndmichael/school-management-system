"use client";

import { useState, useEffect } from "react";
import Step1Personal from "@/components/forms/Step1Personal";
import Step2OriginProgram from "@/components/forms/Step2OriginProgram";
import Step3Guardian from "@/components/forms/Step3Guardian";
import Step4AttachmentsReview from "@/components/forms/Step4AttachmentsReview";
import { ApplicationFormData } from "@/types/applications";
import { PrimaryButton, SecondaryButton } from "@/components/shared";
// import { databases } from "@/utils/appwriteClient";
// import { ID } from "appwrite";

// Default empty form
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
  stateOfOrigin: "",
  lgaOfOrigin: "",
  religion: "",
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

export default function ApplyPage() {
  const [data, setData] = useState<ApplicationFormData>(() => {
    // Load from localStorage if exists
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("applicationForm");
      return saved ? JSON.parse(saved) : defaultForm;
    }
    return defaultForm;
  });

  const [step, setStep] = useState(1);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem("applicationForm", JSON.stringify(data));
  }, [data]);

  // Example programs (replace with Appwrite fetch)
  const programs = [
    { id: "prog1", name: "Medical Laboratory Science" },
    { id: "prog2", name: "Community Health" },
    { id: "prog3", name: "Pharmacy Technology" },
  ];

  const nextStep = () => setStep((s) => Math.min(s + 1, 4));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    try {
      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DB_ID!,
        "applications",
        ID.unique(),
        data
      );
      localStorage.removeItem("applicationForm");
      alert("Application submitted successfully!");
      setData(defaultForm);
      setStep(1);
    } catch (err) {
      console.error(err);
      alert("Failed to submit. Try again.");
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 pt-[calc(6rem+1rem)] space-y-6">
      <h1 className="text-2xl font-bold">Apply to SYK Health Tech</h1>

      <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
        <div
          className="bg-primary-500 h-2 rounded-full transition-all"
          style={{ width: `${(step / 4) * 100}%` }}
        />
      </div>

      {step === 1 && <Step1Personal data={data} setData={setData} />}
      {step === 2 && <Step2OriginProgram data={data} setData={setData} programs={programs} />}
      {step === 3 && <Step3Guardian data={data} setData={setData} />}
      {step === 4 && <Step4AttachmentsReview data={data} setData={setData} />}

      <div className="flex justify-between mt-6">
        {step > 1 ? (
          <SecondaryButton onClick={prevStep}>
            Back
          </SecondaryButton>
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
