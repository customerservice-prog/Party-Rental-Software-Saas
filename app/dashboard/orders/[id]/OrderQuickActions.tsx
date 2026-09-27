"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Action = "cancel" | "refund" | "restrict" | "note";
type Customer = { firstName: string; lastName: string; email: string; phone?: string | null };

const REASONS = [
  "Payment Issue",
  "Chargeback",
  "Equipment Damage",
  "Equipment Not Returned",
  "Unsafe Property / Site",
  "Abusive / Threatening Conduct",
  "Fraud Concern",
  "Repeated Policy Violations",
  "Unauthorized Use",
  "Other",
];

export default function OrderQuickActions({
  orderId,
  orderNumber,
  status,
  amountPaid,
  customer,
  address,
}: {
  orderId: string;
  orderNumber: string;
  status: string;
  amountPaid: number;
  customer: Customer;
  address?: string | null;
}) {
  const router = useRouter();
  const [action, setAction] = useState<Action | null>(null);
  const [reason, setReason] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundMethod, setRefundMethod] = useState("card");
  const [reasonCategory, setReasonCategory] = useState(REASONS[0]);
  const [restrictEmail, setRestrictEmail] = useState(Boolean(customer.email));
  const [restrictPhone, setRestrictPhone] = useState(Boolean(customer.phone));
  const [restrictAddress, setRestrictAddress] = useState(!customer.email && !customer.phone && Boolean(address));
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const isCancelled = status === "cancelled" || status === "canceled";

  function open(next: Action) {
    setAction(next);
    setReason("");
    setRefundAmount("");
    setRefundMethod("card");
    setReasonCategory(REASONS[0]);
    setRestrictEmail(Boolean(customer.email));
    setRestrictPhone(Boolean(customer.phone));
    setRestrictAddress(!customer.email && !customer.phone && Boolean(address));
    setConfirmed(false);
    setError("");
    setNotice("");
  }

  function close() {
    if (busy) return;
    setAction(null);
    setError("");
    setConfirmed(false);
  }

  function jumpToPayments() {
    document.getElementById("payment-history")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!action || busy) return;
    setError("");

    if ((action === "cancel" || action === "refund" || action === "note") && !reason.trim()) {
      setError(action === "note" ? "Enter an internal note." : "Enter a reason for this action.");
      return;
    }
    if (action !== "note" && !confirmed) {
      setError("Review the action and check the confirmation box first.");
      return;
    }

    const amount = Number(refundAmount);
    if (action === "refund" && (!Number.isFinite(amount) || amount <= 0 || amount > amountPaid + 0.001)) {
      setError("Enter a refund/credit amount no greater than the amount currently recorded as paid.");
      return;
    }
    if (action === "restrict" && !restrictEmail && !restrictPhone && !restrictAddress) {
      setError("Choose at least one email, phone, or address to restrict.");
      return;
    }

    setBusy(true);
    try {
      let response: Response;
      if (action === "cancel") {
        response = await fetch(`/api/orders/${orderId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "cancelled", reason: reason.trim() }),
        });
      } else if (action === "refund") {
        response = await fetch(`/api/orders/${orderId}/payments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "refund",
            amount,
            method: refundMethod,
            tip: 0,
            note: reason.trim(),
          }),
        });
      } else if (action === "restrict") {
        const details = reason.trim();
        response = await fetch("/api/do-not-rent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: `${customer.firstName} ${customer.lastName}`.trim(),
            email: restrictEmail ? customer.email : null,
            phone: restrictPhone ? customer.phone : null,
            address: restrictAddress ? address : null,
            reason: [reasonCategory, details].filter(Boolean).join(": ") + ` · Order ${orderNumber}`,
          }),
        });
      } else {
        response = await fetch(`/api/orders/${orderId}/notes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note: reason.trim() }),
        });
      }

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The action could not be completed.");

      if (action === "refund") {
        window.dispatchEvent(new CustomEvent("order-payments-changed", { detail: { orderId } }));
        setNotice("Manual refund / credit recorded. Complete the real processor refund separately when required.");
      } else if (action === "cancel") {
        setNotice("Order canceled. No refund or customer message was sent.");
      } else if (action === "restrict") {
        setNotice("Do Not Rent restriction added.");
      } else {
        setNotice("Internal note added.");
      }
      setAction(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The action could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <div className="friendly-admin-card !p-3">
      <div className="flex flex-wrap items-center gap-2" aria-label={`Quick actions for order ${orderNumber}`}>
        <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Quick actions</span>
        <button type="button" onClick={jumpToPayments} className="friendly-admin-secondary">💳 Payment</button>
        <button type="button" onClick={() => open("cancel")} disabled={isCancelled} className="friendly-admin-danger disabled:cursor-not-allowed disabled:opacity-40">❌ Cancel</button>
        <button type="button" onClick={() => open("refund")} disabled={amountPaid <= 0} className="friendly-admin-secondary disabled:cursor-not-allowed disabled:opacity-40" title={amountPaid <= 0 ? "No recorded paid amount is available to credit" : "Record a manual refund / credit"}>💸 Refund</button>
        <button type="button" onClick={() => open("restrict")} className="friendly-admin-danger">🚫 Do Not Rent</button>
        <button type="button" onClick={() => open("note")} className="friendly-admin-secondary">📝 Note</button>
      </div>
      {notice && <p role="status" className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">{notice}</p>}
    </div>

    {action && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4" role="dialog" aria-modal="true" aria-labelledby="order-action-title">
      <form onSubmit={submit} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div>
            <h2 id="order-action-title" className="text-lg font-bold text-slate-900">
              {action === "cancel" ? "Cancel order" : action === "refund" ? "Record refund / credit" : action === "restrict" ? "Add to Do Not Rent" : "Add internal note"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">Order {orderNumber} · {customer.firstName} {customer.lastName}</p>
          </div>
          <button type="button" onClick={close} disabled={busy} aria-label="Close order action" className="friendly-admin-secondary">✕</button>
        </div>

        <div className="space-y-4 p-5 text-sm">
          {action === "cancel" && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">Canceling removes this order from active work. It does not refund money and it does not send a customer message.</div>}

          {action === "refund" && <>
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 font-medium text-amber-900">
              This CRM refund entry does not send money back through Stripe or another card processor. It only records the credit in this order ledger and lowers the recorded paid balance.
            </div>
            <label className="block font-medium text-slate-700">Refund / credit amount
              <input type="number" min="0.01" max={Math.max(amountPaid, 0)} step="0.01" required value={refundAmount} onChange={e => { setRefundAmount(e.target.value); setConfirmed(false); }} className="friendly-admin-field mt-1 w-full"/>
              <span className="mt-1 block text-xs font-normal text-slate-500">Up to ${amountPaid.toFixed(2)} is currently recorded as paid.</span>
            </label>
            <label className="block font-medium text-slate-700">How the refund / credit is being handled
              <select value={refundMethod} onChange={e => { setRefundMethod(e.target.value); setConfirmed(false); }} className="friendly-admin-field mt-1 w-full">
                <option value="card">Card — record only</option>
                <option value="cash">Cash</option>
                <option value="check">Check</option>
                <option value="ach">ACH / bank</option>
                <option value="store_credit">Store credit</option>
                <option value="other">Other</option>
              </select>
            </label>
          </>}

          {action === "restrict" && <>
            <p className="text-slate-600">Choose exactly which customer identifiers should block future bookings. The reason stays staff-only.</p>
            <div className="space-y-2 rounded-lg border border-slate-200 p-3">
              {customer.email && <label className="flex items-start gap-2"><input type="checkbox" checked={restrictEmail} onChange={e => { setRestrictEmail(e.target.checked); setConfirmed(false); }} className="mt-1"/><span><b>Email</b><br/><span className="text-xs text-slate-500">{customer.email}</span></span></label>}
              {customer.phone && <label className="flex items-start gap-2"><input type="checkbox" checked={restrictPhone} onChange={e => { setRestrictPhone(e.target.checked); setConfirmed(false); }} className="mt-1"/><span><b>Phone</b><br/><span className="text-xs text-slate-500">{customer.phone}</span></span></label>}
              {address && <label className="flex items-start gap-2"><input type="checkbox" checked={restrictAddress} onChange={e => { setRestrictAddress(e.target.checked); setConfirmed(false); }} className="mt-1"/><span><b>Address</b><br/><span className="text-xs text-slate-500">{address}</span></span></label>}
            </div>
            <label className="block font-medium text-slate-700">Reason category
              <select value={reasonCategory} onChange={e => { setReasonCategory(e.target.value); setConfirmed(false); }} className="friendly-admin-field mt-1 w-full">{REASONS.map(item => <option key={item}>{item}</option>)}</select>
            </label>
          </>}

          <label className="block font-medium text-slate-700">{action === "note" ? "Internal note" : action === "restrict" ? "Staff details (optional)" : "Reason / staff notes"}
            <textarea rows={4} maxLength={4000} required={action !== "restrict"} value={reason} onChange={e => { setReason(e.target.value); setConfirmed(false); }} className="friendly-admin-field mt-1 w-full" placeholder={action === "note" ? "Add context future staff should see..." : "Why is this action being taken?"}/>
          </label>

          {action !== "note" && <label className="flex items-start gap-2 rounded-lg border border-slate-200 p-3">
            <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-1"/>
            <span>{action === "cancel"
              ? `I confirm canceling order ${orderNumber} without automatically refunding or messaging the customer.`
              : action === "refund"
                ? `I confirm recording a manual ${refundAmount || "0.00"} refund / credit entry; this screen is not sending money through a processor.`
                : "I confirm creating a Do Not Rent restriction for only the identifiers selected above."}</span>
          </label>}

          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-800">{error}</p>}

          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <button type="submit" disabled={busy || (action !== "note" && !confirmed)} className={action === "cancel" || action === "restrict" ? "friendly-admin-danger" : "friendly-admin-primary"}>
              {busy ? "Saving…" : action === "cancel" ? "Confirm cancellation" : action === "refund" ? "Record refund / credit" : action === "restrict" ? "Create restriction" : "Save internal note"}
            </button>
            <button type="button" onClick={close} disabled={busy} className="friendly-admin-secondary">Back</button>
          </div>
        </div>
      </form>
    </div>}
  </>;
}
