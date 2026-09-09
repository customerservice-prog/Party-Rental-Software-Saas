"use client";

import { useEffect, useState } from "react";

type Unit = {
  id: string;
  itemId: string;
  identifier: string;
  status: string;
  conditionNotes: string | null;
  lastInspectedAt: string | null;
};

const UNIT_STATUSES = ["available", "rented", "maintenance", "retired"];

// Optional per-item serialized asset tracking. Purely a staff record-keeping
// tool (asset tags / serial numbers / individually-named units) - it never
// changes booking availability, which is still based on the item's total
// quantity. A tenant who never opens this panel simply has zero units and
// nothing about their inventory behaves any differently.
export default function ItemUnitsPanel({
  itemId,
  itemName,
  quantity,
}: {
  itemId: string;
  itemName: string;
  quantity: number;
}) {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newIdentifier, setNewIdentifier] = useState("");
  const [generateCount, setGenerateCount] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editIdentifier, setEditIdentifier] = useState("");
  const [editStatus, setEditStatus] = useState("available");
  const [editNotes, setEditNotes] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/item-units?itemId=" + itemId);
    if (res.ok) {
      const data = await res.json();
      setUnits(data.units);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  async function addUnit() {
    if (!newIdentifier.trim()) return;
    const res = await fetch("/api/item-units", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, identifier: newIdentifier.trim() }),
    });
    if (res.ok) {
      setNewIdentifier("");
      setError("");
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not add unit.");
    }
  }

  async function generateUnits() {
    const count = parseInt(generateCount, 10);
    if (!count || count <= 0) return;
    const res = await fetch("/api/item-units", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, generateCount: count }),
    });
    if (res.ok) {
      setGenerateCount("");
      setError("");
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not generate units.");
    }
  }

  function startEdit(unit: Unit) {
    setEditingId(unit.id);
    setEditIdentifier(unit.identifier);
    setEditStatus(unit.status);
    setEditNotes(unit.conditionNotes || "");
  }

  async function saveEdit() {
    if (!editingId) return;
    const res = await fetch("/api/item-units", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingId,
        identifier: editIdentifier,
        status: editStatus,
        conditionNotes: editNotes,
      }),
    });
    if (res.ok) {
      setEditingId(null);
      setError("");
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not update unit.");
    }
  }

  async function removeUnit(id: string) {
    if (!confirm("Remove this unit?")) return;
    const res = await fetch("/api/item-units?id=" + id, { method: "DELETE" });
    if (res.ok) {
      load();
    } else {
      setError("Could not remove unit.");
    }
  }

  if (loading) {
    return <p className="text-xs text-gray-400">Loading units...</p>;
  }

  return (
    <div>
      <div className="text-xs font-semibold text-gray-600 mb-1">
        Individual units for {itemName}
      </div>
      <p className="text-xs text-gray-500 mb-2">
        Optional per-unit tracking (asset tags, serial numbers) for your own records only. This
        never changes booking availability, which is still based on this item&apos;s total
        quantity ({quantity}).{" "}
        {units.length > 0 && units.length + " of " + quantity + " tracked so far."}
      </p>
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      {units.length === 0 && (
        <p className="text-xs text-gray-400 mb-2">No individual units tracked yet.</p>
      )}
      <ul className="space-y-1 mb-3">
        {units.map((unit) =>
          editingId === unit.id ? (
            <li
              key={unit.id}
              className="flex flex-wrap items-center gap-2 text-sm bg-white border rounded p-2"
            >
              <input
                className="border rounded px-2 py-1 text-xs"
                value={editIdentifier}
                onChange={(e) => setEditIdentifier(e.target.value)}
              />
              <select
                className="border rounded px-2 py-1 text-xs"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
              >
                {UNIT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <input
                className="border rounded px-2 py-1 text-xs flex-1"
                placeholder="Notes (optional)"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />
              <button
                onClick={saveEdit}
                className="text-indigo-600 hover:underline text-xs"
                type="button"
              >
                Save
              </button>
              <button
                onClick={() => setEditingId(null)}
                className="text-gray-500 text-xs"
                type="button"
              >
                Cancel
              </button>
            </li>
          ) : (
            <li
              key={unit.id}
              className="flex items-center justify-between text-sm bg-white border rounded p-2"
            >
              <span>
                {unit.identifier}{" "}
                <span
                  className={
                    unit.status === "available"
                      ? "text-green-700"
                      : unit.status === "rented"
                      ? "text-indigo-700"
                      : "text-yellow-700"
                  }
                >
                  ({unit.status})
                </span>
                {unit.conditionNotes && (
                  <span className="text-gray-400"> - {unit.conditionNotes}</span>
                )}
              </span>
              <span className="space-x-2">
                <button
                  onClick={() => startEdit(unit)}
                  className="text-indigo-600 hover:underline text-xs"
                  type="button"
                >
                  Edit
                </button>
                <button
                  onClick={() => removeUnit(unit.id)}
                  className="text-red-600 hover:underline text-xs"
                  type="button"
                >
                  Remove
                </button>
              </span>
            </li>
          )
        )}
      </ul>
      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="border rounded px-2 py-1 text-xs"
          placeholder="New unit identifier (e.g. Tent #3)"
          value={newIdentifier}
          onChange={(e) => setNewIdentifier(e.target.value)}
        />
        <button
          onClick={addUnit}
          className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700"
          type="button"
        >
          Add Unit
        </button>
        <span className="text-xs text-gray-400">or</span>
        <input
          className="border rounded px-2 py-1 text-xs w-20"
          placeholder="Count"
          value={generateCount}
          onChange={(e) => setGenerateCount(e.target.value)}
        />
        <button
          onClick={generateUnits}
          className="rounded-md bg-white border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
          type="button"
        >
          Auto-generate units
        </button>
      </div>
    </div>
  );
}
