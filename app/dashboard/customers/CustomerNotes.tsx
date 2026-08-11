"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CustomerNotes({
  customerId,
  initialNotes,
}: {
  customerId: string;
  initialNotes: string;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function onSave() {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save notes.");
      } else {
        setSaved(true);
        router.refresh();
      }
    } catch {
      setError("Failed to save notes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <textarea
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
        rows={4}
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          setSaved(false);
        }}
        placeholder="Add internal notes about this customer..."
      />
      <div className="mt-2 flex items-center gap-3">
        <button
          onClick={onSave}
          disabled={saving}
          className="bg-indigo-600 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save notes"}
        </button>
        {saved && <span className="text-sm text-green-600">Saved.</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
}
