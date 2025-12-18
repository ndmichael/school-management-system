"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";

type Props = {
  offeringId: string;
  isPublished: boolean;
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

export default function PublishToggleButton({ offeringId, isPublished }: Props) {
  const [published, setPublished] = useState<boolean>(isPublished);
  const [isSaving, setIsSaving] = useState(false);

  // keep in sync if parent updates later (e.g. after manual refresh)
  useEffect(() => {
    setPublished(isPublished);
  }, [isPublished]);

  async function toggle() {
    if (isSaving) return;

    const next = !published;

    // ✅ optimistic UI update immediately
    setPublished(next);
    setIsSaving(true);

    const request = fetch(`/api/admin/course-offerings/${offeringId}/publish`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publish: next }),
    }).then(async (res) => {
      const json: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = isApiErr(json) ? json.error : `Request failed (${res.status})`;
        throw new Error(msg);
      }
      return json;
    });

    toast.promise(request, {
      pending: next ? "Publishing…" : "Unpublishing…",
      success: next ? "Published ✅" : "Unpublished ✅",
      error: {
        render({ data }) {
          return data instanceof Error ? data.message : "Failed";
        },
      },
    });

    try {
      await request;
    } catch (err) {
      // ✅ rollback if API fails
      setPublished(!next);
    } finally {
      setIsSaving(false);
    }
  }

  // ✅ UI: Published => grey "Unpublish", Unpublished => red "Publish"
  const base =
    "inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold transition " +
    "disabled:cursor-not-allowed disabled:opacity-60";

  const publishedStyle =
    "bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200";

  const unpublishedStyle =
    "bg-red-600 text-white hover:bg-red-700";

  const label = isSaving ? "Saving…" : published ? "Unpublish" : "Publish";

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isSaving}
      className={[base, published ? publishedStyle : unpublishedStyle].join(" ")}
      aria-pressed={published}
    >
      {label}
    </button>
  );
}
