"use client";
import { useEffect, useState } from "react";

export default function PortalLinkButton({ orderId }: { orderId: string }) {
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<{hasActiveLink:boolean;expiresAt:string|null;lastViewedAt:string|null}|null>(null);
  const [message, setMessage] = useState("");

  async function refresh() {
    const res = await fetch(`/api/orders/${orderId}/portal-link`, { cache: "no-store" });
    if (res.ok) setStatus(await res.json());
  }
  useEffect(() => { refresh(); }, [orderId]);

  async function createLink() {
    setBusy(true); setMessage(""); setUrl("");
    const res = await fetch(`/api/orders/${orderId}/portal-link`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setUrl(data.url || "");
      setMessage("New secure customer link created. Older links were revoked.");
      await refresh();
    } else setMessage(data.error || "Could not create customer link.");
    setBusy(false);
  }

  async function revoke() {
    if (!confirm("Revoke the active customer portal link?")) return;
    setBusy(true); setMessage(""); setUrl("");
    const res = await fetch(`/api/orders/${orderId}/portal-link`, { method: "DELETE" });
    if (res.ok) { setMessage("Customer portal link revoked."); await refresh(); }
    else setMessage("Could not revoke customer link.");
    setBusy(false);
  }

  async function copy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setMessage("Customer portal link copied.");
  }

  return <section className="friendly-admin-card">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="font-black text-slate-900">Customer portal</h2>
        <p className="mt-1 text-xs text-slate-500">Give this customer one secure page for order details, items, contract, payment history and remaining balance.</p>
        {status?.hasActiveLink && <p className="mt-2 text-xs font-bold text-emerald-700">Active link · expires {status.expiresAt ? new Date(status.expiresAt).toLocaleDateString() : "later"}{status.lastViewedAt ? ` · last viewed ${new Date(status.lastViewedAt).toLocaleString()}` : ""}</p>}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <button onClick={createLink} disabled={busy} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">{busy ? "Working…" : status?.hasActiveLink ? "Replace link" : "Create portal link"}</button>
        {status?.hasActiveLink && <button onClick={revoke} disabled={busy} className="rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-black text-rose-600 disabled:opacity-50">Revoke</button>}
      </div>
    </div>
    {url && <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3"><div className="break-all text-xs font-semibold text-blue-900">{url}</div><div className="mt-2 flex gap-2"><button onClick={copy} className="friendly-admin-secondary !min-h-0 !px-3 !py-2 text-[#1a6fd4]">Copy link</button><a href={url} target="_blank" rel="noreferrer" className="friendly-admin-secondary !min-h-0 !px-3 !py-2">Preview ↗</a></div><p className="mt-2 text-[10px] text-blue-700">For security, the raw link is shown only when generated. Create a new one if you lose it.</p></div>}
    {message && <p className="mt-3 text-xs font-bold text-slate-600">{message}</p>}
  </section>;
}
