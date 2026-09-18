"use client";
import { useState } from "react";

export default function PayBalanceButton({ token, balance }: { token: string; balance: number }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function pay() {
    setBusy(true); setError("");
    try {
      const res = await fetch(`/api/portal/${encodeURIComponent(token)}/pay`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Could not start payment."); setBusy(false); return; }
      if (data.url) window.location.href = data.url;
      else { setError("Payment link was not returned."); setBusy(false); }
    } catch { setError("Could not start payment. Please try again."); setBusy(false); }
  }
  return <div>
    <button onClick={pay} disabled={busy || balance <= 0} className="w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-700 disabled:opacity-50">
      {busy ? "Opening secure payment…" : `Pay $${balance.toFixed(2)} balance`}
    </button>
    {error && <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p>}
  </div>;
}
