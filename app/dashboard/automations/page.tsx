"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type RecentMessage = {
  id: string;
  toName: string;
  toAddress: string;
  subject: string | null;
  status: string;
  channel: string;
  automationType: string | null;
  createdAt: string;
};

type AutomationData = {
  autoConfirmationEnabled: boolean;
  autoReminderEnabled: boolean;
  reminderDaysBefore: number;
  autoBalanceReminderEnabled: boolean;
  balanceReminderDaysBefore: number;
  automationsLastRunAt: string | null;
  emailProviderConfigured: boolean;
  smsProviderConfigured: boolean;
  confirmationsSentCount: number;
  remindersSentCount: number;
  balanceRemindersSentCount: number;
  recent: RecentMessage[];
};

const TABS = [
  { label: "Overview", href: "/dashboard/marketing" },
  { label: "Campaigns", href: "/dashboard/message-templates" },
  { label: "Audiences", href: "/dashboard/customers" },
  { label: "Automations", href: "/dashboard/automations" },
  { label: "Performance", href: "/dashboard/analytics" },
  { label: "Settings", href: "/dashboard/settings" },
];

export default function AutomationsPage() {
  const [data, setData] = useState<AutomationData | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [reminderDaysInput, setReminderDaysInput] = useState("3");
  const [balanceDaysInput, setBalanceDaysInput] = useState("3");

  async function load() {
    try {
      const res = await fetch("/api/automations");
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setReminderDaysInput(String(json.reminderDaysBefore));
        setBalanceDaysInput(String(json.balanceReminderDaysBefore));
      } else {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Failed to load automations.");
      }
    } catch {
      setError("Failed to load automations.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function updateSetting(patch: Record<string, boolean | number>) {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/automations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Failed to save.");
      } else {
        setNotice("Saved.");
        await load();
      }
    } catch {
      setError("Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function runNow() {
    setRunning(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/automations", { method: "POST" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error || "Failed to run automations.");
      } else {
        setNotice(
          `Ran automations: ${j.confirmationsSent} confirmation(s), ${j.remindersSent} event reminder(s), and ${j.balanceRemindersSent || 0} balance reminder(s) processed.`
        );
        await load();
      }
    } catch {
      setError("Failed to run automations.");
    } finally {
      setRunning(false);
    }
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <p className="text-sm text-gray-500">Loading...</p>
        )}
      </div>
    );
  }

  const sectionStyle = "border border-gray-200 rounded-lg p-5 bg-white mb-5";

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Marketing</h1>
      <p className="text-sm text-gray-500 mb-4">
        Automations - booking confirmations, event reminders, and balance-due reminders by connected email/SMS providers.
      </p>

      <div className="flex gap-6 border-b border-gray-200 mb-5">
        {TABS.map((tab) => (
          <Link
            key={tab.label}
            href={tab.href}
            className={
              tab.label === "Automations"
                ? "pb-2 font-semibold text-sm text-indigo-600 border-b-2 border-indigo-600"
                : "pb-2 font-semibold text-sm text-gray-600 border-b-2 border-transparent"
            }
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded bg-red-50 text-red-700 px-4 py-2 text-sm">{error}</div>
      )}
      {notice && (
        <div className="mb-4 rounded bg-green-50 text-green-700 px-4 py-2 text-sm">{notice}</div>
      )}

      <div
        className={
          "rounded-lg p-4 mb-5 border " +
          (data.emailProviderConfigured || data.smsProviderConfigured ? "bg-emerald-50 border-emerald-200" : "bg-blue-50 border-blue-200")
        }
      >
        <div
          className="text-xs font-bold tracking-wide mb-1"
          style={{ color: data.emailProviderConfigured || data.smsProviderConfigured ? "#1f8a53" : "#3454b4" }}
        >
          {data.emailProviderConfigured || data.smsProviderConfigured ? "AUTOMATION MODE: LIVE" : "AUTOMATION MODE: DRAFT ONLY"}
        </div>
        <div className="text-sm text-gray-700">
          {data.emailProviderConfigured || data.smsProviderConfigured
            ? `Connected delivery: ${data.emailProviderConfigured ? "Email" : ""}${data.emailProviderConfigured && data.smsProviderConfigured ? " + " : ""}${data.smsProviderConfigured ? "SMS" : ""}. Enabled automations use every reachable connected channel.`
            : "No outbound provider is connected yet. Automations still run and are logged honestly; connect Resend and/or Twilio in Settings to start real delivery."}
        </div>
      </div>

      <div className={sectionStyle}>
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Booking Confirmation</div>
        <p className="text-sm text-gray-600 mb-3">
          Automatically notifies a customer when their order is confirmed, using each connected and reachable channel.
        </p>
        <label className="flex items-center gap-2 text-sm mb-2">
          <input
            type="checkbox"
            checked={data.autoConfirmationEnabled}
            disabled={saving}
            onChange={(e) => updateSetting({ autoConfirmationEnabled: e.target.checked })}
          />
          Enabled
        </label>
        <div className="text-2xl font-bold">{data.confirmationsSentCount}</div>
        <div className="text-sm text-gray-500">Confirmations sent</div>
      </div>

      <div className={sectionStyle}>
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Event Reminder</div>
        <p className="text-sm text-gray-600 mb-3">
          Automatically notifies a customer once their event is within the reminder window below, if
          the order has not already been processed for an event reminder.
        </p>
        <label className="flex items-center gap-2 text-sm mb-3">
          <input
            type="checkbox"
            checked={data.autoReminderEnabled}
            disabled={saving}
            onChange={(e) => updateSetting({ autoReminderEnabled: e.target.checked })}
          />
          Enabled
        </label>
        <div className="flex items-center gap-2 mb-3">
          <label className="text-sm text-gray-600">Send reminder</label>
          <input
            type="number"
            min={1}
            max={30}
            className="w-16 border rounded px-2 py-1 text-sm"
            value={reminderDaysInput}
            onChange={(e) => setReminderDaysInput(e.target.value)}
            onBlur={() => {
              const n = parseInt(reminderDaysInput, 10);
              if (Number.isFinite(n) && n >= 1 && n <= 30) {
                updateSetting({ reminderDaysBefore: n });
              }
            }}
          />
          <label className="text-sm text-gray-600">day(s) before the event</label>
        </div>
        <div className="text-2xl font-bold">{data.remindersSentCount}</div>
        <div className="text-sm text-gray-500">Reminders sent</div>
      </div>

      <div className={sectionStyle}>
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Balance Due Reminder</div>
        <p className="text-sm text-gray-600 mb-3">
          Notifies customers with an unpaid balance when their event enters the configured payment window.
          Fully paid orders are automatically skipped.
        </p>
        <label className="flex items-center gap-2 text-sm mb-3">
          <input
            type="checkbox"
            checked={data.autoBalanceReminderEnabled}
            disabled={saving}
            onChange={(e) => updateSetting({ autoBalanceReminderEnabled: e.target.checked })}
          />
          Enabled
        </label>
        <div className="flex items-center gap-2 mb-3">
          <label className="text-sm text-gray-600">Send balance reminder</label>
          <input
            type="number"
            min={1}
            max={30}
            className="w-16 border rounded px-2 py-1 text-sm"
            value={balanceDaysInput}
            onChange={(e) => setBalanceDaysInput(e.target.value)}
            onBlur={() => {
              const n = parseInt(balanceDaysInput, 10);
              if (Number.isFinite(n) && n >= 1 && n <= 30) {
                updateSetting({ balanceReminderDaysBefore: n });
              }
            }}
          />
          <label className="text-sm text-gray-600">day(s) before the event</label>
        </div>
        <div className="text-2xl font-bold">{data.balanceRemindersSentCount}</div>
        <div className="text-sm text-gray-500">Balance reminder messages recorded</div>
      </div>

      <div className={sectionStyle}>
        <div className="flex justify-between items-center mb-3">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wide">Automation Activity</div>
          <button
            onClick={runNow}
            disabled={running}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {running ? "Running..." : "Run automations now"}
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-3">
          Automations also run automatically (at most once per minute) whenever staff use the
          dashboard - there is no separate always-on scheduler.
          {data.automationsLastRunAt
            ? ` Last run: ${new Date(data.automationsLastRunAt).toLocaleString()}.`
            : ""}
        </p>
        {data.recent.length === 0 ? (
          <p className="text-sm text-gray-500">No automated messages yet.</p>
        ) : (
          <div className="overflow-hidden border rounded">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">To</th>
                  <th className="px-3 py-2">Subject</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.map((m) => (
                  <tr key={m.id} className="border-t">
                    <td className="px-3 py-2 whitespace-nowrap">
                      {new Date(m.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {m.automationType === "booking_confirmation" ? "Confirmation" : m.automationType === "balance_due" ? "Balance due" : "Event reminder"} · {m.channel.toUpperCase()}
                    </td>
                    <td className="px-3 py-2">
                      {m.toName} <span className="text-gray-400">({m.toAddress})</span>
                    </td>
                    <td className="px-3 py-2">{m.subject || "-"}</td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          "inline-block rounded px-2 py-0.5 text-xs " +
                          (m.status === "sent"
                            ? "bg-green-100 text-green-800"
                            : m.status === "failed"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800")
                        }
                      >
                        {m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
