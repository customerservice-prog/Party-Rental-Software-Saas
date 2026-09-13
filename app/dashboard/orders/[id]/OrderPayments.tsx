"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

type Payment = {
  id: string;
  amount: number;
  type: string;
  method: string;
  tip: number;
  note: string | null;
  recordedBy: string | null;
  createdAt: string;
};

const METHODS = [
  { value: "card", label: "Card" },
  { value: "cash", label: "Cash" },
  { value: "check", label: "Check" },
  { value: "other", label: "Other" },
];

export default function OrderPayments({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("card");
  const [type, setType] = useState("payment");
  const [tip, setTip] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/orders/" + orderId + "/payments");
    const data = await res.json();
    setPayments(data.payments || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [orderId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError("Enter an amount greater than $0");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/orders/" + orderId + "/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: parsedAmount,
        method,
        type,
        tip: tip ? parseFloat(tip) : 0,
        note,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error || "Could not record payment");
      return;
    }
    setAmount("");
    setTip("");
    setNote("");
    await load();
    router.refresh();
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 mb-4 items-end">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Type</label>
          <select
            className="border rounded px-2 py-2 text-sm"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="payment">Payment</option>
            <option value="refund">Refund</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Amount ($)</label>
          <input
            className="border rounded px-3 py-2 text-sm w-28"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Method</label>
          <select
            className="border rounded px-2 py-2 text-sm"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            {METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Tip ($)</label>
          <input
            className="border rounded px-3 py-2 text-sm w-20"
            type="number"
            step="0.01"
            min="0"
            value={tip}
            onChange={(e) => setTip(e.target.value)}
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="text-xs text-gray-400 block mb-1">Note (optional)</label>
          <input
            className="border rounded px-3 py-2 text-sm w-full"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="bg-brand-600 text-white px-3 py-2 rounded text-sm disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Record"}
        </button>
      </form>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-400">Loading payments...</p>
      ) : (
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="text-gray-500 border-b">
              <th className="py-1">Date</th>
              <th className="py-1">Type</th>
              <th className="py-1">Method</th>
              <th className="py-1">Amount</th>
              <th className="py-1">Tip</th>
              <th className="py-1">Recorded By</th>
              <th className="py-1">Note</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="py-2">{new Date(p.createdAt).toLocaleDateString()}</td>
                <td className="py-2 capitalize">{p.type}</td>
                <td className="py-2 capitalize">{p.method}</td>
                <td className={"py-2 " + (p.type === "refund" ? "text-red-600" : "")}>
                  {p.type === "refund" ? "-" : ""}${p.amount.toFixed(2)}
                </td>
                <td className="py-2">{p.tip > 0 ? "$" + p.tip.toFixed(2) : "-"}</td>
                <td className="py-2">{p.recordedBy || "-"}</td>
                <td className="py-2 text-gray-500">{p.note || "-"}</td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr>
                <td colSpan={7} className="py-2 text-gray-400">
                  No payments recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
