"use client";

import { useCallback, useEffect, useState } from "react";
import {
  STOP_STATUS_LABELS,
  ATTENTION_STATUSES,
  ATTENTION_STATUS_LABELS,
  isPickupOrder,
  nextStopStatus,
} from "@/lib/driverRuns";

type Customer = { firstName: string; lastName: string };
type OrderRow = {
  id: string;
  orderNumber: string;
  eventDate: string;
  deliveryType: string;
  deliveryAddress: string | null;
  customer: Customer;
};
type Stop = {
  id: string;
  stopOrder: number;
  status: string;
  attentionStatus: string;
  attentionNotes: string | null;
  stopNotes: string | null;
  stopPayOverride: number | null;
  order: OrderRow;
};
type Driver = { id: string; name: string; defaultStopPay: number };
type Run = { id: string; driver: Driver; stops: Stop[] };
type DispatchData = { date: string; drivers: Driver[]; runs: Run[]; unassigned: OrderRow[] };

function todayIso() {
  const d = new Date();
  const tz = d.getTimezoneOffset();
  const local = new Date(d.getTime() - tz * 60000);
  return local.toISOString().slice(0, 10);
}

function addDays(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function DispatchPage() {
  const [date, setDate] = useState(todayIso());
  const [data, setData] = useState<DispatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/dispatch?date=${date}`);
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Failed to load dispatch data.");
      setData(null);
    } else {
      setData(json);
    }
    setLoading(false);
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  async function assign(orderId: string, driverId: string) {
    if (!driverId) return;
    setBusy(orderId);
    await fetch("/api/dispatch/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, driverId, date }),
    });
    setBusy(null);
    load();
  }

  async function unassign(orderId: string) {
    setBusy(orderId);
    await fetch("/api/dispatch/unassign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, date }),
    });
    setBusy(null);
    load();
  }

  async function patchStop(stopId: string, body: Record<string, unknown>) {
    setBusy(stopId);
    const res = await fetch(`/api/dispatch/stops/${stopId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Update failed.");
    }
    setBusy(null);
    load();
  }

  async function optimize(runId: string) {
    setBusy(runId);
    await fetch(`/api/dispatch/runs/${runId}/optimize`, { method: "POST" });
    setBusy(null);
    load();
  }

  async function setDriverPay(driverId: string, pay: string) {
    setBusy(driverId);
    await fetch(`/api/drivers/${driverId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaultStopPay: Number(pay) || 0 }),
    });
    setBusy(null);
    load();
  }

  const drivers = data?.drivers || [];

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dispatch</h1>
          <p className="text-sm text-gray-500 mt-1">
            Group orders into driver runs, order stops, and track live delivery status.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDate(addDays(date, -1))}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
          >
            &larr; Prev
          </button>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            onClick={() => setDate(addDays(date, 1))}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
          >
            Next &rarr;
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : !data ? (
        <p className="text-sm text-gray-500">No data.</p>
      ) : (
        <div className="space-y-8">
          <div className="rounded-lg border bg-white p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              Unassigned orders ({data.unassigned.length})
            </h2>
            {data.unassigned.length === 0 ? (
              <p className="text-sm text-gray-500">Everything for this date is assigned.</p>
            ) : (
              <div className="divide-y">
                {data.unassigned.map((order) => (
                  <div key={order.id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        #{order.orderNumber} &middot; {order.customer.firstName} {order.customer.lastName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {order.deliveryType} &middot; {order.deliveryAddress || "No address"}
                      </p>
                    </div>
                    <select
                      defaultValue=""
                      disabled={busy === order.id}
                      onChange={(e) => assign(order.id, e.target.value)}
                      className="rounded-md border-gray-300 text-sm"
                    >
                      <option value="">Assign to driver...</option>
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>

          {data.runs.length === 0 ? (
            <p className="text-sm text-gray-500">No driver runs created for this date yet.</p>
          ) : (
            data.runs.map((run) => (
              <div key={run.id} className="rounded-lg border bg-white p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h2 className="text-sm font-semibold text-gray-900">{run.driver.name}</h2>
                    <label className="text-xs text-gray-500 flex items-center gap-1">
                      $/stop
                      <input
                        type="number"
                        defaultValue={run.driver.defaultStopPay}
                        onBlur={(e) => setDriverPay(run.driver.id, e.target.value)}
                        className="w-16 rounded border-gray-300 text-xs"
                      />
                    </label>
                  </div>
                  <button
                    onClick={() => optimize(run.id)}
                    disabled={busy === run.id}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    Optimize route
                  </button>
                </div>
                <div className="divide-y">
                  {run.stops.map((stop, idx) => {
                    const pickup = isPickupOrder(stop.order.deliveryType);
                    const advance = nextStopStatus(stop.status, pickup);
                    return (
                      <div key={stop.id} className="py-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {idx + 1}. #{stop.order.orderNumber} &middot; {stop.order.customer.firstName}{" "}
                              {stop.order.customer.lastName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {stop.order.deliveryAddress || "No address"} &middot; Status:{" "}
                              {STOP_STATUS_LABELS[stop.status] || stop.status}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {advance ? (
                              <button
                                onClick={() => patchStop(stop.id, { status: advance })}
                                disabled={busy === stop.id}
                                className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                              >
                                Mark {STOP_STATUS_LABELS[advance]}
                              </button>
                            ) : null}
                            <button
                              onClick={() => patchStop(stop.id, { move: "up" })}
                              disabled={busy === stop.id || idx === 0}
                              className="text-xs text-gray-500 hover:text-gray-900 disabled:opacity-30"
                            >
                              &uarr;
                            </button>
                            <button
                              onClick={() => patchStop(stop.id, { move: "down" })}
                              disabled={busy === stop.id || idx === run.stops.length - 1}
                              className="text-xs text-gray-500 hover:text-gray-900 disabled:opacity-30"
                            >
                              &darr;
                            </button>
                            <select
                              defaultValue=""
                              disabled={busy === stop.id}
                              onChange={(e) => patchStop(stop.id, { moveToDriverId: e.target.value })}
                              className="rounded-md border-gray-300 text-xs"
                            >
                              <option value="">Move to...</option>
                              {drivers
                                .filter((d) => d.id !== run.driver.id)
                                .map((d) => (
                                  <option key={d.id} value={d.id}>
                                    {d.name}
                                  </option>
                                ))}
                            </select>
                            <button
                              onClick={() => unassign(stop.order.id)}
                              disabled={busy === stop.id}
                              className="text-xs text-red-600 hover:underline"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                          <label className="text-xs text-gray-500 flex items-center gap-1">
                            Condition
                            <select
                              defaultValue={stop.attentionStatus}
                              disabled={busy === stop.id}
                              onChange={(e) => patchStop(stop.id, { attentionStatus: e.target.value })}
                              className="rounded border-gray-300 text-xs"
                            >
                              {ATTENTION_STATUSES.map((code) => (
                                <option key={code} value={code}>
                                  {ATTENTION_STATUS_LABELS[code]}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="text-xs text-gray-500 flex items-center gap-1">
                            Pay override
                            <input
                              type="number"
                              defaultValue={stop.stopPayOverride ?? ""}
                              placeholder="default"
                              onBlur={(e) => patchStop(stop.id, { stopPayOverride: e.target.value })}
                              className="w-20 rounded border-gray-300 text-xs"
                            />
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
