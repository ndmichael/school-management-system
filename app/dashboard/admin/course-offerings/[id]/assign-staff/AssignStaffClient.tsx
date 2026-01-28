"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type StaffItem = {
  id: string; // UUID (staff.id)
  staff_code: string; // TEXT (staff.staff_id)
  designation: string | null;
  profile: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
};

type GetResponse = {
  assigned_staff_ids: string[];
  eligible_staff: StaffItem[];
};

export default function AssignStaffClient({ offeringId }: { offeringId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [staff, setStaff] = useState<StaffItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const staffSorted = useMemo(
    () => [...staff].sort((a, b) => a.staff_code.localeCompare(b.staff_code)),
    [staff]
  );

  useEffect(() => {
    fetch(`/api/admin/course-offerings/${offeringId}/assign-staff`)
      .then((r) => r.json())
      .then((d: GetResponse) => {
        setStaff(d.eligible_staff ?? []);
        setSelected(new Set(d.assigned_staff_ids ?? []));
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load staff");
        setLoading(false);
      });
  }, [offeringId]);

  function toggle(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  async function save() {
    setSaving(true);
    const staff_ids = Array.from(selected);

    const req = fetch(`/api/admin/course-offerings/${offeringId}/assign-staff`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staff_ids }),
    }).then((r) => {
      if (!r.ok) throw new Error("Save failed");
    });

    toast.promise(req, {
      pending: "Saving…",
      success: "Staff assigned ✅",
      error: "Failed to assign staff",
    });

    try {
      await req;
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-center py-10">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Assign Academic Staff</h2>
        <Link 
          href="/dashboard/admin/course-offerings" 
          className="group inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition-all hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      </div>

      <div className="border rounded-xl bg-white">
        <div className="flex justify-between px-6 py-4 border-b">
          <span>Selected: {selected.size}</span>
          <button
            onClick={save}
            disabled={saving}
            className="bg-admin-600 text-white px-4 py-2 rounded"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>

        <ul className="divide-y">
          {staffSorted.map((s) => (
            <li key={s.id} className="px-6 py-4 flex gap-3">
              <input
                type="checkbox"
                checked={selected.has(s.id)}
                onChange={() => toggle(s.id)}
              />
              <div>
                <div className="font-semibold">
                  {s.staff_code} — {s.profile?.first_name} {s.profile?.last_name}
                </div>
                <div className="text-sm text-gray-600">
                  {s.designation ?? "Staff"} • 
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
