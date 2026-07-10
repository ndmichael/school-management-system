"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

export interface StatusOption {
  value: string;
  label: string;
}

interface ChangeStatusModalProps {
  isOpen: boolean;
  entityType: "student" | "staff";
  entityName: string;
  currentStatus: string | null;
  options: readonly StatusOption[];
  loading?: boolean;
  onClose: () => void;
  onConfirm: (
    newStatus: string,
    reason: string,
  ) => Promise<void> | void;
}

function formatStatus(status: string | null): string {
  if (!status) {
    return "Unknown";
  }

  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getInitialStatus(
  options: readonly StatusOption[],
  currentStatus: string | null,
): string {
  /*
   * Start with the first status different from the
   * current status.
   */
  return (
    options.find(
      (option) => option.value !== currentStatus,
    )?.value ?? ""
  );
}

export function ChangeStatusModal({
  isOpen,
  entityType,
  entityName,
  currentStatus,
  options,
  loading = false,
  onClose,
  onConfirm,
}: ChangeStatusModalProps) {
  const [newStatus, setNewStatus] = useState(() =>
    getInitialStatus(options, currentStatus),
  );

  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  /*
   * This effect only subscribes to keyboard events.
   * It does not synchronously update component state.
   */
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !loading) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [isOpen, loading, onClose]);

  if (!isOpen) {
    return null;
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setError("");

    if (!newStatus) {
      setError("Select a new status.");
      return;
    }

    if (newStatus === currentStatus) {
      setError(
        `${formatStatus(
          newStatus,
        )} is already the current status.`,
      );
      return;
    }

    if (!reason.trim()) {
      setError(
        "A reason is required for the status change.",
      );
      return;
    }

    await onConfirm(newStatus, reason.trim());
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !loading
        ) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-status-title"
        className="w-full max-w-md rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-start justify-between border-b px-6 py-5">
          <div>
            <h2
              id="change-status-title"
              className="text-lg font-semibold text-gray-900"
            >
              Change {entityType} status
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Update the status for{" "}
              <span className="font-medium text-gray-700">
                {entityName}
              </span>
              .
            </p>
          </div>

          <button
            type="button"
            aria-label="Close modal"
            disabled={loading}
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-5 px-6 py-5">
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Current status
              </p>

              <p className="mt-1 font-semibold text-gray-900">
                {formatStatus(currentStatus)}
              </p>
            </div>

            <div>
              <label
                htmlFor="new-status"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                New status
              </label>

              <select
                id="new-status"
                value={newStatus}
                disabled={loading}
                onChange={(event) => {
                  setNewStatus(event.target.value);

                  if (error) {
                    setError("");
                  }
                }}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-gray-100"
              >
                {options.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                    disabled={
                      option.value === currentStatus
                    }
                  >
                    {option.label}
                    {option.value === currentStatus
                      ? " — Current"
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="status-reason"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Reason
              </label>

              <textarea
                id="status-reason"
                rows={4}
                value={reason}
                disabled={loading}
                placeholder={`Explain why this ${entityType}'s status is being changed`}
                onChange={(event) => {
                  setReason(event.target.value);

                  if (error) {
                    setError("");
                  }
                }}
                className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-gray-100"
              />

              <p className="mt-1 text-xs text-gray-500">
                This reason will be recorded in the audit
                trail.
              </p>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t px-6 py-4">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                loading ||
                !newStatus ||
                newStatus === currentStatus
              }
              className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Updating..." : "Update status"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}