"use client";

import { useEffect, useMemo, useState } from "react";

type CatalogCategory = { key: string; label: string; description: string };
type CatalogTemplate = {
  id: string;
  name: string;
  categoryKey: string;
  type: string;
};

type Selection = {
  quantity: string;
  price: string;
};

const TYPE_LABELS: Record<string, string> = {
  rental: "Rental",
  service: "Service",
  consumable: "Consumable",
  addon: "Add-on",
  package: "Package",
};

export default function CatalogBrowser({
  onClose,
  onAdded,
  priorityCategoryKeys,
}: {
  onClose: () => void;
  onAdded: (result: { created: { id: string; name: string }[]; skipped: { name: string; reason: string }[] }) => void;
  priorityCategoryKeys?: string[];
}) {
  const [step, setStep] = useState<"browse" | "configure">("browse");
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [templates, setTemplates] = useState<CatalogTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selections, setSelections] = useState<Record<string, Selection>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (activeCategory) params.set("categoryKey", activeCategory);
    fetch("/api/catalog-templates?" + params.toString())
      .then((r) => r.json())
      .then((data) => {
        setTemplates(data.templates || []);
        if (categories.length === 0) setCategories(data.categories || []);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, activeCategory]);

  const orderedCategories = useMemo(() => {
    if (!priorityCategoryKeys || priorityCategoryKeys.length === 0) return categories;
    const byKey = new Map(categories.map((c) => [c.key, c]));
    const ordered: CatalogCategory[] = [];
    for (const key of priorityCategoryKeys) {
      const c = byKey.get(key);
      if (c) ordered.push(c);
    }
    for (const c of categories) {
      if (!ordered.includes(c)) ordered.push(c);
    }
    return ordered;
  }, [categories, priorityCategoryKeys]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedTemplates = templates.filter((t) => selectedIds.has(t.id));

  function goToConfigure() {
    const next: Record<string, Selection> = { ...selections };
    for (const t of selectedTemplates) {
      if (!next[t.id]) next[t.id] = { quantity: "", price: "" };
    }
    setSelections(next);
    setStep("configure");
  }

  function updateSelection(id: string, field: "quantity" | "price", value: string) {
    setSelections((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  async function submit() {
    setSubmitting(true);
    setError("");
    const body = {
      selections: selectedTemplates.map((t) => {
        const s = selections[t.id] || { quantity: "", price: "" };
        const quantity = s.quantity.trim() === "" ? undefined : parseInt(s.quantity, 10);
        const price = s.price.trim() === "" ? undefined : parseFloat(s.price);
        return {
          templateId: t.id,
          quantity: quantity !== undefined && !Number.isNaN(quantity) ? quantity : undefined,
          price: price !== undefined && !Number.isNaN(price) ? price : undefined,
        };
      }),
    };
    const res = await fetch("/api/catalog-templates/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSubmitting(false);
    if (res.ok) {
      const data = await res.json();
      onAdded(data);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not add items. Please try again.");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center overflow-y-auto py-8">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">Party Rental CRM Catalog</h2>
            <p className="text-sm text-gray-500">
              {step === "browse"
                ? "Select the equipment your company actually carries. Nothing is added until you confirm quantity and price."
                : "Enter what you own and what you charge. Leave blank to set later - we never guess these for you."}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none" aria-label="Close">
            &times;
          </button>
        </div>

        {step === "browse" && (
          <div className="p-6">
            <div className="flex flex-col md:flex-row gap-3 mb-4">
              <input
                className="border rounded px-3 py-2 flex-1"
                placeholder="Search (e.g. chair, tent, 20x40, linen)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <select
                className="border rounded px-3 py-2"
                value={activeCategory}
                onChange={(e) => setActiveCategory(e.target.value)}
              >
                <option value="">All categories</option>
                {orderedCategories.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {loading ? (
              <p className="text-gray-500 text-sm">Loading catalog...</p>
            ) : templates.length === 0 ? (
              <p className="text-gray-500 text-sm">
                No templates matched. Try a different search, or use "Add Manually" / "Create Custom Item" back on the
                Inventory page - our catalog will never be the only way to add something you rent.
              </p>
            ) : (
              <div className="max-h-96 overflow-y-auto border rounded divide-y">
                {templates.map((t) => (
                  <label key={t.id} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 cursor-pointer">
                    <span className="flex items-center gap-3">
                      <input type="checkbox" checked={selectedIds.has(t.id)} onChange={() => toggleSelect(t.id)} />
                      <span>
                        <span className="block text-sm font-medium text-gray-800">{t.name}</span>
                        <span className="block text-xs text-gray-400">
                          {(categories.find((c) => c.key === t.categoryKey) || {}).label || t.categoryKey} ·{" "}
                          {TYPE_LABELS[t.type] || t.type}
                        </span>
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-gray-500">{selectedIds.size} selected</span>
              <div className="space-x-2">
                <button onClick={onClose} className="text-sm text-gray-500 px-3 py-2">
                  Cancel
                </button>
                <button
                  disabled={selectedIds.size === 0}
                  onClick={goToConfigure}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  Continue ({selectedIds.size})
                </button>
              </div>
            </div>
          </div>
        )}

        {step === "configure" && (
          <div className="p-6">
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <div className="max-h-96 overflow-y-auto border rounded">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Item</th>
                    <th className="py-2 px-3">Quantity you own</th>
                    <th className="py-2 px-3">Your rental price</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {selectedTemplates.map((t) => {
                    const isUnlimited = t.type === "service" || t.type === "consumable";
                    const s = selections[t.id] || { quantity: "", price: "" };
                    return (
                      <tr key={t.id}>
                        <td className="py-2 px-3">{t.name}</td>
                        <td className="py-2 px-3">
                          <input
                            className="border rounded px-2 py-1 w-24"
                            placeholder={isUnlimited ? "n/a" : "0"}
                            value={s.quantity}
                            disabled={isUnlimited}
                            onChange={(e) => updateSelection(t.id, "quantity", e.target.value)}
                          />
                          {isUnlimited && (
                            <span className="block text-xs text-gray-400">Not limited by quantity</span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          <input
                            className="border rounded px-2 py-1 w-28"
                            placeholder="Set later"
                            value={s.price}
                            onChange={(e) => updateSelection(t.id, "price", e.target.value)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              New items are added as hidden from your storefront until you review and publish them from the Inventory
              page.
            </p>
            <div className="flex items-center justify-between mt-4">
              <button onClick={() => setStep("browse")} className="text-sm text-gray-500 px-3 py-2">
                Back
              </button>
              <button
                disabled={submitting}
                onClick={submit}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting ? "Adding..." : "Add " + selectedTemplates.length + " Item(s)"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
