"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type SessionOption = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  current_semester: string | null;
  registration_count: number;
};

type OptionsResponse = {
  source_sessions: SessionOption[];
  target_sessions: SessionOption[];
};

type OptionsApiResponse =
  | OptionsResponse
  | {
      error: string;
    };

type PreviewClassification =
  | "eligible"
  | "needs_review"
  | "excluded"
  | "already_registered";

type PreviewSummary = {
  total: number;
  eligible: number;
  needs_review: number;
  excluded: number;
  already_registered: number;
};

type PreviewStudent = {
  student_id: string;
  matric_no: string;
  name: string;

  programme: {
    id: string;
    name: string | null;
  } | null;

  student_status: string | null;
  source_registration_status: string;

  current_level: string | null;
  source_level: string | null;
  approved_level: string | null;

  classification: PreviewClassification;
  reasons: string[];
};

type PreviewResponse = {
  summary: PreviewSummary;
  students: PreviewStudent[];
};

type PreviewApiResponse =
  | PreviewResponse
  | {
      error: string;
    };

type SkippedStudent = {
  student_id: string;
  reason: string;
};

type BulkRegistrationResult = {
  submitted_count: number;
  inserted_count: number;
  updated_level_count: number;
  skipped_count: number;
  skipped: SkippedStudent[];
};

type BulkExecutionResponse =
  | {
      message: string;
      result: BulkRegistrationResult;
    }
  | {
      error: string;
    };

type StudentFilter =
  | "all"
  | PreviewClassification;

function isSelectableStudent(
  student: PreviewStudent,
): boolean {
  return (
    student.classification === "eligible" ||
    student.classification === "needs_review"
  );
}

function getClassificationLabel(
  classification: PreviewClassification,
): string {
  switch (classification) {
    case "eligible":
      return "Eligible";
    case "needs_review":
      return "Needs review";
    case "excluded":
      return "Excluded";
    case "already_registered":
      return "Already registered";
  }
}

function getClassificationStyle(
  classification: PreviewClassification,
): string {
  switch (classification) {
    case "eligible":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "needs_review":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "excluded":
      return "border-red-200 bg-red-50 text-red-700";
    case "already_registered":
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
}

function getRowStyle(
  classification: PreviewClassification,
): string {
  switch (classification) {
    case "eligible":
      return "hover:bg-emerald-50/40";
    case "needs_review":
      return "bg-amber-50/30 hover:bg-amber-50/60";
    case "excluded":
      return "bg-red-50/20";
    case "already_registered":
      return "bg-slate-50/70";
  }
}

export default function BulkSessionRegistrationForm() {
  const [sourceSessions, setSourceSessions] =
    useState<SessionOption[]>([]);
  const [targetSessions, setTargetSessions] =
    useState<SessionOption[]>([]);
  const [sourceSessionId, setSourceSessionId] =
    useState("");
  const [targetSessionId, setTargetSessionId] =
    useState("");
  const [preview, setPreview] =
    useState<PreviewResponse | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] =
    useState<Set<string>>(new Set());
  const [studentLevels, setStudentLevels] =
    useState<Record<string, string>>({});
  const [
    updateStudentLevelIds,
    setUpdateStudentLevelIds,
  ] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] =
    useState<StudentFilter>("all");
  const [searchTerm, setSearchTerm] =
    useState("");
  const [isLoadingOptions, setIsLoadingOptions] =
    useState(true);
  const [isLoadingPreview, setIsLoadingPreview] =
    useState(false);
  const [isRegistering, setIsRegistering] =
    useState(false);
  const [isConfirmOpen, setIsConfirmOpen] =
    useState(false);
  const [errorMessage, setErrorMessage] =
    useState("");
  const [executionResult, setExecutionResult] =
    useState<BulkRegistrationResult | null>(null);

  const selectAllCheckboxRef =
    useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadSessionOptions() {
      setIsLoadingOptions(true);
      setErrorMessage("");

      try {
        const response = await fetch(
          "/api/admin/student-registrations/bulk/options",
          {
            method: "GET",
            cache: "no-store",
            credentials: "same-origin",
          },
        );

        const payload =
          (await response.json()) as OptionsApiResponse;

        if (
          !response.ok ||
          !("source_sessions" in payload)
        ) {
          throw new Error(
            "error" in payload
              ? payload.error
              : "Failed to load session options.",
          );
        }

        setSourceSessions(payload.source_sessions);
        setTargetSessions(payload.target_sessions);
      } catch (error) {
        console.error(
          "Failed to load bulk session options:",
          error,
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load session options.",
        );
      } finally {
        setIsLoadingOptions(false);
      }
    }

    void loadSessionOptions();
  }, []);

  const availableTargetSessions = useMemo(
    () =>
      targetSessions.filter(
        (session) =>
          session.id !== sourceSessionId,
      ),
    [sourceSessionId, targetSessions],
  );

  const selectedSourceSession = useMemo(
    () =>
      sourceSessions.find(
        (session) =>
          session.id === sourceSessionId,
      ) ?? null,
    [sourceSessionId, sourceSessions],
  );

  const selectedTargetSession = useMemo(
    () =>
      targetSessions.find(
        (session) =>
          session.id === targetSessionId,
      ) ?? null,
    [targetSessionId, targetSessions],
  );

  const eligibleStudents = useMemo(
    () =>
      preview?.students.filter(
        (student) =>
          student.classification === "eligible",
      ) ?? [],
    [preview],
  );

  const selectableStudents = useMemo(
    () =>
      preview?.students.filter(
        isSelectableStudent,
      ) ?? [],
    [preview],
  );

  const selectedStudents = useMemo(
    () =>
      selectableStudents.filter((student) =>
        selectedStudentIds.has(student.student_id),
      ),
    [selectableStudents, selectedStudentIds],
  );

  const visibleStudents = useMemo(() => {
    if (!preview) {
      return [];
    }

    const normalisedSearch =
      searchTerm.trim().toLowerCase();

    return preview.students.filter((student) => {
      const matchesFilter =
        activeFilter === "all" ||
        student.classification === activeFilter;

      if (!matchesFilter) {
        return false;
      }

      if (!normalisedSearch) {
        return true;
      }

      const searchableText = [
        student.name,
        student.matric_no,
        student.programme?.name ?? "",
        student.approved_level ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(
        normalisedSearch,
      );
    });
  }, [activeFilter, preview, searchTerm]);

  const allEligibleSelected =
    eligibleStudents.length > 0 &&
    eligibleStudents.every((student) =>
      selectedStudentIds.has(student.student_id),
    );

  const someEligibleSelected =
    eligibleStudents.some((student) =>
      selectedStudentIds.has(student.student_id),
    );

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate =
        someEligibleSelected &&
        !allEligibleSelected;
    }
  }, [
    allEligibleSelected,
    someEligibleSelected,
  ]);

  function clearPreviewState() {
    setPreview(null);
    setSelectedStudentIds(new Set<string>());
    setStudentLevels({});
    setUpdateStudentLevelIds(new Set<string>());
    setExecutionResult(null);
    setActiveFilter("all");
    setSearchTerm("");
    setIsConfirmOpen(false);
  }

  function handleSourceChange(
    selectedSourceId: string,
  ) {
    setSourceSessionId(selectedSourceId);
    setErrorMessage("");
    clearPreviewState();

    if (targetSessionId === selectedSourceId) {
      setTargetSessionId("");
    }
  }

  function handleTargetChange(
    selectedTargetId: string,
  ) {
    setTargetSessionId(selectedTargetId);
    setErrorMessage("");
    clearPreviewState();
  }

  async function generatePreview(
    options: {
      preserveExecutionResult?: boolean;
      autoSelectEligible?: boolean;
    } = {},
  ) {
    const {
      preserveExecutionResult = false,
      autoSelectEligible = true,
    } = options;

    if (!sourceSessionId) {
      setErrorMessage("Select a source session.");
      return;
    }

    if (!targetSessionId) {
      setErrorMessage("Select a target session.");
      return;
    }

    setIsLoadingPreview(true);
    setErrorMessage("");

    if (!preserveExecutionResult) {
      setExecutionResult(null);
    }

    try {
      const response = await fetch(
        "/api/admin/student-registrations/bulk/preview",
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            source_session_id: sourceSessionId,
            target_session_id: targetSessionId,
          }),
        },
      );

      const payload =
        (await response.json()) as PreviewApiResponse;

      if (
        !response.ok ||
        !("students" in payload)
      ) {
        throw new Error(
          "error" in payload
            ? payload.error
            : "Failed to generate registration preview.",
        );
      }

      const initialLevels: Record<string, string> =
        Object.fromEntries(
          payload.students.map((student) => [
            student.student_id,
            student.approved_level ?? "",
          ]),
        );

      const initialSelectedIds =
        autoSelectEligible
          ? payload.students
              .filter(
                (student) =>
                  student.classification ===
                  "eligible",
              )
              .map(
                (student) =>
                  student.student_id,
              )
          : [];

      setPreview(payload);
      setSelectedStudentIds(
        new Set(initialSelectedIds),
      );
      setStudentLevels(initialLevels);
      setUpdateStudentLevelIds(new Set<string>());
      setActiveFilter("all");
      setSearchTerm("");
    } catch (error) {
      console.error(
        "Bulk registration preview failed:",
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to generate preview.",
      );
    } finally {
      setIsLoadingPreview(false);
    }
  }

  async function handlePreview(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    await generatePreview();
  }

  function handleToggleStudent(
    student: PreviewStudent,
  ) {
    if (!isSelectableStudent(student)) {
      return;
    }

    setSelectedStudentIds((current) => {
      const updated = new Set(current);

      if (updated.has(student.student_id)) {
        updated.delete(student.student_id);
      } else {
        updated.add(student.student_id);
      }

      return updated;
    });
  }

  function handleToggleAllEligible() {
    setSelectedStudentIds((current) => {
      const updated = new Set(current);

      if (allEligibleSelected) {
        eligibleStudents.forEach((student) => {
          updated.delete(student.student_id);
        });
      } else {
        eligibleStudents.forEach((student) => {
          updated.add(student.student_id);
        });
      }

      return updated;
    });
  }

  function handleClearSelection() {
    setSelectedStudentIds(new Set<string>());
    setUpdateStudentLevelIds(new Set<string>());
  }

  function handleLevelChange(
    studentId: string,
    level: string,
  ) {
    setStudentLevels((current) => ({
      ...current,
      [studentId]: level,
    }));
  }

  function handleUpdateStudentLevel(
    studentId: string,
  ) {
    setUpdateStudentLevelIds((current) => {
      const updated = new Set(current);

      if (updated.has(studentId)) {
        updated.delete(studentId);
      } else {
        updated.add(studentId);
      }

      return updated;
    });
  }

  async function executeBulkRegistration() {
    if (selectedStudents.length === 0) {
      setErrorMessage(
        "Select at least one student.",
      );
      return;
    }

    setIsRegistering(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        "/api/admin/student-registrations/bulk",
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            source_session_id: sourceSessionId,
            target_session_id: targetSessionId,
            students: selectedStudents.map(
              (student) => ({
                student_id: student.student_id,
                level:
                  studentLevels[
                    student.student_id
                  ]?.trim() || null,
                update_student_level:
                  updateStudentLevelIds.has(
                    student.student_id,
                  ),
              }),
            ),
          }),
        },
      );

      const payload =
        (await response.json()) as BulkExecutionResponse;

      if (
        !response.ok ||
        !("result" in payload)
      ) {
        throw new Error(
          "error" in payload
            ? payload.error
            : "Bulk registration failed.",
        );
      }

      setExecutionResult(payload.result);
      setSelectedStudentIds(new Set<string>());
      setIsConfirmOpen(false);

      await generatePreview({
        preserveExecutionResult: true,
        autoSelectEligible: false,
      });
    } catch (error) {
      console.error(
        "Bulk registration failed:",
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to register students.",
      );

      setIsConfirmOpen(false);
    } finally {
      setIsRegistering(false);
    }
  }

  return (
    <section className="min-w-0 space-y-6">
      <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-lg">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
            Academic session management
          </p>

          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Bulk Session Registration
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            Select a source and target session, preview
            student eligibility, then confirm only the
            students who should be registered.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3"
        >
          <p className="text-sm font-semibold text-red-800">
            Something went wrong
          </p>
          <p className="mt-1 text-sm text-red-700">
            {errorMessage}
          </p>
        </div>
      )}

      {executionResult && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-semibold text-emerald-900">
                Bulk registration completed
              </p>
              <p className="mt-1 text-sm text-emerald-700">
                The target session has been refreshed with
                the latest registration results.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-white px-3 py-2 shadow-sm">
                <p className="text-xl font-bold text-emerald-700">
                  {executionResult.inserted_count}
                </p>
                <p className="text-xs text-slate-500">
                  Registered
                </p>
              </div>

              <div className="rounded-lg bg-white px-3 py-2 shadow-sm">
                <p className="text-xl font-bold text-amber-700">
                  {executionResult.skipped_count}
                </p>
                <p className="text-xs text-slate-500">
                  Skipped
                </p>
              </div>

              <div className="rounded-lg bg-white px-3 py-2 shadow-sm">
                <p className="text-xl font-bold text-blue-700">
                  {
                    executionResult.updated_level_count
                  }
                </p>
                <p className="text-xs text-slate-500">
                  Levels updated
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <form
        onSubmit={handlePreview}
        className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="border-b border-slate-100 pb-5">
          <p className="text-base font-semibold text-slate-900">
            Select academic sessions
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Choose the session containing the existing
            registrations and the active or upcoming session
            that should receive them.
          </p>
        </div>

        <div className="mt-5 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-end">
          <div className="min-w-0 space-y-2">
            <label
              htmlFor="source-session"
              className="text-sm font-semibold text-slate-700"
            >
              Source session
            </label>

            <select
              id="source-session"
              value={sourceSessionId}
              onChange={(event) =>
                handleSourceChange(event.target.value)
              }
              disabled={isLoadingOptions}
              className="h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <option value="">
                {isLoadingOptions
                  ? "Loading sessions..."
                  : "Select source session"}
              </option>

              {sourceSessions.map((session) => (
                <option
                  key={session.id}
                  value={session.id}
                >
                  {session.name} —{" "}
                  {session.registration_count} students
                </option>
              ))}
            </select>

            <p className="text-xs text-slate-500">
              Only sessions with existing registration
              history are shown.
            </p>
          </div>

          <div className="hidden pb-7 text-xl text-slate-300 lg:block">
            →
          </div>

          <div className="min-w-0 space-y-2">
            <label
              htmlFor="target-session"
              className="text-sm font-semibold text-slate-700"
            >
              Target session
            </label>

            <select
              id="target-session"
              value={targetSessionId}
              onChange={(event) =>
                handleTargetChange(event.target.value)
              }
              disabled={
                isLoadingOptions || !sourceSessionId
              }
              className="h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <option value="">
                Select target session
              </option>

              {availableTargetSessions.map(
                (session) => (
                  <option
                    key={session.id}
                    value={session.id}
                  >
                    {session.name}
                    {session.is_active
                      ? " — Active"
                      : " — Upcoming"}
                  </option>
                ),
              )}
            </select>

            <p className="text-xs text-slate-500">
              Completed sessions cannot receive new
              registrations.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Previewing does not change any database records.
          </p>

          <button
            type="submit"
            disabled={
              isLoadingPreview ||
              isLoadingOptions ||
              !sourceSessionId ||
              !targetSessionId
            }
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoadingPreview
              ? "Generating preview..."
              : preview
                ? "Refresh preview"
                : "Preview students"}
          </button>
        </div>
      </form>

      {preview && (
        <>
          <div className="min-w-0">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Registration preview
              </h3>

              <p className="text-sm text-slate-500">
                Review the classifications, select the
                appropriate students and adjust optional
                levels before confirming.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-500">
                    Total students
                  </p>
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                </div>
                <p className="mt-3 text-3xl font-bold text-slate-900">
                  {preview.summary.total}
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-emerald-700">
                    Eligible
                  </p>
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </div>
                <p className="mt-3 text-3xl font-bold text-emerald-800">
                  {preview.summary.eligible}
                </p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-amber-700">
                    Needs review
                  </p>
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                </div>
                <p className="mt-3 text-3xl font-bold text-amber-800">
                  {preview.summary.needs_review}
                </p>
              </div>

              <div className="rounded-2xl border border-red-200 bg-red-50/60 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-red-700">
                    Excluded
                  </p>
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                </div>
                <p className="mt-3 text-3xl font-bold text-red-800">
                  {preview.summary.excluded}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-100/70 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-600">
                    Already registered
                  </p>
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
                </div>
                <p className="mt-3 text-3xl font-bold text-slate-700">
                  {
                    preview.summary
                      .already_registered
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-4 sm:p-5">
              <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900">
                    Student selection
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Eligible students are selected
                    automatically. Students needing review
                    must be selected manually.
                  </p>
                </div>

                <div className="flex min-w-0 flex-col gap-3 sm:flex-row">
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(event) =>
                      setSearchTerm(event.target.value)
                    }
                    placeholder="Search student..."
                    className="h-10 w-full min-w-0 rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-slate-500 focus:ring-4 focus:ring-slate-100 sm:min-w-64"
                  />

                  <button
                    type="button"
                    onClick={handleClearSelection}
                    disabled={
                      selectedStudents.length === 0
                    }
                    className="h-10 shrink-0 rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Clear selection
                  </button>
                </div>
              </div>

              <div className="mt-4 flex max-w-full gap-2 overflow-x-auto pb-1">
                {(
                  [
                    {
                      value: "all",
                      label: "All",
                      count: preview.summary.total,
                    },
                    {
                      value: "eligible",
                      label: "Eligible",
                      count:
                        preview.summary.eligible,
                    },
                    {
                      value: "needs_review",
                      label: "Needs review",
                      count:
                        preview.summary
                          .needs_review,
                    },
                    {
                      value: "excluded",
                      label: "Excluded",
                      count:
                        preview.summary.excluded,
                    },
                    {
                      value: "already_registered",
                      label: "Registered",
                      count:
                        preview.summary
                          .already_registered,
                    },
                  ] as {
                    value: StudentFilter;
                    label: string;
                    count: number;
                  }[]
                ).map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() =>
                      setActiveFilter(filter.value)
                    }
                    className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      activeFilter === filter.value
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {filter.label} {filter.count}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-[620px] w-full overflow-x-auto overflow-y-auto">
              <table className="w-full min-w-[900px] divide-y divide-slate-200 text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50">
                  <tr>
                    <th className="w-14 px-4 py-3 text-left">
                      <input
                        ref={selectAllCheckboxRef}
                        type="checkbox"
                        checked={allEligibleSelected}
                        onChange={
                          handleToggleAllEligible
                        }
                        disabled={
                          eligibleStudents.length === 0
                        }
                        aria-label="Select all eligible students"
                        title="Select all eligible students"
                        className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-slate-900 disabled:cursor-not-allowed"
                      />
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Student
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Programme
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Optional level
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Review note
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {visibleStudents.map((student) => {
                    const isSelected =
                      selectedStudentIds.has(
                        student.student_id,
                      );

                    const isSelectable =
                      isSelectableStudent(student);

                    return (
                      <tr
                        key={student.student_id}
                        className={`transition ${getRowStyle(
                          student.classification,
                        )} ${
                          isSelected
                            ? "shadow-[inset_3px_0_0_#0f172a]"
                            : ""
                        }`}
                      >
                        <td className="px-4 py-4 align-top">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() =>
                              handleToggleStudent(
                                student,
                              )
                            }
                            disabled={!isSelectable}
                            aria-label={`Select ${student.name}`}
                            className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                          />
                        </td>

                        <td className="px-4 py-4 align-top">
                          <p className="font-semibold text-slate-900">
                            {student.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {student.matric_no}
                          </p>
                        </td>

                        <td className="px-4 py-4 align-top text-slate-700">
                          {student.programme?.name ?? (
                            <span className="font-medium text-amber-700">
                              Not assigned
                            </span>
                          )}
                        </td>

                        <td className="min-w-56 px-4 py-4 align-top">
                          <input
                            type="text"
                            value={
                              studentLevels[
                                student.student_id
                              ] ?? ""
                            }
                            onChange={(event) =>
                              handleLevelChange(
                                student.student_id,
                                event.target.value,
                              )
                            }
                            disabled={!isSelected}
                            placeholder="Optional"
                            className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                          />

                          <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                            <input
                              type="checkbox"
                              checked={updateStudentLevelIds.has(
                                student.student_id,
                              )}
                              onChange={() =>
                                handleUpdateStudentLevel(
                                  student.student_id,
                                )
                              }
                              disabled={
                                !isSelected ||
                                !studentLevels[
                                  student.student_id
                                ]?.trim()
                              }
                              className="h-3.5 w-3.5 rounded border-slate-300 accent-slate-900 disabled:cursor-not-allowed"
                            />
                            Update main student record
                          </label>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getClassificationStyle(
                              student.classification,
                            )}`}
                          >
                            {getClassificationLabel(
                              student.classification,
                            )}
                          </span>
                        </td>

                        <td className="max-w-sm px-4 py-4 align-top text-sm leading-5 text-slate-600">
                          {student.reasons.length > 0
                            ? student.reasons.join(" ")
                            : "Ready for registration."}
                        </td>
                      </tr>
                    );
                  })}

                  {visibleStudents.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-14 text-center"
                      >
                        <p className="font-medium text-slate-700">
                          No students found
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Adjust the filter or search term.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs text-slate-500">
              Showing {visibleStudents.length} of{" "}
              {preview.summary.total} students
            </div>
          </div>

          <div className="sticky bottom-4 z-20 min-w-0 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur sm:p-5">
            <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-2">
                  <p className="text-lg font-bold text-slate-900">
                    {selectedStudents.length}
                  </p>
                  <p className="text-sm font-medium text-slate-600">
                    of {selectableStudents.length}{" "}
                    selectable students
                  </p>
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  Excluded and already-registered students
                  cannot be submitted.
                </p>
              </div>

              <div className="flex min-w-0 flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() =>
                    void generatePreview()
                  }
                  disabled={
                    isLoadingPreview ||
                    isRegistering
                  }
                  className="min-h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Refresh preview
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setIsConfirmOpen(true)
                  }
                  disabled={
                    selectedStudents.length === 0 ||
                    isRegistering
                  }
                  className="min-h-11 rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Register {selectedStudents.length}{" "}
                  {selectedStudents.length === 1
                    ? "student"
                    : "students"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {isConfirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-confirm-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl font-bold text-slate-900">
              {selectedStudents.length}
            </div>

            <h3
              id="bulk-confirm-title"
              className="mt-5 text-xl font-bold text-slate-900"
            >
              Confirm bulk registration
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              You are about to register{" "}
              <strong>
                {selectedStudents.length}{" "}
                {selectedStudents.length === 1
                  ? "student"
                  : "students"}
              </strong>{" "}
              from{" "}
              <strong>
                {selectedSourceSession?.name ??
                  "the source session"}
              </strong>{" "}
              into{" "}
              <strong>
                {selectedTargetSession?.name ??
                  "the target session"}
              </strong>
              .
            </p>

            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              The backend will recheck eligibility,
              duplicates, programme assignment and session
              validity before inserting records.
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() =>
                  setIsConfirmOpen(false)
                }
                disabled={isRegistering}
                className="min-h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() =>
                  void executeBulkRegistration()
                }
                disabled={isRegistering}
                className="min-h-11 rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRegistering
                  ? "Registering students..."
                  : "Confirm registration"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
