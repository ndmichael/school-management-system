"use client";

import { useState } from "react";

import BulkSessionRegistrationForm from "./BulkSessionRegistrationForm";
import SingleSessionRegistrationForm from "./SingleSessionRegistrationForm";

type RegistrationTab = "single" | "bulk";

export default function SessionRegistrationTabs() {
  const [activeTab, setActiveTab] =
    useState<RegistrationTab>("single");

  return (
    <div className="space-y-6">
      <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setActiveTab("single")}
          className={`rounded-md px-4 py-2 text-sm font-medium ${
            activeTab === "single"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600"
          }`}
        >
          Single Registration
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("bulk")}
          className={`rounded-md px-4 py-2 text-sm font-medium ${
            activeTab === "bulk"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600"
          }`}
        >
          Bulk Registration
        </button>
      </div>

      {activeTab === "single" ? (
        <SingleSessionRegistrationForm />
      ) : (
        <BulkSessionRegistrationForm />
      )}
    </div>
  );
}