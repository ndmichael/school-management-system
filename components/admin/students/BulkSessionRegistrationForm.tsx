"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
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
  error?: string;
};

type PreviewClassification =
  | "eligible"
  | "needs_review"
  | "excluded"
  | "already_registered";

type PreviewStudent = {
  student_id: string;
  matric_no: string;
  name: string;

  programme: {
    id: string;
    name: string | null;
  } | null;

  approved_level: string | null;
  classification: PreviewClassification;
  reasons: string[];
};

type PreviewResponse = {
  summary: {
    total: number;
    eligible: number;
    needs_review: number;
    excluded: number;
    already_registered: number;
  };

  students: PreviewStudent[];
  error?: string;
};

/**
 * Returns the visual style for each preview classification.
 */
function getClassificationStyle(
  classification: PreviewClassification,
): string {
  switch (classification) {
    case "eligible":
      return "bg-emerald-100 text-emerald-700";

    case "needs_review":
      return "bg-amber-100 text-amber-700";

    case "excluded":
      return "bg-red-100 text-red-700";

    case "already_registered":
      return "bg-slate-100 text-slate-700";
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

  const [isLoadingOptions, setIsLoadingOptions] =
    useState(true);

  const [isLoadingPreview, setIsLoadingPreview] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  /**
   * Load the source and target session candidates.
   *
   * Browser cookies are sent automatically, so the admin guard
   * receives the existing logged-in session.
   */
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
          },
        );

        const payload =
          (await response.json()) as OptionsResponse;

        if (!response.ok) {
          throw new Error(
            payload.error ??
              "Failed to load session options.",
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

  /**
   * Remove the selected source from the target dropdown.
   *
   * This improves the UI, but the preview API still performs
   * the real backend validation.
   */
  const availableTargetSessions = useMemo(
    () =>
      targetSessions.filter(
        (session) =>
          session.id !== sourceSessionId,
      ),
    [sourceSessionId, targetSessions],
  );

  function handleSourceChange(
    selectedSourceId: string,
  ) {
    setSourceSessionId(selectedSourceId);
    setPreview(null);
    setErrorMessage("");

    /*
     * Clear the target if it was previously the same session.
     */
    if (targetSessionId === selectedSourceId) {
      setTargetSessionId("");
    }
  }

  async function handlePreview(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setErrorMessage("");
    setPreview(null);

    if (!sourceSessionId) {
      setErrorMessage("Select a source session.");
      return;
    }

    if (!targetSessionId) {
      setErrorMessage("Select a target session.");
      return;
    }

    setIsLoadingPreview(true);

    try {
      const response = await fetch(
        "/api/admin/student-registrations/bulk/preview",
        {
          method: "POST",
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
        (await response.json()) as PreviewResponse;

      if (!response.ok) {
        throw new Error(
          payload.error ??
            "Failed to generate registration preview.",
        );
      }

      setPreview(payload);
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

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Bulk Session Registration
        </h2>

        <p className="mt-1 text-sm text-slate-600">
          Review students from an existing session before
          registering them into another session.
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <form
        onSubmit={handlePreview}
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor="source-session"
              className="text-sm font-medium text-slate-700"
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
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
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
          </div>

          <div className="space-y-2">
            <label
              htmlFor="target-session"
              className="text-sm font-medium text-slate-700"
            >
              Target session
            </label>

            <select
              id="target-session"
              value={targetSessionId}
              onChange={(event) => {
                setTargetSessionId(event.target.value);
                setPreview(null);
                setErrorMessage("");
              }}
              disabled={
                isLoadingOptions || !sourceSessionId
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
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
          </div>
        </div>

        <button
          type="submit"
          disabled={
            isLoadingPreview ||
            isLoadingOptions ||
            !sourceSessionId ||
            !targetSessionId
          }
          className="mt-5 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoadingPreview
            ? "Generating preview..."
            : "Preview students"}
        </button>
      </form>

      {preview && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {Object.entries(preview.summary).map(
              ([label, count]) => (
                <div
                  key={label}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <p className="text-xs font-medium uppercase text-slate-500">
                    {label.replaceAll("_", " ")}
                  </p>

                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {count}
                  </p>
                </div>
              ),
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      Student
                    </th>
                    <th className="px-4 py-3 text-left">
                      Programme
                    </th>
                    <th className="px-4 py-3 text-left">
                      Level
                    </th>
                    <th className="px-4 py-3 text-left">
                      Classification
                    </th>
                    <th className="px-4 py-3 text-left">
                      Reason
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {preview.students.map((student) => (
                    <tr key={student.student_id}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">
                          {student.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {student.matric_no}
                        </p>
                      </td>

                      <td className="px-4 py-3 text-slate-700">
                        {student.programme?.name ??
                          "Not assigned"}
                      </td>

                      <td className="px-4 py-3 text-slate-700">
                        {student.approved_level ?? "—"}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${getClassificationStyle(
                            student.classification,
                          )}`}
                        >
                          {student.classification.replaceAll(
                            "_",
                            " ",
                          )}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-slate-600">
                        {student.reasons.length > 0
                          ? student.reasons.join(" ")
                          : "Ready for registration."}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}