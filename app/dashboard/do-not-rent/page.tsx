"use client";

import { useEffect, useState, FormEvent } from "react";

type Restriction = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  reason: string | null;
  isActive: boolean;
  createdAt: string;
};

export default function DoNotRentManager() {
  const [restrictions, setRestrictions] = useState<Restriction[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    reason: "",
  });
  const [error, setError] = useState("");

  async function loadRestrictions(q = "") {
    setLoading(true);
    const url = q ? `/api/do-not-rent?q=${encodeURIComponent(q)}` : "/api/do-not-rent";
    const res = await fetch(url);
    const data = await res.json();
    setRestrictions(data.restrictions || []);
    setLoading(false);
  }

  useEffect(() => {
    loadRestrictions();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name.trim() && !form.email.trim() && !form.phone.trim() && !form.address.trim()) {
      setError("Provide at least a name, email, phone, or address to restrict");
      return;
    }
    const res = await fetch("/api/do-not-rent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name || null,
        email: form.email || null,
        phone: form.phone || null,
        address: form.address || null,
        reason: form.reason || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to add restriction");
      return;
    }
    setForm({ name: "", email: "", phone: "", address: "", reason: "" });
    await loadRestrictions(query);
  }

  async function toggleActive(restriction: Restriction) {
    await fetch("/api/do-not-rent", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: restriction.id, isActive: !restriction.isActive }),
    });
    await loadRestrictions(query);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this restriction?")) return;
    await fetch("/api/do-not-rent?id=" + id, { method: "DELETE" });
    await loadRestrictions(query);
  }

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    loadRestrictions(query);
  }

  if (loading) {
    return <div className="p-8">Loading restrictions...</div>;
  }

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Do Not Rent</h1>
      <p className="text-gray-500 mb-6">
        Flag customers who should be blocked from booking. Restrictions apply only to your
        business and are checked automatically at checkout and when staff create manual orders.
      </p>

      {error && (
        <div className="mb-4 rounded bg-red-50 text-red-700 border border-red-200 px-4 py-2 text-sm">
          {error}
        </div>
      )}

      <form
        onSubmit={handleCreate}
        className="bg-white shadow rounded-lg p-6 mb-8 grid grid-cols-1 md:grid-cols-3 gap-4 items-end"
      >
        <label className="text-sm text-gray-600">
          Name
          <input
            className="mt-1 border rounded px-3 py-2 w-full"
            placeholder="Jane Doe"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label className="text-sm text-gray-600">
          Email
          <input
            type="email"
            className="mt-1 border rounded px-3 py-2 w-full"
            placeholder="jane@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>
        <label className="text-sm text-gray-600">
          Phone
          <input
            className="mt-1 border rounded px-3 py-2 w-full"
            placeholder="(555) 555-5555"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </label>
        <label className="text-sm text-gray-600 md:col-span-2">
          Address
          <input
            className="mt-1 border rounded px-3 py-2 w-full"
            placeholder="123 Main St"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </label>
        <label className="text-sm text-gray-600">
          Reason
          <input
            className="mt-1 border rounded px-3 py-2 w-full"
            placeholder="Damaged equipment, no-show, etc."
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
          />
        </label>
        <button
          type="submit"
          className="bg-red-600 font-medium text-white px-4 py-2 rounded h-fit md:col-span-3"
        >
          Add Restriction
        </button>
      </form>

      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <input
          className="border rounded px-3 py-2 flex-1"
          placeholder="Search by name, email, phone, or address"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" className="border rounded px-4 py-2 text-sm font-medium text-gray-700">
          Search
        </button>
      </form>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {restrictions.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2 text-sm text-gray-900">{r.name || "—"}</td>
                <td className="px-4 py-2 text-sm text-gray-500">
                  {r.email || ""}
                  {r.email && r.phone ? " / " : ""}
                  {r.phone || ""}
                  {!r.email && !r.phone ? "—" : ""}
                </td>
                <td className="px-4 py-2 text-sm text-gray-500">{r.address || "—"}</td>
                <td className="px-4 py-2 text-sm text-gray-500">{r.reason || "—"}</td>
                <td className="px-4 py-2 text-sm">
                  <button
                    onClick={() => toggleActive(r)}
                    className={r.isActive ? "text-green-700" : "text-gray-400"}
                  >
                    {r.isActive ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="px-4 py-2 text-sm">
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {restrictions.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-400">
                  No restrictions yet. Add one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
