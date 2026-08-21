"use client";

import { useState } from "react";

type LookupResult = {
  orderNumber: string;
  status: string;
  eventDate: string;
  eventEndDate: string | null;
  deliveryType: string;
  deliveryAddress: string | null;
  subtotal: number;
  deliveryFee: number;
  taxAmount: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  customerName: string;
  items: { name: string; quantity: number; price: number }[];
  addons: { name: string; price: number }[];
  contract: {
    signed: boolean;
    signedAt: string | null;
    signatureName: string | null;
    contractText: string | null;
  } | null;
};

export default function OrderStatusPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const params = new URLSearchParams({
        orderNumber: orderNumber.trim(),
        email: email.trim(),
      });
      const res = await fetch("/api/order-lookup?" + params.toString());
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No order found matching that order number and email.");
        return;
      }
      setResult(data.order);
    } catch {
      setError("Something went wrong looking up your order.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-2">Track Your Order</h1>
      <p className="text-sm text-gray-600 mb-6">
        Enter your order number and the email you used at checkout to view your
        booking status and balance.
      </p>

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Order number</label>
          <input
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            required
            placeholder="e.g. ORD-1785963075926"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          />
        </div>
        {error && (
          <div className="p-3 rounded-md bg-red-50 text-red-700 text-sm">{error}</div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "Looking up..." : "Look Up Order"}
        </button>
      </form>

      {result && (
        <div className="bg-white shadow rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">{result.orderNumber}</h2>
            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 capitalize">
              {result.status}
            </span>
          </div>
          <div className="text-sm text-gray-600">
            <div>Booked by: {result.customerName}</div>
            <div>
              Event date: {new Date(result.eventDate).toLocaleDateString()}
              {result.eventEndDate
                ? ` - ${new Date(result.eventEndDate).toLocaleDateString()}`
                : ""}
            </div>
            <div className="capitalize">Delivery type: {result.deliveryType}</div>
            {result.deliveryAddress && <div>Address: {result.deliveryAddress}</div>}
          </div>

          <div className="border-t pt-4">
            <div className="font-medium text-gray-900 mb-2">Items</div>
            <div className="space-y-1 text-sm text-gray-700">
              {result.items.map((it, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>
                    {it.name} x{it.quantity}
                  </span>
                  <span>${it.price.toFixed(2)}</span>
                </div>
              ))}
              {result.addons.map((a, idx) => (
                <div key={"addon-" + idx} className="flex justify-between text-gray-500">
                  <span>{a.name}</span>
                  <span>${a.price.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-4 space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>${result.subtotal.toFixed(2)}</span>
            </div>
            {result.deliveryFee > 0 && (
              <div className="flex justify-between">
                <span>Delivery fee</span>
                <span>${result.deliveryFee.toFixed(2)}</span>
              </div>
            )}
            {result.taxAmount > 0 && (
              <div className="flex justify-between">
                <span>Tax</span>
                <span>${result.taxAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>${result.totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Paid so far</span>
              <span>${result.amountPaid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold text-indigo-700">
              <span>Balance due</span>
              <span>${result.balanceDue.toFixed(2)}</span>
            </div>
          </div>

          <div className="border-t pt-4 text-sm">
            <div className="font-medium text-gray-900 mb-1">Rental Agreement</div>
            {result.contract?.signed ? (
              <>
                <div className="text-green-700 mb-2">
                  Signed by {result.contract.signatureName} on{" "}
                  {result.contract.signedAt
                    ? new Date(result.contract.signedAt).toLocaleDateString()
                    : ""}
                </div>
                {result.contract.contractText && (
                  <div className="max-h-40 overflow-y-auto rounded-md border border-gray-300 bg-gray-50 p-3 text-xs text-gray-600 whitespace-pre-wrap">
                    {result.contract.contractText}
                  </div>
                )}
              </>
            ) : (
              <div className="text-gray-500">Not yet signed.</div>
            )}
          </div>

          {result.balanceDue > 0 && (
            <div className="border-t pt-4 text-sm text-gray-600">
              To pay your remaining balance, please contact us directly.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
