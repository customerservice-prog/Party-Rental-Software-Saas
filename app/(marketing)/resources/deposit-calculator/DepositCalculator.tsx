"use client";

import { useMemo, useState } from "react";

export default function DepositCalculator() {
  const [orderTotal, setOrderTotal] = useState(500);
  const [depositPercent, setDepositPercent] = useState(50);

  const results = useMemo(() => {
    const safeTotal = Number.isFinite(orderTotal) && orderTotal > 0 ? orderTotal : 0;
    const safePercent =
      Number.isFinite(depositPercent) && depositPercent > 0 && depositPercent <= 100
        ? depositPercent
        : 0;
    const deposit = Math.round((safeTotal * safePercent) / 100);
    const remaining = Math.max(safeTotal - deposit, 0);
    return { deposit, remaining };
  }, [orderTotal, depositPercent]);

  return (
    <div className="rounded-lg border border-gray-200 p-8">
      <label htmlFor="order-total" className="block text-sm font-medium text-gray-900">
        Order total ($)
      </label>
      <input
        id="order-total"
        type="number"
        min={0}
        value={orderTotal}
        onChange={(event) => setOrderTotal(Number(event.target.value))}
        className="mt-2 w-full rounded-md border border-gray-300 px-4 py-2 text-lg focus:border-orange-500 focus:outline-none"
      />

      <label htmlFor="deposit-percent" className="mt-6 block text-sm font-medium text-gray-900">
        Deposit percentage (%)
      </label>
      <input
        id="deposit-percent"
        type="number"
        min={0}
        max={100}
        value={depositPercent}
        onChange={(event) => setDepositPercent(Number(event.target.value))}
        className="mt-2 w-full rounded-md border border-gray-300 px-4 py-2 text-lg focus:border-orange-500 focus:outline-none"
      />

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-md bg-gray-50 p-4 text-center">
          <p className="text-3xl font-bold text-gray-900">${results.deposit}</p>
          <p className="mt-1 text-sm text-gray-600">Deposit due at booking</p>
        </div>
        <div className="rounded-md bg-gray-50 p-4 text-center">
          <p className="text-3xl font-bold text-gray-900">${results.remaining}</p>
          <p className="mt-1 text-sm text-gray-600">Remaining balance</p>
        </div>
      </div>
    </div>
  );
}
