"use client";

import { useEffect, useState } from "react";

type Meeting = {
  id: string;
  title: string;
  scheduledAt: string;
  notes: string | null;
};

export default function HomeMeetings({ contactEmail }: { contactEmail: string | null }) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/meetings");
    const data = await res.json();
    setMeetings(Array.isArray(data.meetings) ? data.meetings : []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd() {
    setError("");
    if (!title.trim() || !scheduledAt) {
      setError("Title and date/time are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, scheduledAt }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to add meeting");
        return;
      }
      setTitle("");
      setScheduledAt("");
      setShowForm(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await fetch("/api/meetings?id=" + id, { method: "DELETE" });
    await load();
  }

  const upcoming = meetings.filter((m) => new Date(m.scheduledAt) >= new Date());

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-900">Upcoming Meetings</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-sm text-green-700 hover:underline font-medium"
        >
          + Add meeting
        </button>
      </div>

      {showForm && (
        <div className="mb-3 border rounded p-3 space-y-2">
          {error && <p className="text-xs text-red-600">{error}</p>}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Meeting title"
            className="w-full border rounded px-3 py-2 text-sm"
          />
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={saving}
              className="bg-green-700 text-white text-sm px-3 py-1.5 rounded hover:bg-green-800 disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="text-sm text-gray-500 px-3 py-1.5"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : upcoming.length === 0 ? (
        <p className="text-sm text-gray-400 mb-3">No upcoming meetings scheduled</p>
      ) : (
        <ul className="divide-y mb-3">
          {upcoming.map((m) => (
            <li key={m.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <div className="text-gray-900">{m.title}</div>
                <div className="text-xs text-gray-500">
                  {new Date(m.scheduledAt).toLocaleString()}
                </div>
              </div>
              <button
                onClick={() => handleDelete(m.id)}
                className="text-xs text-red-600 hover:underline"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-2 gap-2">
        <a
          href={contactEmail ? "mailto:" + contactEmail : "mailto:"}
          className="text-center border rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Open Email
        </a>
        <a
          href="https://zoom.us/start"
          target="_blank"
          rel="noopener noreferrer"
          className="text-center border rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Start Zoom Call
        </a>
      </div>
    </div>
  );
}
