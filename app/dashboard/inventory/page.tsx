"use client";

import { useEffect, useState, FormEvent } from "react";

function readImageFile(file: File | undefined | null, onLoaded: (dataUrl: string) => void) {
  if (!file) return;
  if (file.size > 3 * 1024 * 1024) {
    alert("Please choose an image smaller than 3MB.");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => onLoaded(reader.result as string);
  reader.readAsDataURL(file);
}

type Item = {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  cost: number;
  quantity: number;
  picture: string | null;
  displayToCustomer: boolean;
};

type Category = {
  id: string;
  name: string;
  description: string | null;
  picture: string | null;
  displayToCustomer: boolean;
};

type Addon = {
  id: string;
  itemId: string;
  name: string;
  price: number;
  isRequired: boolean;
};

type ItemFormState = {
  name: string;
  description: string;
  cost: string;
  quantity: string;
  picture: string;
  displayToCustomer: boolean;
};

type AddonFormState = {
  name: string;
  price: string;
  isRequired: boolean;
};

const emptyItemForm: ItemFormState = {
  name: "",
  description: "",
  cost: "",
  quantity: "1",
  picture: "",
  displayToCustomer: true,
};

const emptyAddonForm: AddonFormState = { name: "", price: "", isRequired: false };

export default function InventoryPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [newCategory, setNewCategory] = useState({ name: "", description: "", picture: "" });
  const [itemForms, setItemForms] = useState<Record<string, ItemFormState>>({});
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ItemFormState | null>(null);

  const [expandedAddonItemId, setExpandedAddonItemId] = useState<string | null>(null);
  const [addonForms, setAddonForms] = useState<Record<string, AddonFormState>>({});

  async function load() {
    setLoading(true);
    const [catRes, itemRes, addonRes] = await Promise.all([
      fetch("/api/categories"),
      fetch("/api/items"),
      fetch("/api/addons"),
    ]);
    if (catRes.ok) {
      const data = await catRes.json();
      setCategories(data.categories);
    }
    if (itemRes.ok) {
      const data = await itemRes.json();
      setItems(data.items);
    }
    if (addonRes.ok) {
      const data = await addonRes.json();
      setAddons(data.addons);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function itemFormFor(categoryId: string): ItemFormState {
    return itemForms[categoryId] || emptyItemForm;
  }

  function setItemFormFor(categoryId: string, next: ItemFormState) {
    setItemForms((prev) => ({ ...prev, [categoryId]: next }));
  }

  function addonFormFor(itemId: string): AddonFormState {
    return addonForms[itemId] || emptyAddonForm;
  }

  function setAddonFormFor(itemId: string, next: AddonFormState) {
    setAddonForms((prev) => ({ ...prev, [itemId]: next }));
  }

  async function addCategory(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!newCategory.name.trim()) return;
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newCategory),
    });
    if (res.ok) {
      setNewCategory({ name: "", description: "", picture: "" });
      setMessage("Category added.");
      load();
    } else {
      setMessage("Could not add category.");
    }
  }

  async function deleteCategory(id: string) {
    if (!confirm("Delete this category? It must have no items in it.")) return;
    const res = await fetch("/api/categories?id=" + id, { method: "DELETE" });
    if (res.ok) {
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      setMessage(data.error || "Could not delete category.");
    }
  }

  async function addItem(categoryId: string, e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = itemFormFor(categoryId);
    const cost = parseFloat(form.cost);
    if (!form.name.trim() || !form.cost || Number.isNaN(cost)) return;
    const res = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId,
        name: form.name,
        description: form.description,
        cost,
        quantity: parseInt(form.quantity || "1", 10),
        picture: form.picture,
        displayToCustomer: form.displayToCustomer,
      }),
    });
    if (res.ok) {
      setItemFormFor(categoryId, emptyItemForm);
      setMessage("Item added.");
      load();
    } else {
      setMessage("Could not add item.");
    }
  }

  async function deleteItem(id: string) {
    if (!confirm("Delete this item?")) return;
    const res = await fetch("/api/items?id=" + id, { method: "DELETE" });
    if (res.ok) {
      load();
    } else {
      setMessage("Could not delete item.");
    }
  }

  function startEdit(item: Item) {
    setEditingItemId(item.id);
    setEditForm({
      name: item.name,
      description: item.description || "",
      cost: String(item.cost),
      quantity: String(item.quantity),
      picture: item.picture || "",
      displayToCustomer: item.displayToCustomer,
    });
  }

  async function saveEdit(id: string) {
    if (!editForm) return;
    const cost = parseFloat(editForm.cost);
    const res = await fetch("/api/items", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        name: editForm.name,
        description: editForm.description,
        cost: Number.isNaN(cost) ? undefined : cost,
        quantity: parseInt(editForm.quantity || "1", 10),
        picture: editForm.picture,
        displayToCustomer: editForm.displayToCustomer,
      }),
    });
    if (res.ok) {
      setEditingItemId(null);
      setEditForm(null);
      setMessage("Item updated.");
      load();
    } else {
      setMessage("Could not update item.");
    }
  }

  async function toggleVisible(item: Item) {
    await fetch("/api/items", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, displayToCustomer: !item.displayToCustomer }),
    });
    load();
  }

  async function addAddon(itemId: string, e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = addonFormFor(itemId);
    const price = parseFloat(form.price);
    if (!form.name.trim() || Number.isNaN(price)) return;
    const res = await fetch("/api/addons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, name: form.name, price, isRequired: form.isRequired }),
    });
    if (res.ok) {
      setAddonFormFor(itemId, emptyAddonForm);
      setMessage("Add-on added.");
      load();
    } else {
      setMessage("Could not add add-on.");
    }
  }

  async function deleteAddon(id: string) {
    if (!confirm("Delete this add-on?")) return;
    const res = await fetch("/api/addons?id=" + id, { method: "DELETE" });
    if (res.ok) {
      load();
    } else {
      setMessage("Could not delete add-on.");
    }
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">Inventory</h1>
        <a
          href="/api/items/export"
          className="bg-white text-gray-700 border border-gray-300 rounded px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Export CSV
        </a>
      </div>
      {message && <p className="text-sm text-purple-700">{message}</p>}

      <div className="bg-white border rounded p-4">
        <h2 className="font-semibold text-lg mb-3">Add Category</h2>
        <form onSubmit={addCategory} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            className="border rounded px-3 py-2"
            placeholder="Category name"
            value={newCategory.name}
            onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="Description (optional)"
            value={newCategory.description}
            onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="Picture URL (optional)"
            value={newCategory.picture}
            onChange={(e) => setNewCategory({ ...newCategory, picture: e.target.value })}
          />
          <input
            type="file"
            accept="image/*"
            className="text-xs"
            onChange={(e) => readImageFile(e.target.files && e.target.files[0], (dataUrl) => setNewCategory({ ...newCategory, picture: dataUrl }))}
          />
          <button className="bg-purple-600 text-white rounded px-4 py-2" type="submit">
            Add Category
          </button>
        </form>
      </div>

      {categories.length === 0 && (
        <p className="text-gray-500">No categories yet. Add your first rental category above.</p>
      )}

      <div className="space-y-6">
        {categories.map((category) => {
          const categoryItems = items.filter((i) => i.categoryId === category.id);
          const form = itemFormFor(category.id);
          return (
            <div key={category.id} className="border rounded p-4 bg-white">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-lg">{category.name}</h2>
                <button
                  onClick={() => deleteCategory(category.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Delete Category
                </button>
              </div>

              <table className="w-full text-sm text-left mb-4">
                <thead>
                  <tr className="text-gray-500 border-b">
                    <th className="py-1">Photo</th>
                    <th className="py-1">Item</th>
                    <th className="py-1">Price</th>
                    <th className="py-1">Quantity</th>
                    <th className="py-1">Visible</th>
                    <th className="py-1">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryItems.map((item) => {
                    const itemAddons = addons.filter((a) => a.itemId === item.id);
                    const addonForm = addonFormFor(item.id);
                    return editingItemId === item.id && editForm ? (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="py-2" colSpan={6}>
                          <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
                            <input
                              className="border rounded px-2 py-1"
                              value={editForm.name}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                              placeholder="Name"
                            />
                            <input
                              className="border rounded px-2 py-1"
                              value={editForm.description}
                              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                              placeholder="Description"
                            />
                            <input
                              className="border rounded px-2 py-1"
                              value={editForm.cost}
                              onChange={(e) => setEditForm({ ...editForm, cost: e.target.value })}
                              placeholder="Cost"
                            />
                            <input
                              className="border rounded px-2 py-1"
                              value={editForm.quantity}
                              onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                              placeholder="Qty"
                            />
                            <input
                              className="border rounded px-2 py-1"
                              value={editForm.picture}
                              onChange={(e) => setEditForm({ ...editForm, picture: e.target.value })}
                              placeholder="Picture URL"
                            />
                            <input
                              type="file"
                              accept="image/*"
                              className="text-xs"
                              onChange={(e) => readImageFile(e.target.files && e.target.files[0], (dataUrl) => setEditForm({ ...editForm, picture: dataUrl }))}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => saveEdit(item.id)}
                                className="bg-purple-600 text-white rounded px-3 py-1 text-sm"
                                type="button"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditingItemId(null);
                                  setEditForm(null);
                                }}
                                className="text-sm text-gray-500"
                                type="button"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <>
                        <tr key={item.id} className="border-b last:border-0">
                          <td className="py-1">
                            {item.picture ? (
                              <img src={item.picture} alt={item.name} className="h-10 w-10 object-cover rounded" />
                            ) : (
                              <span className="text-gray-400 text-xs">No image</span>
                            )}
                          </td>
                          <td className="py-1">{item.name}</td>
                          <td className="py-1">${item.cost.toFixed(2)}</td>
                          <td className="py-1">{item.quantity}</td>
                          <td className="py-1">
                            <input
                              type="checkbox"
                              checked={item.displayToCustomer}
                              onChange={() => toggleVisible(item)}
                            />
                          </td>
                          <td className="py-1 space-x-2">
                            <button onClick={() => startEdit(item)} className="text-purple-700 hover:underline">
                              Edit
                            </button>
                            <button onClick={() => deleteItem(item.id)} className="text-red-600 hover:underline">
                              Delete
                            </button>
                            <button
                              onClick={() =>
                                setExpandedAddonItemId(expandedAddonItemId === item.id ? null : item.id)
                              }
                              className="text-indigo-700 hover:underline"
                            >
                              Add-ons ({itemAddons.length})
                            </button>
                          </td>
                        </tr>
                        {expandedAddonItemId === item.id && (
                          <tr key={item.id + "-addons"} className="border-b last:border-0 bg-indigo-50">
                            <td colSpan={6} className="py-3 px-2">
                              <div className="text-xs font-semibold text-gray-600 mb-2">
                                Add-ons for {item.name}
                              </div>
                              {itemAddons.length === 0 && (
                                <p className="text-xs text-gray-400 mb-2">No add-ons yet.</p>
                              )}
                              <ul className="space-y-1 mb-3">
                                {itemAddons.map((addon) => (
                                  <li key={addon.id} className="flex items-center justify-between text-sm">
                                    <span>
                                      {addon.name} - ${addon.price.toFixed(2)}
                                      {addon.isRequired ? " (required)" : ""}
                                    </span>
                                    <button
                                      onClick={() => deleteAddon(addon.id)}
                                      className="text-red-600 hover:underline text-xs"
                                    >
                                      Remove
                                    </button>
                                  </li>
                                ))}
                              </ul>
                              <form
                                onSubmit={(e) => addAddon(item.id, e)}
                                className="grid grid-cols-1 md:grid-cols-4 gap-2"
                              >
                                <input
                                  className="border rounded px-2 py-1"
                                  placeholder="Add-on name"
                                  value={addonForm.name}
                                  onChange={(e) =>
                                    setAddonFormFor(item.id, { ...addonForm, name: e.target.value })
                                  }
                                />
                                <input
                                  className="border rounded px-2 py-1"
                                  placeholder="Price"
                                  value={addonForm.price}
                                  onChange={(e) =>
                                    setAddonFormFor(item.id, { ...addonForm, price: e.target.value })
                                  }
                                />
                                <label className="flex items-center gap-2 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={addonForm.isRequired}
                                    onChange={(e) =>
                                      setAddonFormFor(item.id, { ...addonForm, isRequired: e.target.checked })
                                    }
                                  />
                                  Required
                                </label>
                                <button className="bg-indigo-600 text-white rounded px-3 py-1 text-sm" type="submit">
                                  Add
                                </button>
                              </form>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                  {categoryItems.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-2 text-gray-400 text-sm">
                        No items in this category yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <form
                onSubmit={(e) => addItem(category.id, e)}
                className="grid grid-cols-1 md:grid-cols-6 gap-2 border-t pt-3"
              >
                <input
                  className="border rounded px-2 py-1"
                  placeholder="Item name"
                  value={form.name}
                  onChange={(e) => setItemFormFor(category.id, { ...form, name: e.target.value })}
                />
                <input
                  className="border rounded px-2 py-1"
                  placeholder="Description"
                  value={form.description}
                  onChange={(e) => setItemFormFor(category.id, { ...form, description: e.target.value })}
                />
                <input
                  className="border rounded px-2 py-1"
                  placeholder="Cost"
                  value={form.cost}
                  onChange={(e) => setItemFormFor(category.id, { ...form, cost: e.target.value })}
                />
                <input
                  className="border rounded px-2 py-1"
                  placeholder="Qty"
                  value={form.quantity}
                  onChange={(e) => setItemFormFor(category.id, { ...form, quantity: e.target.value })}
                />
                <input
                  className="border rounded px-2 py-1"
                  placeholder="Picture URL"
                  value={form.picture}
                  onChange={(e) => setItemFormFor(category.id, { ...form, picture: e.target.value })}
                />
                <input
                  type="file"
                  accept="image/*"
                  className="text-xs"
                  onChange={(e) => readImageFile(e.target.files && e.target.files[0], (dataUrl) => setItemFormFor(category.id, { ...form, picture: dataUrl }))}
                />
                <button className="bg-purple-600 text-white rounded px-3 py-1 text-sm" type="submit">
                  Add Item
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
