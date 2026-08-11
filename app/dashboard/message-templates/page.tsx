"use client";

import React, { useEffect, useState } from "react";

type Template = {
  id: string;
  name: string;
  channel: string;
  subject: string | null;
  body: string;
  category: string;
  isActive: boolean;
  createdAt: string;
};

const emptyForm = {
  id: "",
  name: "",
  channel: "email",
  subject: "",
  body: "",
  category: "general",
  isActive: true,
};

export default function MessageTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/message-templates");
      if (!res.ok) throw new Error("Failed to load templates");
      setTemplates(await res.json());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load templates");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function edit(t: Template) {
    setForm({
      id: t.id,
      name: t.name,
      channel: t.channel,
      subject: t.subject || "",
      body: t.body,
      category: t.category,
      isActive: t.isActive,
    });
  }

  function resetForm() {
    setForm({ ...emptyForm });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const method = form.id ? "PATCH" : "POST";
      const res = await fetch("/api/message-templates", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      resetForm();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function remove(t: Template) {
    if (!confirm("Delete template \"" + t.name + "\"?")) return;
    setError("");
    try {
      const res = await fetch("/api/message-templates?id=" + encodeURIComponent(t.id), {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      if (form.id === t.id) resetForm();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  const ce = React.createElement;

  const field = (label: string, input: React.ReactNode) =>
    ce("label", { className: "block" },
      ce("span", { className: "text-xs font-medium text-gray-600" }, label),
      input
    );

  const inputCls =
    "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none";

  return ce(
    "div",
    { className: "max-w-4xl mx-auto px-4 py-6" },
    ce(
      "div",
      { className: "mb-6" },
      ce("h1", { className: "text-2xl font-semibold text-gray-900" }, "Message Templates"),
      ce(
        "p",
        { className: "text-sm text-gray-500 mt-1" },
        "Reusable email and text templates for booking confirmations, reminders, and follow-ups."
      )
    ),
    error &&
      ce(
        "div",
        {
          className:
            "mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700",
        },
        error
      ),
    ce(
      "form",
      {
        onSubmit: save,
        className: "mb-8 rounded-lg border border-gray-200 bg-white p-4 space-y-3",
      },
      ce(
        "div",
        { className: "grid grid-cols-1 sm:grid-cols-2 gap-3" },
        field(
          "Name",
          ce("input", {
            className: inputCls,
            value: form.name,
            onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
              setForm({ ...form, name: e.target.value }),
            placeholder: "Booking Confirmation",
          })
        ),
        field(
          "Channel",
          ce(
            "select",
            {
              className: inputCls,
              value: form.channel,
              onChange: (e: React.ChangeEvent<HTMLSelectElement>) =>
                setForm({ ...form, channel: e.target.value }),
            },
            ce("option", { value: "email" }, "Email"),
            ce("option", { value: "sms" }, "SMS / Text")
          )
        ),
        field(
          "Category",
          ce(
            "select",
            {
              className: inputCls,
              value: form.category,
              onChange: (e: React.ChangeEvent<HTMLSelectElement>) =>
                setForm({ ...form, category: e.target.value }),
            },
            ce("option", { value: "general" }, "General"),
            ce("option", { value: "confirmation" }, "Booking Confirmation"),
            ce("option", { value: "reminder" }, "Reminder"),
            ce("option", { value: "followup" }, "Follow-up"),
            ce("option", { value: "receipt" }, "Receipt")
          )
        ),
        field(
          "Subject (email only)",
          ce("input", {
            className: inputCls,
            value: form.subject,
            onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
              setForm({ ...form, subject: e.target.value }),
            placeholder: "Your booking is confirmed!",
          })
        )
      ),
      field(
        "Body",
        ce("textarea", {
          className: inputCls + " min-h-[120px]",
          value: form.body,
          onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setForm({ ...form, body: e.target.value }),
          placeholder:
            "Hi {{customer_name}}, your order {{order_id}} is confirmed for {{event_date}}.",
        })
      ),
      ce(
        "p",
        { className: "text-xs text-gray-400" },
        "Placeholders: {{customer_name}}, {{order_id}}, {{event_date}}, {{business_name}}"
      ),
      ce(
        "label",
        { className: "flex items-center gap-2 text-sm text-gray-600" },
        ce("input", {
          type: "checkbox",
          checked: form.isActive,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
            setForm({ ...form, isActive: e.target.checked }),
        }),
        "Active"
      ),
      ce(
        "div",
        { className: "flex items-center gap-2" },
        ce(
          "button",
          {
            type: "submit",
            disabled: saving,
            className:
              "rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50",
          },
          saving ? "Saving..." : form.id ? "Update template" : "Create template"
        ),
        form.id &&
          ce(
            "button",
            {
              type: "button",
              onClick: resetForm,
              className:
                "rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700",
            },
            "Cancel"
          )
      )
    ),
    loading
      ? ce("p", { className: "text-sm text-gray-500" }, "Loading...")
      : templates.length === 0
      ? ce(
          "div",
          {
            className:
              "rounded-md border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500",
          },
          "No templates yet. Create your first one above."
        )
      : ce(
          "div",
          { className: "divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white" },
          templates.map((t) =>
            ce(
              "div",
              { key: t.id, className: "flex items-start justify-between px-4 py-3" },
              ce(
                "div",
                null,
                ce(
                  "div",
                  { className: "text-sm font-medium text-gray-900" },
                  t.name,
                  !t.isActive &&
                    ce(
                      "span",
                      { className: "ml-2 text-xs text-gray-400" },
                      "(inactive)"
                    )
                ),
                ce(
                  "div",
                  { className: "text-xs text-gray-500 mt-0.5" },
                  t.channel + " - " + t.category
                ),
                t.subject &&
                  ce(
                    "div",
                    { className: "text-xs text-gray-400 mt-0.5" },
                    "Subject: " + t.subject
                  )
              ),
              ce(
                "div",
                { className: "flex items-center gap-3 ml-4" },
                ce(
                  "button",
                  {
                    onClick: () => edit(t),
                    className: "text-xs text-gray-600 hover:text-gray-900",
                  },
                  "Edit"
                ),
                ce(
                  "button",
                  {
                    onClick: () => remove(t),
                    className: "text-xs text-red-600 hover:text-red-800",
                  },
                  "Delete"
                )
              )
            )
          )
        )
  );
}
