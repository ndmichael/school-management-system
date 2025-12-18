"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

type StaffItem = {
  profile_id: string; // this is what we assign
  staff_id: string;
  designation: string | null;
  status: string | null;
  profile: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
};

type GetResponse = {
  assigned_staff_profile_ids: string[];
  eligible_staff: StaffItem[];
};

type ApiErr = { error: string };

function isApiErr(v: unknown): v is ApiErr {
  return (
    typeof v === "object" &&
    v !== null &&
    "error" in v &&
    typeof (v as { error?: unknown }).error === "string"
  );
}

export default function AssignStaffClient({ offeringId }: { offeringId: string }) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [staff, setStaff] = useState<StaffItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set()); // holds profile ids

  const staffSorted = useMemo(() => {
    return [...staff].sort((a, b) => a.staff_id.localeCompare(b.staff_id));
  }, [staff]);

  useEffect(() => {
    if (!offeringId) return;

    async function load() {
      setLoading(true);

      const res = await fetch(
        `/api/admin/course-offerings/${offeringId}/assign-staff`,
        { cache: "no-store" }
      );

      const json: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = isApiErr(json) ? json.error : "Failed to load staff";
        toast.error(msg);
        setStaff([]);
        setSelected(new Set());
        setLoading(false);
        return;
      }

      const data = json as GetResponse;
      setStaff(data.eligible_staff ?? []);
      setSelected(new Set(data.assigned_staff_profile_ids ?? []));
      setLoading(false);
    }

    void load();
  }, [offeringId]);

  function toggle(profileId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(profileId)) next.delete(profileId);
      else next.add(profileId);
      return next;
    });
  }

  async function save() {
    if (saving) return;
    setSaving(true);

    const staff_profile_ids = Array.from(selected);

    const request = fetch(
      `/api/admin/course-offerings/${offeringId}/assign-staff`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staff_profile_ids }),
      }
    ).then(async (res) => {
      const json: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = isApiErr(json) ? json.error : `Request failed (${res.status})`;
        throw new Error(msg);
      }
      return json;
    });

    toast.promise(request, {
      pending: "Saving staff assignment…",
      success: "Staff assigned ✅",
      error: {
        render({ data }) {
          return data instanceof Error ? data.message : "Failed to assign staff";
        },
      },
    });

    try {
      await request;
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="py-16 text-center text-gray-600">Loading staff…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Assign Staff</h2>
        <p className="mt-1 text-sm text-gray-600">
          Only <span className="font-semibold">active</span> staff are listed.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="text-sm text-gray-700">
            Selected: <span className="font-semibold">{selected.size}</span>
          </div>

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>

        <ul className="divide-y divide-gray-200">
          {staffSorted.map((s) => {
            const first_name = s.profile?.first_name ?? "No name";
            const last_name = s.profile?.last_name ?? "No name";
            const email = s.profile?.email ?? "";
            const checked = selected.has(s.profile_id);

            return (
              <li
                key={s.profile_id}
                className="flex items-start gap-3 px-6 py-4 hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(s.profile_id)}
                  className="mt-1 h-4 w-4 rounded border-gray-300"
                />

                <div className="min-w-0">
                  <div className="font-semibold text-gray-900">
                    {s.staff_id} — {first_name} {last_name}
                  </div>
                  <div className="text-sm text-gray-600">
                    {s.designation ?? "Staff"}
                    {email ? ` • ${email}` : ""}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
