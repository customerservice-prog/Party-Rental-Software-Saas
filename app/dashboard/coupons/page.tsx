"use client";

import { useEffect, useState, FormEvent } from "react";

type Coupon = {
  id: string;
  code: string;
  discountType: string;
  discountAmount: number;
  expiresAt: string | null;
  isActive: boolean;
};

export default function CouponsManager() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    code: "",
    discountType: "percentage",
    discountAmount: "",
    expiresAt: "",
  });
  const [error, setError] = useState("");

  async function loadCoupons() {
    setLoading(true);
    const res = await fetch("/api/coupons");
    const data = await res.json();
    setCoupons(data.coupons || []);
    setLoading(false);
  }

  useEffect(() => {
    loadCoupons();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.code.trim() || !form.discountAmount) {
      setError("Coupon code and discount amount are required");
      return;
    }
    const res = await fetch("/api/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: form.code,
        discountType: form.discountType,
        discountAmount: Number(form.discountAmount),
        expiresAt: form.expiresAt || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to create coupon");
      return;
    }
    setForm({ code: "", discountType: "percentage", discountAmount: "", expiresAt: "" });
    await loadCoupons();
  }

  async function toggleActive(coupon: Coupon) {
    await fetch("/api/coupons", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: coupon.id, isActive: !coupon.isActive }),
    });
    await loadCoupons();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this coupon?")) return;
    await fetch("/api/coupons?id=" + id, { method: "DELETE" });
    await loadCoupons();
  }

  if (loading) {
    return <div className="p-8">Loading coupons...</div>;
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Coupons</h1>
      <p className="text-gray-500 mb-6">
        Create discount codes customers can apply at checkout.
      </p>

      {error && (
        <div className="mb-4 rounded bg-red-50 text-red-700 border border-red-200 px-4 py-2 text-sm">
          {error}
        </div>
      )}

      <form
        onSubmit={handleCreate}
        className="bg-white shadow rounded-lg p-6 mb-8 grid grid-cols-1 md:grid-cols-5 gap-3 items-end"
      >
        <label className="text-sm text-gray-600">
          Code
          <input
            className="mt-1 border rounded px-3 py-2 w-full uppercase"
            placeholder="SUMMER10"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />
        </label>
        <label className="text-sm text-gray-600">
          Type
          <select
            className="mt-1 border rounded px-3 py-2 w-full"
            value={form.discountType}
            onChange={(e) => setForm({ ...form, discountType: e.target.value })}
          >
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed amount</option>
          </select>
        </label>
        <label className="text-sm text-gray-600">
          Discount
          <input
            type="number"
            className="mt-1 border rounded px-3 py-2 w-full"
            placeholder={form.discountType === "percentage" ? "10" : "25"}
            value={form.discountAmount}
            onChange={(e) => setForm({ ...form, discountAmount: e.target.value })}
          />
        </label>
        <label className="text-sm text-gray-600">
          Expires (optional)
          <input
            type="date"
            className="mt-1 border rounded px-3 py-2 w-full"
            value={form.expiresAt}
            onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
          />
        </label>
        <button type="submit" className="bg-brand-600 text-white px-4 py-2 rounded h-fit">
          Add Coupon
        </button>
      </form>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {coupons.map((coupon) => (
              <tr key={coupon.id}>
                <td className="px-4 py-2 text-sm font-mono text-gray-900">{coupon.code}</td>
                <td className="px-4 py-2 text-sm text-gray-500">
                  {coupon.discountType === "percentage"
                    ? coupon.discountAmount + "% off"
                    : "$" + coupon.discountAmount.toFixed(2) + " off"}
                </td>
                <td className="px-4 py-2 text-sm text-gray-500">
                  {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : "Never"}
                </td>
                <td className="px-4 py-2 text-sm">
                  <button
                    onClick={() => toggleActive(coupon)}
                    className={coupon.isActive ? "text-green-700" : "text-gray-400"}
                  >
                    {coupon.isActive ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="px-4 py-2 text-sm">
                  <button
                    onClick={() => handleDelete(coupon.id)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {coupons.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-400">
                  No coupons yet. Create one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
