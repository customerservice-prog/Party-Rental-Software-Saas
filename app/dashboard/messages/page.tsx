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
  direction?: string;
  fromAddress?: string | null;
  customerId?: string | null;
  providerError?: string | null;
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const to = params.get("to");
    const name = params.get("name");
    const cid = params.get("customerId");
    const ch = params.get("channel");
    const subj = params.get("subject");
    if (to) setToAddress(to);
    if (name) setToName(name);
    if (cid) setCustomerId(cid);
    if (ch === "sms" || ch === "email") setChannel(ch);
    if (subj) setSubject(subj);
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

  function replyToMessage(message: SentMessage) {
    setChannel("sms");
    setCustomerId(message.customerId || "");
    setToName(message.toName || "");
    setToAddress(message.toAddress || "");
    setSubject("");
    setBody("");
    setTemplateId("");
    setError("");
    setNotice(`Replying to ${message.toName || message.toAddress}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
        const status = data.message?.status;
        setNotice(status === "sent" ? "Message sent." : status === "failed" ? "Provider rejected the message. Review the error in message history." : "Message queued. Connect the matching provider in Settings to deliver it.");
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
    <div className="friendly-legacy-page">
      <h1 className="text-2xl font-bold mb-1">Messages</h1>
      <p className="text-sm text-gray-500 mb-6">
        Send email or SMS and review inbound customer texts in one place. Connected providers deliver immediately; otherwise outbound messages remain queued honestly.
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

      <form onSubmit={onSend} className="friendly-admin-card space-y-4">
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
          className="friendly-admin-primary disabled:opacity-50"
        >
          {sending ? "Queuing..." : "Queue message"}
        </button>
      </form>

      <h2 className="text-lg font-semibold mb-3">Message history</h2>
      {history.length === 0 ? (
        <p className="text-sm text-gray-500">No messages yet.</p>
      ) : (
        <div className="friendly-admin-card flush">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Direction</th>
                <th className="px-3 py-2">Contact</th>
                <th className="px-3 py-2">Message</th>
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
                  <td className="px-3 py-2">
                    <span className={"inline-flex rounded px-2 py-0.5 text-[10px] font-bold uppercase " + ((m.direction || "outbound") === "inbound" ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-700")}>
                      {(m.direction || "outbound") === "inbound" ? "Incoming SMS" : `Outgoing ${m.channel}`}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{m.toName}</div>
                    <div className="text-xs text-gray-400">{m.toAddress}</div>
                  </td>
                  <td className="px-3 py-2 max-w-sm">
                    {m.subject && <div className="font-medium">{m.subject}</div>}
                    <div className="text-xs text-gray-600 line-clamp-2">{m.body}</div>
                    {m.providerError && <div className="mt-1 text-[10px] text-red-600">{m.providerError}</div>}
                  </td>
                  <td className="px-3 py-2">
                    <span className={"inline-block rounded px-2 py-0.5 text-xs " + (m.status === "sent" || m.status === "received" ? "bg-green-100 text-green-800" : m.status === "failed" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800")}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {(m.direction || "outbound") === "inbound" && <button onClick={() => replyToMessage(m)} className="mr-3 text-[#1a6fd4] hover:underline text-xs">Reply</button>}
                    <button onClick={() => onDelete(m.id)} className="text-red-600 hover:underline text-xs">Delete</button>
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
