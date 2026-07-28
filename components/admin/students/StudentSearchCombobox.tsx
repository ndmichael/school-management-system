"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";


type StudentProfile = {
  first_name: string;
  middle_name: string | null;
  last_name: string;
  email: string;
};

export type StudentSearchOption = {
  id: string;
  matric_no: string;
  level: string | null;
  status: string | null;
  profiles: StudentProfile | null;
};

type StudentsSearchResponse = {
  students?: StudentSearchOption[];
  error?: string;
};

type StudentSearchComboboxProps = {
  value: StudentSearchOption | null;
  onChange: (student: StudentSearchOption | null) => void;
  disabled?: boolean;
};



/**
 * Returns the student's readable full name.
 * The matriculation number is used as a fallback.
 */
function getStudentName(
  student: StudentSearchOption,
): string {
  const fullName = [
    student.profiles?.first_name,
    student.profiles?.middle_name,
    student.profiles?.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || student.matric_no;
}

/**
 * Creates the text shown inside the combobox after selection.
 */
export function getStudentSearchLabel(
  student: StudentSearchOption,
): string {
  return `${getStudentName(student)} — ${student.matric_no}`;
}

export default function StudentSearchCombobox({
  value,
  onChange,
  disabled = false,
}: StudentSearchComboboxProps) {
  const [searchValue, setSearchValue] = useState("");
  const [searchResults, setSearchResults] = useState<
    StudentSearchOption[]
  >([]);

  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  /*
   * Stores the current request controller so an older request
   * can be cancelled when the administrator continues typing.
   */
  const requestControllerRef =
    useRef<AbortController | null>(null);

  const trimmedSearch = searchValue.trim();

  /**
   * The selected student must remain inside the items collection.
   *
   * Without this, the combobox could lose the selected label when
   * a new server search replaces the result list.
   */
  const availableStudents = useMemo(() => {
    if (!value) {
      return searchResults;
    }

    const selectedStudentAlreadyExists =
      searchResults.some(
        (student) => student.id === value.id,
      );

    if (selectedStudentAlreadyExists) {
      return searchResults;
    }

    return [value, ...searchResults];
  }, [searchResults, value]);

  /**
   * Runs a server-side student search after the administrator
   * stops typing for 400 milliseconds.
   */
  useEffect(() => {
    requestControllerRef.current?.abort();

    /*
     * Do not send requests for empty or one-character searches.
     * This prevents unnecessary API and database calls.
     */
    if (trimmedSearch.length < 2) {
      setIsSearching(false);
      setSearchError("");
      setSearchResults(value ? [value] : []);

      return;
    }

    const controller = new AbortController();
    requestControllerRef.current = controller;

    setIsSearching(true);
    setSearchError("");

    const timeoutId = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          search: trimmedSearch,
          status: "active",
          page: "1",
          pageSize: "20",
        });

        const response = await fetch(
          `/api/admin/students?${params.toString()}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );

        const payload =
          (await response.json()) as StudentsSearchResponse;

        if (!response.ok) {
          throw new Error(
            payload.error || "Student search failed.",
          );
        }

        /*
         * Ignore this response when a newer search request
         * has already replaced it.
         */
        if (controller.signal.aborted) {
          return;
        }

        setSearchResults(
          Array.isArray(payload.students)
            ? payload.students
            : [],
        );
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        console.error("Student search failed:", error);

        setSearchResults([]);
        setSearchError(
          error instanceof Error
            ? error.message
            : "Student search failed.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 400);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [trimmedSearch, value]);

  function getEmptyMessage(): string {
    if (isSearching) {
      return "Searching students...";
    }

    if (searchError) {
      return searchError;
    }

    if (trimmedSearch.length < 2) {
      return "Type at least 2 characters.";
    }

    return `No active student found for "${trimmedSearch}".`;
  }

  return (
    <Combobox
      items={availableStudents}
      value={value}
      disabled={disabled}
      autoHighlight
      filter={null}
      itemToStringLabel={getStudentSearchLabel}
      isItemEqualToValue={(
        firstStudent,
        secondStudent,
      ) => firstStudent.id === secondStudent.id}
      onValueChange={(selectedStudent) => {
        onChange(selectedStudent);

        setSearchValue("");
        setSearchError("");

        setSearchResults(
          selectedStudent ? [selectedStudent] : [],
        );
      }}
      onInputValueChange={(
        nextSearchValue,
        details,
      ) => {
        setSearchValue(nextSearchValue);

        /*
         * Editing the input invalidates the previous selection.
         * The item-press event is ignored because it represents
         * a legitimate selection rather than manual typing.
         */
        if (
          details.reason !== "item-press" &&
          value
        ) {
          onChange(null);
        }
      }}
    >
      <ComboboxInput
        placeholder="Search by name or matric number"
        aria-label="Search student"
        showClear
        className="w-full bg-white text-slate-900 placeholder:text-slate-400"
        />

        <ComboboxContent className="z-50 border border-slate-200 bg-white text-slate-900 shadow-lg">
        <ComboboxEmpty className="bg-white px-4 py-3 text-sm text-slate-500">
            {getEmptyMessage()}
        </ComboboxEmpty>

        <ComboboxList className="max-h-64 overflow-y-auto bg-white">
            {(student: StudentSearchOption) => (
            <ComboboxItem
                key={student.id}
                value={student}
                className="cursor-pointer bg-white px-3 py-2 text-slate-900 data-highlighted:bg-slate-100 data-highlighted:text-slate-900"
            >
                {/* Display the student's name, matric number and level. */}
                <div className="flex w-full flex-col gap-0.5">
                <span className="font-medium text-slate-900">
                    {getStudentName(student)}
                </span>

                <span className="text-xs text-slate-500">
                    {student.matric_no}

                    {student.level
                    ? ` · Level ${student.level}`
                    : ""}
                </span>
                </div>
            </ComboboxItem>
            )}
        </ComboboxList>
        </ComboboxContent>
    </Combobox>
  );
}