"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { CheckCircle2, XCircle } from "lucide-react";

// Types
type ApplicationStatus = "pending" | "accepted" | "rejected";

interface ApplicationRow {
  id: string;
  application_no: string;
  status: ApplicationStatus;
  created_at: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  email: string;
  phone: string | null;
  application_type: string | null;
  program_id: string | null;
  session_id: string | null;
  programName: string | null;
  sessionName: string | null;
  student_id: string | null;
  converted_to_student: boolean;
}

const PAGE_SIZE = 10;

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | ApplicationStatus>("pending");
  const [search, setSearch] = useState("");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Load applications from backend
  const loadApplications = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/applications?${params}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to load applications.");
      }

      const json = (await res.json()) as { applications: ApplicationRow[] };
      setApplications(json.applications || []);
      setPage(1); // reset pagination
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error loading applications.";
      console.error(err);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    loadApplications();
  };

  // Review application (accept or reject)
  const reviewApplication = async (id: string, action: "accept" | "reject") => {
    try {
      let rejectionReason: string | undefined;

      if (action === "reject") {
        const input = prompt("Reason for rejection:");
        if (!input) return;
        rejectionReason = input;
      }

      setReviewingId(id);

      const res = await fetch(`/api/applications/${id}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, rejectionReason }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to update application.");
      }

      // Now that API no longer returns the application,
      // we reload the data cleanly.
      toast.success(action === "accept" ? "Application accepted." : "Application rejected.");

      await loadApplications();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Operation failed.";
      console.error(err);
      toast.error(msg);
    } finally {
      setReviewingId(null);
    }
  };

   // Convert accepted applications to student and generate an auth
  const convertApplication = async (id: string) => {
    try {
        setReviewingId(id); // disable button during request

        const res = await fetch(`/api/applications/${id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        });

        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
        throw new Error(json.error || "Failed to convert application.");
        }

        toast.success("Student created successfully!");

        await loadApplications(); // refresh list
    } catch (err) {
        const msg = err instanceof Error ? err.message : "Conversion failed.";
        toast.error(msg);
    } finally {
        setReviewingId(null); // re-enable button
    }
    };


  // Formatting helpers
  const formatDate = (iso?: string | null) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
  };

  const statusBadgeClass = (status: ApplicationStatus) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "accepted":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Pagination
  const total = applications.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageItems = applications.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Applications</h1>
          <p className="text-sm text-gray-600">Review and manage student applications.</p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            className="border rounded px-3 py-1 text-sm"
            placeholder="Search by name, email, app no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="border rounded px-3 py-1 text-sm"
            value={filterStatus}
            onChange={(e) =>
              setFilterStatus(e.target.value as "all" | ApplicationStatus)
            }
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
          <button
            type="submit"
            className="px-3 py-1 text-sm rounded bg-gray-900 text-white"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="px-3 py-2">App No</th>
              <th className="px-3 py-2">Applicant</th>
              <th className="px-3 py-2">Program</th>
              <th className="px-3 py-2">Session</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="px-3 py-4 text-center text-gray-500">
                  Loading applications...
                </td>
              </tr>
            )}

            {!loading && pageItems.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-4 text-center text-gray-500">
                  No applications found.
                </td>
              </tr>
            )}

            {!loading &&
              pageItems.map((app) => (
                <tr key={app.id} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">
                    {app.application_no}
                  </td>

                  <td className="px-3 py-2">
                    <div className="font-medium">
                      {app.first_name}{" "}
                      {app.middle_name ? app.middle_name + " " : ""}
                      {app.last_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {app.email} {app.phone && <>· {app.phone}</>}
                    </div>
                  </td>

                  <td className="px-3 py-2">
                    {app.programName || <span className="text-gray-400">—</span>}
                  </td>

                  <td className="px-3 py-2">
                    {app.sessionName || <span className="text-gray-400">—</span>}
                  </td>

                  <td className="px-3 py-2 uppercase text-xs text-gray-600">
                    {app.application_type || "-"}
                  </td>

                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(
                        app.status
                      )}`}
                    >
                      {app.status.toUpperCase()}
                    </span>
                  </td>

                  <td className="px-3 py-2 text-xs text-gray-600">
                    {formatDate(app.created_at)}
                  </td>

                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-2">
                      {/* Always allow View */}
                      <a
                        href={`/dashboard/admin/applications/${app.id}`}
                        className="px-3 py-1 text-xs rounded border bg-white hover:bg-gray-50"
                        title="View application details"
                      >
                        View
                      </a>

                      {/* Pending -> Accept / Reject */}
                      {app.status === "pending" && (
                        <>
                          <button
                            type="button"
                            onClick={() => reviewApplication(app.id, "accept")}
                            disabled={reviewingId === app.id}
                            title="Accept application"
                            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 disabled:opacity-60"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => reviewApplication(app.id, "reject")}
                            disabled={reviewingId === app.id}
                            title="Reject application"
                            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 disabled:opacity-60"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}

                      {/* Accepted but not converted -> Convert */}
                      {app.status === "accepted" && !app.converted_to_student && (
                        <button
                          type="button"
                          onClick={() => convertApplication(app.id)}
                          disabled={reviewingId === app.id}
                          title="Convert to student account"
                          className={`px-3 py-1 text-xs rounded text-white ${
                            reviewingId === app.id
                              ? "bg-blue-300 cursor-not-allowed"
                              : "bg-blue-600 hover:bg-blue-700"
                          }`}
                        >
                          {reviewingId === app.id ? "Converting..." : "Convert"}
                        </button>
                      )}

                      {/* Converted */}
                      {app.converted_to_student && (
                        <span className="px-2 py-1 text-xs rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Converted
                        </span>
                      )}
                    </div>
                  </td>


                </tr>
              ))}
          </tbody>
        </table>

        {/* Pagination */}
        {!loading && total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50 text-xs text-gray-600">
            <div>
              Showing{" "}
              <span className="font-medium">{startIndex + 1}</span> –{" "}
              <span className="font-medium">
                {Math.min(startIndex + PAGE_SIZE, total)}
              </span>{" "}
              of <span className="font-medium">{total}</span> applications
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2 py-1 border rounded disabled:opacity-50"
              >
                Prev
              </button>

              <span>
                Page <span className="font-medium">{currentPage}</span> of{" "}
                <span className="font-medium">{totalPages}</span>
              </span>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2 py-1 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
