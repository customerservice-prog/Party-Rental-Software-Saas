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
  imageUrl: string | null;
  suggestedPrice: number | null;
  keywords: unknown;
  sortOrder: number;
  isActive: boolean;
};

const emptyForm = {
  name: "",
  categoryKey: CATALOG_CATEGORIES[0]?.key || "",
  type: "rental",
  description: "",
  imageUrl: "",
  suggestedPrice: "",
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
        imageUrl: addForm.imageUrl || null,
        suggestedPrice: addForm.suggestedPrice === "" ? null : Number(addForm.suggestedPrice),
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
      imageUrl: t.imageUrl || "",
      suggestedPrice: t.suggestedPrice == null ? "" : String(t.suggestedPrice),
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
        imageUrl: editForm.imageUrl || null,
        suggestedPrice: editForm.suggestedPrice === "" ? null : Number(editForm.suggestedPrice),
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
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[.2em] text-blue-600">Platform Catalog</div>
          <h1 className="mt-1 text-3xl font-black tracking-[-.035em] text-slate-950">Global rental templates</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Maintain the reusable inventory templates that every tenant can choose from during setup and inventory creation.</p>
        </div>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className={showAddForm ? "rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 shadow-sm" : "rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white shadow-sm"}
        >
          {showAddForm ? "Cancel" : "+ Add template"}
        </button>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-800">
        <b>Global platform data.</b> Editing these templates does not modify tenant inventory already copied into a rental company account.
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>}

      {showAddForm && (
        <form onSubmit={submitAdd} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,.04)] space-y-4">
          <h2 className="text-sm font-black text-slate-950">New Template</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">Name</label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">Category</label>
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
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
              <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">Type</label>
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
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
              <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">Sort Order</label>
              <input
                type="number"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                value={addForm.sortOrder}
                onChange={(e) => setAddForm({ ...addForm, sortOrder: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">Description (optional)</label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                value={addForm.description}
                onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
              />
            </div>
            <div className="col-span-2 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">Image URL</label>
                <input className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50" value={addForm.imageUrl} onChange={(e)=>setAddForm({...addForm,imageUrl:e.target.value})} placeholder="https://…"/>
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">Suggested rental price</label>
                <input type="number" min="0" step="0.01" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50" value={addForm.suggestedPrice} onChange={(e)=>setAddForm({...addForm,suggestedPrice:e.target.value})} placeholder="Optional"/>
              </div>
            </div>
            <div className="col-span-2">
              <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">Search Keywords (comma separated, optional)</label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                placeholder="e.g. jumper, moonwalk, bouncy castle"
                value={addForm.keywords}
                onChange={(e) => setAddForm({ ...addForm, keywords: e.target.value })}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : "Create Template"}
          </button>
        </form>
      )}

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,.04)] sm:grid-cols-[minmax(220px,1fr)_220px_auto]">
        <input
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
          placeholder="Search name, category, or keywords"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400"
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
        <label className="flex items-center gap-2 whitespace-nowrap rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          Show inactive
        </label>
      </div>

      {loading ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400">Loading...</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,.04)]">
          <table className="min-w-[1050px] w-full">
            <thead className="bg-slate-50/80">
              <tr>
                <th className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-[.14em] text-slate-400">Name</th>
                <th className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-[.14em] text-slate-400">Category</th>
                <th className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-[.14em] text-slate-400">Type</th>
                <th className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-[.14em] text-slate-400">Keywords</th>
                <th className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-[.14em] text-slate-400">Status</th>
                <th className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-[.14em] text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
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
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          placeholder="Name"
                          required
                        />
                        <select
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400"
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
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400"
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
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400"
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
                          value={editForm.imageUrl}
                          onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })}
                          placeholder="Image URL"
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="border rounded p-2 text-sm"
                          value={editForm.suggestedPrice}
                          onChange={(e) => setEditForm({ ...editForm, suggestedPrice: e.target.value })}
                          placeholder="Suggested rental price"
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
                            className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50"
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
                  <tr key={t.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900"><div className="flex items-center gap-3">{t.imageUrl?<img src={t.imageUrl} alt="" className="h-9 w-9 rounded-lg object-cover"/>:<div className="h-9 w-9 rounded-lg bg-slate-100"/>}<div><div className="font-black">{t.name}</div>{t.suggestedPrice!=null&&<div className="text-[10px] text-slate-400">Suggested ${t.suggestedPrice.toFixed(2)}</div>}</div></div></td>
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
                      <button onClick={() => startEdit(t)} className="font-bold text-blue-600 hover:text-blue-700">
                        Edit
                      </button>
                      <button onClick={() => toggleActive(t)} className="font-bold text-slate-500 hover:text-slate-700">
                        {t.isActive ? "Deactivate" : "Reactivate"}
                      </button>
                      <button onClick={() => deleteTemplate(t)} className="font-bold text-rose-600 hover:text-rose-700">
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
