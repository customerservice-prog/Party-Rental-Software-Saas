"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function AdminOrganizationDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [organization, setOrganization] = useState<any>(null);
  const [status, setStatus] = useState("active");
  const [planTier, setPlanTier] = useState("launch");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/admin/organizations/${id}`);
      if (res.ok) {
        const data = await res.json();
        setOrganization(data.organization);
        setStatus(data.organization.status);
        setPlanTier(data.organization.planTier);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const res = await fetch(`/api/admin/organizations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, planTier }),
    });

    setSaving(false);

    if (!res.ok) {
      setMessage("Something went wrong saving changes.");
      return;
    }

    const data = await res.json();
    setOrganization(data.organization);
    setMessage("Changes saved.");
  }

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!organization) {
    return <div className="p-8">Organization not found.</div>;
  }

  return (
    <div className="p-8 max-w-2xl">
      <Link href="/admin" className="text-brand-600 hover:underline text-sm">
        &larr; Back to all organizations
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mt-4 mb-6">
        {organization.name}
      </h1>

      <div className="bg-white shadow rounded-lg p-6 mb-6 space-y-2 text-sm">
        <div><span className="font-medium">Subdomain:</span> {organization.slug}</div>
        <div><span className="font-medium">Contact Email:</span> {organization.contactEmail || "-"}</div>
        <div><span className="font-medium">Users:</span> {organization._count.users}</div>
        <div><span className="font-medium">Customers:</span> {organization._count.customers}</div>
        <div><span className="font-medium">Orders:</span> {organization._count.orders}</div>
        <div><span className="font-medium">Joined:</span> {new Date(organization.createdAt).toLocaleDateString()}</div>
      </div>

      {message && (
        <div className="bg-blue-50 text-blue-700 p-3 rounded mb-4 text-sm">
          {message}
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white shadow rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select
            className="w-full border rounded p-2"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Suspending blocks this tenant storefront, login, and checkout.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Plan Tier</label>
          <input
            className="w-full border rounded p-2"
            value={planTier}
            onChange={(e) => setPlanTier(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-brand-600 text-white rounded p-2 px-4 font-medium disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
