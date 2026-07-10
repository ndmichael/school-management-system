"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import Image from "next/image";
import {
  Archive,
  Edit,
  Eye,
  Filter,
  MoreVertical,
  Plus,
  RefreshCcw,
  Search,
} from "lucide-react";
import { toast } from "react-toastify";

import { toPublicImageSrc } from "@/lib/storage-images";
import { createClient } from "@/lib/supabase/client";

import { AddStaffModal } from "@/components/modals/AddStaffModal";
import { ViewStaffDetailsModal } from "@/components/modals/staff/ViewStaffDetailsModal";
import { EditStaffModal } from "@/components/modals/staff/EditStaffDetailsModal";
import { ChangeStatusModal } from "@/components/modals/shared/ChangeStatusModal";

export interface StaffRow {
  id: string;
  staff_id: string;
  designation: string | null;
  specialization: string | null;
  status: string;
  staff_type: string | null;

  departments: {
    name: string | null;
  } | null;

  profiles: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    avatar_file: {
      bucket: string;
      path: string;
    } | null;
  } | null;
}

type ApiError = {
  error?: string;
  message?: string;
};

type StaffListResponse = {
  staff?: StaffRow[];
  error?: string;
};

const STAFF_STATUS_OPTIONS = [
  {
    value: "active",
    label: "Active",
  },
  {
    value: "suspended",
    label: "Suspended",
  },
  {
    value: "resigned",
    label: "Resigned",
  },
  {
    value: "terminated",
    label: "Terminated",
  },
  {
    value: "retired",
    label: "Retired",
  },
] as const;

const PAGE_SIZE = 10;

function useDebouncedValue<T>(
  value: T,
  delayMs: number,
): T {
  const [debounced, setDebounced] =
    useState<T>(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebounced(value);
    }, delayMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [delayMs, value]);

  return debounced;
}

async function readErrorMessage(
  response: Response,
): Promise<string> {
  const contentType =
    response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await response
      .json()
      .catch(() => null)) as ApiError | null;

    return (
      body?.error ||
      body?.message ||
      `Request failed (${response.status})`
    );
  }

  const text = await response.text().catch(() => "");

  return text.trim()
    ? text.slice(0, 220)
    : `Request failed (${response.status})`;
}

function getStaffDisplayName(staff: StaffRow): string {
  const fullName = [
    staff.profiles?.first_name,
    staff.profiles?.last_name,
  ]
    .filter(Boolean)
    .join(" ");

  return fullName || staff.staff_id || "Staff member";
}

function formatStatus(status: string): string {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

export default function StaffPage() {
  const supabase = useMemo(() => createClient(), []);

  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] =
    useState("all");

  const debouncedSearch = useDebouncedValue(
    search,
    350,
  );

  const debouncedRole = useDebouncedValue(
    filterRole,
    150,
  );

  const [page, setPage] = useState(1);

  const [showAddModal, setShowAddModal] =
    useState(false);

  const [viewId, setViewId] = useState<
    string | null
  >(null);

  const [editId, setEditId] = useState<
    string | null
  >(null);

  const [statusStaff, setStatusStaff] =
    useState<StaffRow | null>(null);

  const [updatingStatus, setUpdatingStatus] =
    useState(false);

  const [archivingId, setArchivingId] =
    useState<string | null>(null);

  const loadStaff = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();

      const searchValue = debouncedSearch.trim();

      if (searchValue) {
        params.set("search", searchValue);
      }

      if (debouncedRole !== "all") {
        params.set("role", debouncedRole);
      }

      const response = await fetch(
        `/api/admin/staff?${params.toString()}`,
        {
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response),
        );
      }

      const json =
        (await response.json()) as StaffListResponse;

      setStaff(
        Array.isArray(json.staff) ? json.staff : [],
      );

      setPage(1);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Error loading staff";

      console.error(error);
      toast.error(message);
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedRole, debouncedSearch]);

  useEffect(() => {
    void loadStaff();
  }, [loadStaff]);

  async function updateStaffStatus(
    newStatus: string,
    reason: string,
  ) {
    if (!statusStaff) {
      return;
    }

    const selectedStaff = statusStaff;

    try {
      setUpdatingStatus(true);

      const response = await fetch(
        `/api/admin/staff/${selectedStaff.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: newStatus,
            reason,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response),
        );
      }

      toast.success(
        `${getStaffDisplayName(
          selectedStaff,
        )}'s status changed to ${formatStatus(
          newStatus,
        )}`,
      );

      setStatusStaff(null);

      await loadStaff();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to update staff status";

      toast.error(message);
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function archiveStaff(
    selectedStaff: StaffRow,
  ) {
    if (archivingId) {
      return;
    }

    const staffName =
      getStaffDisplayName(selectedStaff);

    const confirmed = window.confirm(
      `Archive ${staffName}?\n\n` +
        "The staff member will be removed from the active list, but their profile and historical records should be preserved.",
    );

    if (!confirmed) {
      return;
    }

    try {
      setArchivingId(selectedStaff.id);

      const response = await fetch(
        `/api/admin/staff/${selectedStaff.id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason: "Archived by administrator",
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response),
        );
      }

      toast.success("Staff archived successfully");

      await loadStaff();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to archive staff";

      toast.error(message);
    } finally {
      setArchivingId(null);
    }
  }

  const total = staff.length;

  const totalPages = Math.max(
    1,
    Math.ceil(total / PAGE_SIZE),
  );

  const currentPage = Math.min(page, totalPages);

  const startIndex =
    (currentPage - 1) * PAGE_SIZE;

  const visibleStaff = useMemo(
    () =>
      staff.slice(
        startIndex,
        startIndex + PAGE_SIZE,
      ),
    [staff, startIndex],
  );

  return (
    <div className="min-h-screen w-full bg-gray-50 pb-20">
      <div className="mx-auto max-w-7xl space-y-10 px-4 py-10 lg:px-6">
        {/* Header */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Staff Management
            </h1>

            <p className="mt-1 text-gray-600">
              Manage academic and non-academic staff
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60"
          >
            <Plus className="h-5 w-5" />
            Add Staff
          </button>
        </div>

        {/* Filters */}
        <div className="space-y-4 rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

              <input
                type="search"
                value={search}
                placeholder="Search staff ID, designation, specialization…"
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                className="w-full rounded-xl border bg-white py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-500" />

              <select
                value={filterRole}
                onChange={(event) =>
                  setFilterRole(event.target.value)
                }
                className="rounded-xl border bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="all">All Staff</option>
                <option value="academic_staff">
                  Academic Staff
                </option>
                <option value="non_academic_staff">
                  Non-Academic Staff
                </option>
              </select>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={() => void loadStaff()}
              className="rounded-xl border bg-white px-4 py-3 text-sm hover:bg-gray-50 disabled:opacity-60"
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        {/* Staff table */}
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr className="text-left">
                  <th className="px-6 py-4 font-semibold">
                    Staff
                  </th>

                  <th className="px-6 py-4 font-semibold">
                    Staff ID
                  </th>

                  <th className="px-6 py-4 font-semibold">
                    Department
                  </th>

                  <th className="px-6 py-4 font-semibold">
                    Designation
                  </th>

                  <th className="px-6 py-4 font-semibold">
                    Status
                  </th>

                  <th className="px-6 py-4 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {loading && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-10 text-center text-gray-600"
                    >
                      Loading staff...
                    </td>
                  </tr>
                )}

                {!loading &&
                  visibleStaff.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-10 text-center text-gray-600"
                      >
                        No staff found
                      </td>
                    </tr>
                  )}

                {!loading &&
                  visibleStaff.map((staffMember) => {
                    const actionDisabled =
                      archivingId === staffMember.id ||
                      (updatingStatus &&
                        statusStaff?.id ===
                          staffMember.id);

                    return (
                      <tr
                        key={staffMember.id}
                        className="transition hover:bg-gray-50"
                      >
                        <td className="px-6 py-4">
                          <StaffIdentity
                            staff={staffMember}
                            supabase={supabase}
                          />
                        </td>

                        <td className="px-6 py-4 font-mono text-xs">
                          {staffMember.staff_id}
                        </td>

                        <td className="px-6 py-4">
                          {staffMember.departments?.name || (
                            <span className="text-gray-400">
                              —
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          {staffMember.designation || "—"}
                        </td>

                        <td className="px-6 py-4">
                          <StaffStatusBadge
                            status={staffMember.status}
                          />
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end">
                            <StaffActionsMenu
                              disabled={actionDisabled}
                              onView={() =>
                                setViewId(
                                  staffMember.id,
                                )
                              }
                              onEdit={() =>
                                setEditId(
                                  staffMember.id,
                                )
                              }
                              onChangeStatus={() =>
                                setStatusStaff(
                                  staffMember,
                                )
                              }
                              onArchive={() => {
                                void archiveStaff(
                                  staffMember,
                                );
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && total > 0 && (
            <div className="flex items-center justify-between border-t bg-gray-50 px-6 py-4 text-sm text-gray-700">
              <span>
                Showing{" "}
                <strong>{startIndex + 1}</strong> -{" "}
                <strong>
                  {Math.min(
                    startIndex + PAGE_SIZE,
                    total,
                  )}
                </strong>{" "}
                of <strong>{total}</strong>
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() =>
                    setPage((current) =>
                      Math.max(1, current - 1),
                    )
                  }
                  className="rounded border px-3 py-1 disabled:opacity-50"
                >
                  Prev
                </button>

                <span>
                  Page <strong>{currentPage}</strong>{" "}
                  of <strong>{totalPages}</strong>
                </span>

                <button
                  type="button"
                  disabled={
                    currentPage >= totalPages
                  }
                  onClick={() =>
                    setPage((current) =>
                      Math.min(
                        totalPages,
                        current + 1,
                      ),
                    )
                  }
                  className="rounded border px-3 py-1 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        <AddStaffModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onCreated={loadStaff}
        />

        {viewId && (
          <ViewStaffDetailsModal
            isOpen
            staffId={viewId}
            onClose={() => setViewId(null)}
          />
        )}

        {editId && (
          <EditStaffModal
            isOpen
            staffId={editId}
            onClose={() => setEditId(null)}
            onUpdated={loadStaff}
          />
        )}

        {statusStaff && (
          <ChangeStatusModal
            isOpen
            entityType="staff"
            entityName={getStaffDisplayName(
              statusStaff,
            )}
            currentStatus={statusStaff.status}
            options={STAFF_STATUS_OPTIONS}
            loading={updatingStatus}
            onClose={() => {
              if (!updatingStatus) {
                setStatusStaff(null);
              }
            }}
            onConfirm={updateStaffStatus}
          />
        )}
      </div>
    </div>
  );
}

function StaffIdentity({
  staff,
  supabase,
}: {
  staff: StaffRow;
  supabase: ReturnType<typeof createClient>;
}) {
  const fullName = getStaffDisplayName(staff);

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gray-200">
        <Image
          src={toPublicImageSrc(
            supabase,
            staff.profiles?.avatar_file,
            "/avatar.png",
          )}
          alt={`${fullName}'s avatar`}
          fill
          sizes="40px"
          className="object-cover"
        />
      </div>

      <div className="min-w-0">
        <p className="truncate font-semibold text-gray-900">
          {fullName}
        </p>

        <p className="truncate text-xs text-gray-600">
          {staff.profiles?.email ?? "—"}
        </p>
      </div>
    </div>
  );
}

function StaffActionsMenu({
  disabled = false,
  onView,
  onEdit,
  onChangeStatus,
  onArchive,
}: {
  disabled?: boolean;
  onView: () => void;
  onEdit: () => void;
  onChangeStatus: () => void;
  onArchive: () => void;
}) {
  const [open, setOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(
    null,
  );

  const menuOpen = open && !disabled;

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function handleOutsideClick(
      event: MouseEvent,
    ) {
      const target = event.target;

      if (
        target instanceof Node &&
        !containerRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick,
    );

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick,
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [menuOpen]);

  function runAction(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <div
      ref={containerRef}
      className="relative inline-block text-left"
    >
      <button
        type="button"
        disabled={disabled}
        aria-label="Open staff actions"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => {
          if (!disabled) {
            setOpen((current) => !current);
          }
        }}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-52 rounded-xl border border-gray-200 bg-white p-1.5 text-left shadow-lg"
        >
          <MenuButton
            icon={<Eye className="h-4 w-4" />}
            label="View staff"
            onClick={() => runAction(onView)}
          />

          <MenuButton
            icon={<Edit className="h-4 w-4" />}
            label="Edit staff"
            onClick={() => runAction(onEdit)}
          />

          <MenuButton
            icon={
              <RefreshCcw className="h-4 w-4" />
            }
            label="Change status"
            onClick={() =>
              runAction(onChangeStatus)
            }
          />

          <div className="my-1 border-t border-gray-100" />

          <MenuButton
            icon={
              <Archive className="h-4 w-4" />
            }
            label="Archive staff"
            danger
            onClick={() => runAction(onArchive)}
          />
        </div>
      )}
    </div>
  );
}

function MenuButton({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${
        danger
          ? "text-red-600 hover:bg-red-50"
          : "text-gray-700 hover:bg-gray-100"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function StaffStatusBadge({
  status,
}: {
  status: string | null;
}) {
  const base =
    "inline-flex rounded-full px-3 py-1 text-xs font-semibold";

  const normalizedStatus =
    status?.trim().toLowerCase() ?? "";

  if (normalizedStatus === "active") {
    return (
      <span
        className={`${base} bg-green-100 text-green-700`}
      >
        Active
      </span>
    );
  }

  if (normalizedStatus === "suspended") {
    return (
      <span
        className={`${base} bg-orange-100 text-orange-700`}
      >
        Suspended
      </span>
    );
  }

  if (normalizedStatus === "resigned") {
    return (
      <span
        className={`${base} bg-blue-100 text-blue-700`}
      >
        Resigned
      </span>
    );
  }

  if (normalizedStatus === "terminated") {
    return (
      <span
        className={`${base} bg-red-100 text-red-700`}
      >
        Terminated
      </span>
    );
  }

  if (normalizedStatus === "retired") {
    return (
      <span
        className={`${base} bg-gray-200 text-gray-700`}
      >
        Retired
      </span>
    );
  }

  return (
    <span
      className={`${base} bg-gray-100 text-gray-600`}
    >
      Unknown
    </span>
  );
}