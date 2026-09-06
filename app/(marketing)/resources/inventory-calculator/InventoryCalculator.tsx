"use client";

import { useMemo, useState } from "react";

export default function InventoryCalculator() {
  const [guests, setGuests] = useState(50);

  const results = useMemo(() => {
    const safeGuests = Number.isFinite(guests) && guests > 0 ? guests : 0;
    const roundTables = Math.ceil(safeGuests / 8);
    const chairs = Math.ceil(safeGuests * 1.1);
    const linens = roundTables;
    return { roundTables, chairs, linens };
  }, [guests]);

  return (
    <div className="rounded-lg border border-gray-200 p-8">
      <label htmlFor="guest-count" className="block text-sm font-medium text-gray-900">
        How many guests?
      </label>
      <input
        id="guest-count"
        type="number"
        min={1}
        value={guests}
        onChange={(event) => setGuests(Number(event.target.value))}
        className="mt-2 w-full rounded-md border border-gray-300 px-4 py-2 text-lg focus:border-orange-500 focus:outline-none"
      />

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-md bg-gray-50 p-4 text-center">
          <p className="text-3xl font-bold text-gray-900">{results.roundTables}</p>
          <p className="mt-1 text-sm text-gray-600">Round tables (seats 8)</p>
        </div>
        <div className="rounded-md bg-gray-50 p-4 text-center">
          <p className="text-3xl font-bold text-gray-900">{results.chairs}</p>
          <p className="mt-1 text-sm text-gray-600">Chairs (with 10% buffer)</p>
        </div>
        <div className="rounded-md bg-gray-50 p-4 text-center">
          <p className="text-3xl font-bold text-gray-900">{results.linens}</p>
          <p className="mt-1 text-sm text-gray-600">Table linens</p>
        </div>
      </div>

      <p className="mt-6 text-sm text-gray-500">
        This estimate assumes 8-foot round tables seating 8 guests each and a
        10% buffer on chairs for staff and last-minute additions. Banquet
        tables, lounge seating, or buffet and bar layouts will change these
        numbers.
      </p>
    </div>
  );
}
