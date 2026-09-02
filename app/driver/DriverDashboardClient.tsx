"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  STOP_STATUS_LABELS,
  ATTENTION_STATUSES,
  ATTENTION_STATUS_LABELS,
  isPickupOrder,
  nextStopStatus,
} from "@/lib/driverRuns";

type StopData = {
  id: string;
  status: string;
  attentionStatus: string;
  attentionNotes: string | null;
  driverInternalNote: string | null;
  order: {
    orderNumber: string;
    deliveryType: string;
    eventDate: string;
    deliveryAddress: string | null;
    customer: { firstName: string; lastName: string; phone: string | null };
  };
};

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shiftDate(dateStr: string, days: number) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function DriverDashboardClient({ driverName }: { driverName: string }) {
  const router = useRouter();
  const [date, setDate] = useState(todayStr());
  const [stops, setStops] = useState<StopData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [attentionDraft, setAttentionDraft] = useState<
    Record<string, { status: string; notes: string }>
  >({});

  const load = useCallback(async (d: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/driver/runs?date=${d}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not load your route.");
        setStops([]);
      } else {
        setStops(data.stops || []);
      }
    } catch {
      setError("Could not load your route.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(date);
  }, [date, load]);

  async function patchStop(stopId: string, body: Record<string, unknown>) {
    setSavingId(stopId);
    try {
      const res = await fetch(`/api/driver/stops/${stopId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Could not save.");
        return;
      }
      await load(date);
    } finally {
      setSavingId(null);
    }
  }

  async function handleLogout() {
    await fetch("/api/driver/logout", { method: "POST" });
    router.push("/driver/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-indigo-600 text-white px-4 py-3 flex items-center justify-between">
        <div>
          <div className="font-semibold">{driverName}</div>
          <div className="text-xs text-indigo-100">Your route</div>
        </div>
        <button onClick={handleLogout} className="text-sm underline">
          Sign out
        </button>
      </header>

      <div className="px-4 py-3 bg-white border-b flex items-center justify-between gap-2">
        <button
          onClick={() => setDate((d) => shiftDate(d, -1))}
          className="px-3 py-1 border rounded text-sm"
        >
          Prev
        </button>
        <div className="text-sm font-medium">{date}</div>
        <button
          onClick={() => setDate((d) => shiftDate(d, 1))}
          className="px-3 py-1 border rounded text-sm"
        >
          Next
        </button>
      </div>

      <div className="p-4 space-y-4">
        {loading && <p className="text-sm text-gray-500">Loading...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && !error && stops.length === 0 && (
          <p className="text-sm text-gray-500">No stops scheduled for this day.</p>
        )}

        {stops.map((stop) => {
          const isPickup = isPickupOrder(stop.order.deliveryType);
          const next = nextStopStatus(stop.status, isPickup);
          const draft = attentionDraft[stop.id] || {
            status: stop.attentionStatus || "",
            notes: stop.attentionNotes || "",
          };
          const noteDraft = notesDraft[stop.id] ?? (stop.driverInternalNote || "");

          return (
            <div key={stop.id} className="bg-white border rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <div className="font-semibold text-gray-900">
                  Order #{stop.order.orderNumber}
                </div>
                <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                  {STOP_STATUS_LABELS[stop.status] || "Pending"}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                {stop.order.customer.firstName} {stop.order.customer.lastName}
                {stop.order.customer.phone ? " - " + stop.order.customer.phone : ""}
              </div>
              <div className="text-sm text-gray-600 mb-2">
                {isPickup ? "Pickup" : "Delivery"}
                {stop.order.deliveryAddress ? " - " + stop.order.deliveryAddress : ""}
              </div>

              {next && (
                <button
                  disabled={savingId === stop.id}
                  onClick={() => patchStop(stop.id, { status: next })}
                  className="mb-3 bg-indigo-600 text-white text-sm rounded px-3 py-1.5 disabled:opacity-50"
                >
                  Mark {STOP_STATUS_LABELS[next]}
                </button>
              )}

              <div className="border-t pt-3 mt-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Item condition
                </label>
                <div className="flex gap-2 mb-2">
                  <select
                    value={draft.status}
                    onChange={(e) =>
                      setAttentionDraft((prev) => ({
                        ...prev,
                        [stop.id]: { ...draft, status: e.target.value },
                      }))
                    }
                    className="border rounded px-2 py-1 text-sm"
                  >
                    {(ATTENTION_STATUSES as readonly string[]).map((s) => (
                      <option key={s} value={s}>
                        {ATTENTION_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                  <button
                    disabled={savingId === stop.id}
                    onClick={() =>
                      patchStop(stop.id, {
                        attentionStatus: draft.status,
                        attentionNotes: draft.notes,
                      })
                    }
                    className="border rounded px-3 py-1 text-sm"
                  >
                    Save
                  </button>
                </div>
                {draft.status && (
                  <input
                    type="text"
                    value={draft.notes}
                    onChange={(e) =>
                      setAttentionDraft((prev) => ({
                        ...prev,
                        [stop.id]: { ...draft, notes: e.target.value },
                      }))
                    }
                    placeholder="Details (optional)"
                    className="w-full border rounded px-2 py-1 text-sm mb-2"
                  />
                )}

                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Your notes
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={noteDraft}
                    onChange={(e) =>
                      setNotesDraft((prev) => ({ ...prev, [stop.id]: e.target.value }))
                    }
                    placeholder="Notes for this stop"
                    className="flex-1 border rounded px-2 py-1 text-sm"
                  />
                  <button
                    disabled={savingId === stop.id}
                    onClick={() => patchStop(stop.id, { driverInternalNote: noteDraft })}
                    className="border rounded px-3 py-1 text-sm"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
