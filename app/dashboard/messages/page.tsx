"use client";

import { useEffect, useState } from "react";

type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
};

type Template = {
  id: string;
  name: string;
  channel: string;
  subject: string | null;
  body: string;
};

type SentMessage = {
  id: string;
  channel: string;
  toName: string;
  toAddress: string;
  subject: string | null;
  body: string;
  status: string;
  createdAt: string;
};

export default function MessagesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [history, setHistory] = useState<SentMessage[]>([]);

  const [channel, setChannel] = useState("email");
  const [customerId, setCustomerId] = useState("");
  const [toName, setToName] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [templateId, setTemplateId] = useState("");

  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadAll() {
    try {
      const [cRes, tRes, mRes] = await Promise.all([
        fetch("/api/customers"),
        fetch("/api/message-templates"),
        fetch("/api/messages"),
      ]);
      if (cRes.ok) setCustomers(await cRes.json());
      if (tRes.ok) setTemplates(await tRes.json());
      if (mRes.ok) {
        const data = await mRes.json();
        setHistory(data.messages || []);
      }
    } catch {
      setError("Failed to load data.");
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  function onSelectCustomer(id: string) {
    setCustomerId(id);
    const c = customers.find((x) => x.id === id);
    if (!c) return;
    setToName(`${c.firstName} ${c.lastName}`.trim());
    setToAddress(channel === "sms" ? c.phone || "" : c.email);
  }

  function onSelectTemplate(id: string) {
    setTemplateId(id);
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    if (t.subject) setSubject(t.subject);
    setBody(t.body);
    if (t.channel) setChannel(t.channel);
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this message from history?")) return;
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/messages?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to delete message.");
      } else {
        await loadAll();
      }
    } catch {
      setError("Failed to delete message.");
    }
  }

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          toName,
          toAddress,
          subject: channel === "email" ? subject : null,
          body,
          templateId: templateId || null,
          customerId: customerId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to queue message.");
      } else {
        setNotice("Message queued. Delivery will be sent once a provider is connected.");
        setSubject("");
        setBody("");
        setTemplateId("");
        await loadAll();
      }
    } catch {
      setError("Failed to queue message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Messages</h1>
      <p className="text-sm text-gray-500 mb-6">
        Compose an email or SMS to a customer. Messages are queued and will be
        delivered once a messaging provider is connected.
      </p>

      {error && (
        <div className="mb-4 rounded bg-red-50 text-red-700 px-4 py-2 text-sm">
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-4 rounded bg-green-50 text-green-700 px-4 py-2 text-sm">
          {notice}
        </div>
      )}

      <form onSubmit={onSend} className="bg-white border rounded-lg p-5 mb-8 space-y-4">
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="channel"
              checked={channel === "email"}
              onChange={() => setChannel("email")}
            />
            Email
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="channel"
              checked={channel === "sms"}
              onChange={() => setChannel("sms")}
            />
            SMS
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Customer</label>
            <select
              className="w-full border rounded px-3 py-2 text-sm"
              value={customerId}
              onChange={(e) => onSelectCustomer(e.target.value)}
            >
              <option value="">-- Select a customer --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Insert template</label>
            <select
              className="w-full border rounded px-3 py-2 text-sm"
              value={templateId}
              onChange={(e) => onSelectTemplate(e.target.value)}
            >
              <option value="">-- No template --</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Recipient name</label>
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              value={toName}
              onChange={(e) => setToName(e.target.value)}
              placeholder="Jane Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              {channel === "sms" ? "Phone number" : "Email address"}
            </label>
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              placeholder={channel === "sms" ? "555-123-4567" : "jane@example.com"}
            />
          </div>
        </div>

        {channel === "email" && (
          <div>
            <label className="block text-sm font-medium mb-1">Subject</label>
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject line"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Message</label>
          <textarea
            className="w-full border rounded px-3 py-2 text-sm"
            rows={6}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message..."
          />
        </div>

        <button
          type="submit"
          disabled={sending}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
        >
          {sending ? "Queuing..." : "Queue message"}
        </button>
      </form>

      <h2 className="text-lg font-semibold mb-3">Message history</h2>
      {history.length === 0 ? (
        <p className="text-sm text-gray-500">No messages yet.</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Channel</th>
                <th className="px-3 py-2">To</th>
                <th className="px-3 py-2">Subject</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {history.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="px-3 py-2 whitespace-nowrap">
                    {new Date(m.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 uppercase text-xs">{m.channel}</td>
                  <td className="px-3 py-2">
                    {m.toName}
                    <span className="text-gray-400"> ({m.toAddress})</span>
                  </td>
                  <td className="px-3 py-2">{m.subject || "-"}</td>
                  <td className="px-3 py-2">
                    <span className="inline-block rounded bg-yellow-100 text-yellow-800 px-2 py-0.5 text-xs">
                      {m.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => onDelete(m.id)}
                      className="text-red-600 hover:underline text-xs"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
