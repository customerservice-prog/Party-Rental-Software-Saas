"use client";

import { useEffect, useMemo, useState } from "react";
import { CATALOG_CATEGORIES, CATALOG_TEMPLATE_TYPES } from "@/lib/catalogTemplates";

type Template = {
  id: string;
  slug: string;
  name: string;
  categoryKey: string;
  type: string;
  description: string | null;
  keywords: unknown;
  sortOrder: number;
  isActive: boolean;
};

const emptyForm = {
  name: "",
  categoryKey: CATALOG_CATEGORIES[0]?.key || "",
  type: "rental",
  description: "",
  keywords: "",
  sortOrder: "0",
};

function keywordsToText(k: unknown): string {
  if (!Array.isArray(k)) return "";
  return k.map((v) => String(v)).join(", ");
}

// Platform Admin > Catalog Templates. Manages individual rows of the
// global "Party Rental CRM Catalog" (see CatalogTemplate in
// prisma/schema.prisma) one at a time, as an alternative to hand-editing
// lib/catalogTemplateSeedData.ts and redeploying for every small fix.
// Gated by app/admin/layout.tsx's requirePlatformAdmin() - this page never
// shows or touches any tenant's own organizationId-scoped data.
export default function CatalogTemplatesAdminPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showInactive, setShowInactive] = useState(true);

  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);

  async function load() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/catalog-templates");
    if (!res.ok) {
      setError(
        res.status === 403
          ? "This page requires a platform_admin account. Your current login does not have that role."
          : "Could not load catalog templates."
      );
      setTemplates([]);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setTemplates(data.templates || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return templates.filter((t) => {
      if (!showInactive && !t.isActive) return false;
      if (categoryFilter && t.categoryKey !== categoryFilter) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const haystack = (t.name + " " + t.categoryKey + " " + keywordsToText(t.keywords)).toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [templates, query, categoryFilter, showInactive]);

  function categoryLabel(key: string) {
    return CATALOG_CATEGORIES.find((c) => c.key === key)?.label || key;
  }

  async function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/catalog-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: addForm.name,
        categoryKey: addForm.categoryKey,
        type: addForm.type,
        description: addForm.description || null,
        keywords: addForm.keywords
          ? addForm.keywords.split(",").map((k) => k.trim()).filter(Boolean)
          : [],
        sortOrder: parseInt(addForm.sortOrder, 10) || 0,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not create template.");
      return;
    }
    setAddForm(emptyForm);
    setShowAddForm(false);
    load();
  }

  function startEdit(t: Template) {
    setEditingId(t.id);
    setEditForm({
      name: t.name,
      categoryKey: t.categoryKey,
      type: t.type,
      description: t.description || "",
      keywords: keywordsToText(t.keywords),
      sortOrder: String(t.sortOrder),
    });
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/catalog-templates/" + editingId, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editForm.name,
        categoryKey: editForm.categoryKey,
        type: editForm.type,
        description: editForm.description || null,
        keywords: editForm.keywords
          ? editForm.keywords.split(",").map((k) => k.trim()).filter(Boolean)
          : [],
        sortOrder: parseInt(editForm.sortOrder, 10) || 0,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not save changes.");
      return;
    }
    setEditingId(null);
    load();
  }

  async function toggleActive(t: Template) {
    setError("");
    const res = await fetch("/api/admin/catalog-templates/" + t.id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !t.isActive }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not update template.");
      return;
    }
    load();
  }

  async function deleteTemplate(t: Template) {
    if (!confirm('Delete "' + t.name + '" permanently? This only works if no tenant has ever added it.')) return;
    setError("");
    const res = await fetch("/api/admin/catalog-templates/" + t.id, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not delete template.");
      return;
    }
    load();
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Catalog Templates ({templates.length})
        </h1>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="bg-brand-600 text-white rounded px-4 py-2 text-sm font-medium"
        >
          {showAddForm ? "Cancel" : "Add Template"}
        </button>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        These are global platform templates only - adding, editing, or deactivating one here never
        creates, changes, or deletes anything in any tenant's own inventory. Tenants copy a template
        into their own Item only when they explicitly add it from their Inventory or onboarding page.
      </p>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}

      {showAddForm && (
        <form onSubmit={submitAdd} className="bg-white shadow rounded-lg p-6 mb-6 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">New Template</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                className="w-full border rounded p-2 text-sm"
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                className="w-full border rounded p-2 text-sm"
                value={addForm.categoryKey}
                onChange={(e) => setAddForm({ ...addForm, categoryKey: e.target.value })}
              >
                {CATALOG_CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                className="w-full border rounded p-2 text-sm"
                value={addForm.type}
                onChange={(e) => setAddForm({ ...addForm, type: e.target.value })}
              >
                {CATALOG_TEMPLATE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Sort Order</label>
              <input
                type="number"
                className="w-full border rounded p-2 text-sm"
                value={addForm.sortOrder}
                onChange={(e) => setAddForm({ ...addForm, sortOrder: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Description (optional)</label>
              <input
                className="w-full border rounded p-2 text-sm"
                value={addForm.description}
                onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Search Keywords (comma separated, optional)</label>
              <input
                className="w-full border rounded p-2 text-sm"
                placeholder="e.g. jumper, moonwalk, bouncy castle"
                value={addForm.keywords}
                onChange={(e) => setAddForm({ ...addForm, keywords: e.target.value })}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="bg-brand-600 text-white rounded px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Saving..." : "Create Template"}
          </button>
        </form>
      )}

      <div className="flex gap-3 mb-4">
        <input
          className="border rounded p-2 text-sm flex-1"
          placeholder="Search name, category, or keywords"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="border rounded p-2 text-sm"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">All categories</option>
          {CATALOG_CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600 whitespace-nowrap">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          Show inactive
        </label>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Keywords</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No templates match this search.
                  </td>
                </tr>
              )}
              {filtered.map((t) =>
                editingId === t.id ? (
                  <tr key={t.id}>
                    <td colSpan={6} className="px-4 py-4 bg-gray-50">
                      <form onSubmit={submitEdit} className="grid grid-cols-2 gap-3">
                        <input
                          className="border rounded p-2 text-sm"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          placeholder="Name"
                          required
                        />
                        <select
                          className="border rounded p-2 text-sm"
                          value={editForm.categoryKey}
                          onChange={(e) => setEditForm({ ...editForm, categoryKey: e.target.value })}
                        >
                          {CATALOG_CATEGORIES.map((c) => (
                            <option key={c.key} value={c.key}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                        <select
                          className="border rounded p-2 text-sm"
                          value={editForm.type}
                          onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                        >
                          {CATALOG_TEMPLATE_TYPES.map((ty) => (
                            <option key={ty} value={ty}>
                              {ty}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          className="border rounded p-2 text-sm"
                          value={editForm.sortOrder}
                          onChange={(e) => setEditForm({ ...editForm, sortOrder: e.target.value })}
                          placeholder="Sort order"
                        />
                        <input
                          className="border rounded p-2 text-sm col-span-2"
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          placeholder="Description (optional)"
                        />
                        <input
                          className="border rounded p-2 text-sm col-span-2"
                          value={editForm.keywords}
                          onChange={(e) => setEditForm({ ...editForm, keywords: e.target.value })}
                          placeholder="Search keywords, comma separated"
                        />
                        <div className="col-span-2 flex gap-2">
                          <button
                            type="submit"
                            disabled={saving}
                            className="bg-brand-600 text-white rounded px-4 py-2 text-sm font-medium disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="text-sm text-gray-500 px-3 py-2"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </td>
                  </tr>
                ) : (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{t.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{categoryLabel(t.categoryKey)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{t.type}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{keywordsToText(t.keywords) || "-"}</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={
                          "inline-block px-2 py-0.5 rounded-full text-xs font-medium " +
                          (t.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700")
                        }
                      >
                        {t.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm space-x-3 whitespace-nowrap">
                      <button onClick={() => startEdit(t)} className="text-brand-600 hover:underline">
                        Edit
                      </button>
                      <button onClick={() => toggleActive(t)} className="text-gray-600 hover:underline">
                        {t.isActive ? "Deactivate" : "Reactivate"}
                      </button>
                      <button onClick={() => deleteTemplate(t)} className="text-red-600 hover:underline">
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
