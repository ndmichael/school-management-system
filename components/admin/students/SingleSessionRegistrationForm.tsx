"use client";

import {
  type FormEvent,
  useEffect,
  useState,
} from "react";

import {
  getSessionStatus,
  isSessionAvailableForRegistration,
} from "@/lib/sessions/session-status";

import StudentSearchCombobox, {
  getStudentSearchLabel,
  type StudentSearchOption,
} from "@/components/admin/students/StudentSearchCombobox";

type RegistrationStatus = "registered" | "deferred";

type AcademicSession = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean | null;
  current_semester?: "first" | "second" | null;
};

type SessionsResponse = {
  ok?: boolean;
  sessions?: unknown[];
  error?: string;
};

type RegistrationResponse = {
  registration?: {
    registration_id: string;
    student_id: string;
    session_id: string;
    level: string | null;
    status: RegistrationStatus;
  };
  error?: string;
};

/**
 * Confirms that a value returned by the sessions API
 * contains every field required by the registration UI.
 *
 * This prevents malformed API responses from silently
 * producing an empty dropdown.
 */
function isAcademicSession(
  value: unknown,
): value is AcademicSession {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const session = value as Record<string, unknown>;

  return (
    typeof session.id === "string" &&
    typeof session.name === "string" &&
    typeof session.start_date === "string" &&
    typeof session.end_date === "string" &&
    (
      typeof session.is_active === "boolean" ||
      session.is_active === null
    )
  );
}

/**
 * Reads a useful error message from an API response.
 */
async function readErrorMessage(
  response: Response,
): Promise<string> {
  const payload = (await response
    .json()
    .catch(() => null)) as
    | { error?: string; message?: string }
    | null;

  return (
    payload?.error ||
    payload?.message ||
    `Request failed (${response.status}).`
  );
}

export default function SingleSessionRegistrationForm() {
  /*
   * Student search results are managed inside
   * StudentSearchCombobox.
   *
   * This form stores only the student selected by the admin.
   */
  const [
    selectedStudent,
    setSelectedStudent,
  ] = useState<StudentSearchOption | null>(null);

  const [sessions, setSessions] = useState<
    AcademicSession[]
  >([]);

  const [sessionId, setSessionId] = useState("");
  const [level, setLevel] = useState("");

  const [status, setStatus] =
    useState<RegistrationStatus>("registered");

  const [
    isLoadingSessions,
    setIsLoadingSessions,
  ] = useState(true);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  /**
   * Load only academic sessions when the page opens.
   *
   * Students are no longer fetched here. They are searched
   * remotely by StudentSearchCombobox when the admin types.
   */
  useEffect(() => {
    const controller = new AbortController();

    async function loadSessions() {
      setIsLoadingSessions(true);
      setErrorMessage("");

      try {
        const response = await fetch(
          "/api/admin/sessions",
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error(
            await readErrorMessage(response),
          );
        }

        const payload =
          (await response.json()) as SessionsResponse;

        const rawSessions = Array.isArray(
          payload.sessions,
        )
          ? payload.sessions
          : [];

        /*
         * Validate the API response instead of casting it
         * and later wondering why the dropdown is empty.
         */
        const validSessions =
          rawSessions.filter(isAcademicSession);

        if (
          rawSessions.length > 0 &&
          validSessions.length === 0
        ) {
          throw new Error(
            "The sessions API must return id, name, start_date, end_date and is_active.",
          );
        }

        /*
         * Remove completed sessions and sort:
         *
         * 1. Active session first
         * 2. Upcoming sessions by starting date
         */
        const availableSessions = validSessions
          .filter((session) =>
            isSessionAvailableForRegistration(
              session.is_active,
              session.end_date,
            ),
          )
          .sort((firstSession, secondSession) => {
            if (
              firstSession.is_active === true &&
              secondSession.is_active !== true
            ) {
              return -1;
            }

            if (
              secondSession.is_active === true &&
              firstSession.is_active !== true
            ) {
              return 1;
            }

            return firstSession.start_date.localeCompare(
              secondSession.start_date,
            );
          });

        setSessions(availableSessions);

        /*
         * Automatically select the active session.
         *
         * When no session is active, the admin must select
         * one of the upcoming sessions manually.
         */
        const activeSession =
          availableSessions.find(
            (session) =>
              session.is_active === true,
          );

        setSessionId((currentSessionId) => {
          const currentSelectionStillExists =
            availableSessions.some(
              (session) =>
                session.id === currentSessionId,
            );

          if (currentSelectionStillExists) {
            return currentSessionId;
          }

          return activeSession?.id ?? "";
        });
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        console.error(
          "Failed to load academic sessions:",
          error,
        );

        setSessions([]);
        setSessionId("");

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load academic sessions.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingSessions(false);
        }
      }
    }

    void loadSessions();

    return () => {
      controller.abort();
    };
  }, []);

  /**
   * Register the selected student into the selected session.
   */
  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    /*
     * Client validation improves user experience.
     *
     * The protected API and RPC must still repeat all
     * critical validation because the browser is not trusted.
     */
    if (!selectedStudent) {
      setErrorMessage("Select a student.");
      return;
    }

    if (!sessionId) {
      setErrorMessage(
        "Select an academic session.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        "/api/admin/student-registrations",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            student_id: selectedStudent.id,
            session_id: sessionId,

            /*
             * Null tells the RPC to use the student's
             * existing level when the field is empty.
             */
            level: level.trim() || null,
            status,
          }),
        },
      );

      const payload =
        (await response
          .json()
          .catch(() => null)) as
        | RegistrationResponse
        | null;

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            "Failed to register student.",
        );
      }

      const selectedSession = sessions.find(
        (session) =>
          session.id === sessionId,
      );

      const studentLabel =
        getStudentSearchLabel(selectedStudent);

      setSuccessMessage(
        `${studentLabel} was registered successfully${
          selectedSession
            ? ` for ${selectedSession.name}`
            : ""
        }.`,
      );

      /*
       * Keep the selected session because the admin may
       * register several students into the same session.
       */
      setSelectedStudent(null);
      setLevel("");
      setStatus("registered");
    } catch (error) {
      console.error(
        "Single session registration failed:",
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to register student.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="max-w-3xl rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Form heading */}
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-lg font-semibold text-slate-900">
          Single Registration
        </h2>

        <p className="mt-1 text-sm text-slate-600">
          Select a student and register them into an
          academic session.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 p-6"
      >
        {/* Live student search and selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">
            Student
          </label>

          <StudentSearchCombobox
            value={selectedStudent}
            disabled={isSubmitting}
            onChange={(student) => {
              setSelectedStudent(student);
              setErrorMessage("");
              setSuccessMessage("");

              /*
               * Pre-fill the level with the student's
               * current session-registration level.
               */
              setLevel(student?.level ?? "");
            }}
          />

          <p className="text-xs text-slate-500">
            Enter at least two characters to search by
            name or matric number.
          </p>
        </div>

        {/* Active and upcoming session selection */}
        <div className="space-y-2">
          <label
            htmlFor="session"
            className="block text-sm font-medium text-slate-700"
          >
            Academic session
          </label>

          <select
            id="session"
            value={sessionId}
            onChange={(event) => {
              setSessionId(event.target.value);
              setErrorMessage("");
              setSuccessMessage("");
            }}
            disabled={
              isLoadingSessions ||
              sessions.length === 0
            }
            required
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            <option value="">
              {isLoadingSessions
                ? "Loading sessions..."
                : sessions.length === 0
                  ? "No active or upcoming sessions"
                  : "Select an academic session"}
            </option>

            {sessions.map((session) => {
              const sessionStatus =
              getSessionStatus(
                session.is_active,
                session.end_date,
              );
              const isActive = sessionStatus === "active";

              return (
                <option
                  key={session.id}
                  value={session.id}
                  className={
                    isActive
                      ? "font-extrabold text-emerald-600"
                      : "font-normal text-slate-900"
                  }
                >
                  {session.name} - {isActive ? "Active" : "Upcoming"}
                </option>
              );
            })}
          </select>

          {!isLoadingSessions &&
            sessions.length === 0 && (
              <p className="text-sm text-amber-700">
                No active or upcoming academic session is
                available.
              </p>
            )}
        </div>

        {/* Approved level and registration status */}
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor="level"
              className="block text-sm font-medium text-slate-700"
            >
              Approved level
            </label>

            <input
              id="level"
              type="text"
              value={level}
              onChange={(event) =>
                setLevel(event.target.value)
              }
              placeholder="Example: 200"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />

            <p className="text-xs text-slate-500">
              Review the student’s current level before
              submitting.
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="registration-status"
              className="block text-sm font-medium text-slate-700"
            >
              Registration status
            </label>

            <select
              id="registration-status"
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target
                    .value as RegistrationStatus,
                )
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            >
              <option value="registered">
                Registered
              </option>

              <option value="deferred">
                Deferred
              </option>
            </select>
          </div>
        </div>

        {/* API feedback */}
        <div aria-live="polite">
          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </div>
          )}
        </div>

        {/* Submit action */}
        <div className="flex justify-end border-t border-slate-200 pt-5">
          <button
            type="submit"
            disabled={
              isLoadingSessions ||
              isSubmitting ||
              !selectedStudent ||
              !sessionId
            }
            className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting
              ? "Registering..."
              : "Register student"}
          </button>
        </div>
      </form>
    </section>
  );
}