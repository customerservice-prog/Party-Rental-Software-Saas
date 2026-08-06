"use client";

import React, { useEffect, useState } from "react";

type Driver = {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    pin: string | null;
    isActive: boolean;
    createdAt: string;
};

export default function DriversPage() {
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: "", phone: "", email: "", pin: "" });
    const [saving, setSaving] = useState(false);

  async function load() {
        setLoading(true);
        setError("");
        const res = await fetch("/api/drivers");
        const data = await res.json();
        if (!res.ok) {
                setError(data.error || "Failed to load drivers.");
                setDrivers([]);
        } else {
                setDrivers(data.drivers);
        }
        setLoading(false);
  }

  useEffect(() => {
        load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setError("");
        const res = await fetch("/api/drivers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
        });
        const data = await res.json();
        setSaving(false);
        if (!res.ok) {
                setError(data.error || "Failed to add driver.");
                return;
        }
        setForm({ name: "", phone: "", email: "", pin: "" });
        setShowForm(false);
        load();
  }

  async function handleToggleActive(driver: Driver) {
        setError("");
        const res = await fetch("/api/drivers/" + driver.id, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !driver.isActive }),
        });
        const data = await res.json();
        if (!res.ok) {
                setError(data.error || "Failed to update driver.");
                return;
        }
        load();
  }

  async function handleDelete(id: string) {
        if (!window.confirm("Remove this driver? This can't be undone.")) {
                return;
        }
        setError("");
        const res = await fetch("/api/drivers/" + id, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) {
                setError(data.error || "Failed to remove driver.");
                return;
        }
        load();
  }


  const e = React.createElement;

  const driverRow = (d: Driver) =>
        e(
                "div",
          { key: d.id, className: "flex items-center justify-between px-4 py-3" },
                e(
                          "div",
                          null,
                          e(
                                      "p",
                            { className: "text-sm font-medium text-gray-900" },
                                      d.name + " ",
                                      e(
                                                    "span",
                                        {
                                                        className:
                                                                          "ml-2 rounded-full px-2 py-0.5 text-xs " +
                                                                          (d.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"),
                                        },
                                                    d.isActive ? "Active" : "Inactive"
                                                  )
                                    ),
                          e(
                                      "p",
                            { className: "text-xs text-gray-500 mt-0.5" },
                                      (d.phone || "No phone") + " . " + (d.email || "No email") + " . PIN: " + (d.pin || "None")
                                    )
                        ),
                e(
                          "div",
                  { className: "flex items-center gap-3" },
                          e(
                                      "button",
                            { onClick: () => handleToggleActive(d), className: "text-sm text-indigo-600 hover:underline" },
                                      d.isActive ? "Deactivate" : "Reactivate"
                                    ),
                          e(
                                      "button",
                            { onClick: () => handleDelete(d.id), className: "text-sm text-red-600 hover:underline" },
                                      "Remove"
                                    )
                        )
              );

  const formFields = e(
        "div",
    { className: "grid grid-cols-2 gap-3" },
        e(
                "div",
                null,
                e("label", { className: "block text-xs font-medium text-gray-600 mb-1" }, "Name"),
                e("input", {
                          required: true,
                          value: form.name,
                          onChange: (ev: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, name: ev.target.value }),
                          className: "w-full rounded-md border px-3 py-2 text-sm",
                })
              ),
        e(
                "div",
                null,
                e("label", { className: "block text-xs font-medium text-gray-600 mb-1" }, "Phone"),
                e("input", {
                          value: form.phone,
                          onChange: (ev: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, phone: ev.target.value }),
                          className: "w-full rounded-md border px-3 py-2 text-sm",
                })
              ),
        e(
                "div",
                null,
                e("label", { className: "block text-xs font-medium text-gray-600 mb-1" }, "Email"),
                e("input", {
                          type: "email",
                          value: form.email,
                          onChange: (ev: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, email: ev.target.value }),
                          className: "w-full rounded-md border px-3 py-2 text-sm",
                })
              ),
        e(
                "div",
                null,
                e(
                          "label",
                  { className: "block text-xs font-medium text-gray-600 mb-1" },
                          "PIN (optional, 4-6 digits)"
                        ),
                e("input", {
                          value: form.pin,
                          onChange: (ev: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, pin: ev.target.value }),
                          placeholder: "Auto-generated if blank",
                          className: "w-full rounded-md border px-3 py-2 text-sm",
                })
              )
      );


  return e(
        "div",
    { className: "max-w-3xl" },
        e(
                "div",
          { className: "flex items-center justify-between mb-6" },
                e(
                          "div",
                          null,
                          e("h1", { className: "text-2xl font-bold text-gray-900" }, "Drivers"),
                          e(
                                      "p",
                            { className: "text-sm text-gray-500 mt-1" },
                                      "Manage the drivers who can be assigned to deliveries and pickups."
                                    )
                        ),
                e(
                          "button",
                  {
                              onClick: () => setShowForm(!showForm),
                              className: "rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700",
                  },
                          showForm ? "Cancel" : "Add Driver"
                        )
              ),
        error
          ? e("div", { className: "mb-4 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700" }, error)
          : null,
        showForm
          ? e(
                      "form",
            { onSubmit: handleCreate, className: "mb-6 rounded-lg border bg-white p-4 space-y-3" },
                      formFields,
                      e(
                                    "button",
                        {
                                        type: "submit",
                                        disabled: saving,
                                        className:
                                                          "rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50",
                        },
                                    saving ? "Adding..." : "Add Driver"
                                  )
                    )
          : null,
        loading
          ? e("p", { className: "text-sm text-gray-500" }, "Loading...")
          : e(
                      "div",
            { className: "rounded-lg border bg-white divide-y" },
                      drivers.length === 0 ? e("p", { className: "p-4 text-sm text-gray-500" }, "No drivers yet.") : null,
                      drivers.map(driverRow)
                    )
      );
}
