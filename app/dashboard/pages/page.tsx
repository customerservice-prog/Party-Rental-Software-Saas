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

type PageRow = {
  id: string;
  slug: string;
  title: string;
  navLabel: string | null;
  navOrder: number;
  showInNav: boolean;
  isPublished: boolean;
  content: string;
};

type Block =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "image"; url: string; alt: string }
  | { type: "button"; label: string; href: string };

function parseBlocks(content: string): Block[] {
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // ignore
  }
  return [];
}

function emptyBlock(type: Block["type"]): Block {
  if (type === "heading") return { type: "heading", text: "New heading" };
  if (type === "paragraph") return { type: "paragraph", text: "New paragraph text..." };
  if (type === "image") return { type: "image", url: "", alt: "" };
  return { type: "button", label: "Click here", href: "/book" };
}

export default function PagesManager() {
  const [pages, setPages] = useState<PageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [editForm, setEditForm] = useState({
    title: "",
    slug: "",
    navLabel: "",
    showInNav: true,
    isPublished: true,
  });
  const [newForm, setNewForm] = useState({ title: "", slug: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadPages() {
    setLoading(true);
    const res = await fetch("/api/pages");
    const data = await res.json();
    setPages(data.pages || []);
    setLoading(false);
  }

  useEffect(() => {
    loadPages();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!newForm.title.trim() || !newForm.slug.trim()) {
      setError("Title and page address are required");
      return;
    }
    const res = await fetch("/api/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newForm.title,
        slug: newForm.slug,
        content: JSON.stringify([emptyBlock("heading"), emptyBlock("paragraph")]),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to create page");
      return;
    }
    setNewForm({ title: "", slug: "" });
    await loadPages();
    startEdit(data.page);
  }

  function startEdit(page: PageRow) {
    setEditingId(page.id);
    setEditForm({
      title: page.title,
      slug: page.slug,
      navLabel: page.navLabel || "",
      showInNav: page.showInNav,
      isPublished: page.isPublished,
    });
    setBlocks(parseBlocks(page.content));
    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setBlocks([]);
  }

  async function handleSave() {
    if (!editingId) return;
    setSaving(true);
    setError("");
    const res = await fetch("/api/pages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingId,
        title: editForm.title,
        slug: editForm.slug,
        navLabel: editForm.navLabel,
        showInNav: editForm.showInNav,
        isPublished: editForm.isPublished,
        content: JSON.stringify(blocks),
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Failed to save page");
      return;
    }
    await loadPages();
    setEditingId(null);
    setBlocks([]);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this page? This cannot be undone.")) return;
    await fetch("/api/pages?id=" + id, { method: "DELETE" });
    if (editingId === id) {
      setEditingId(null);
      setBlocks([]);
    }
    await loadPages();
  }

  function updateBlock(index: number, patch: Partial<Block>) {
    setBlocks((prev) =>
      prev.map((b, i) => (i === index ? ({ ...b, ...patch } as Block) : b))
    );
  }

  function removeBlock(index: number) {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  }

  function moveBlock(index: number, dir: -1 | 1) {
    setBlocks((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function addBlock(type: Block["type"]) {
    setBlocks((prev) => [...prev, emptyBlock(type)]);
  }

  if (loading) {
    return <div className="p-8">Loading pages...</div>;
  }

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Website Pages</h1>
      <p className="text-gray-500 mb-6">
        Build extra pages for your public site (About Us, FAQ, Policies, etc.) and
        control which ones appear in your site navigation.
      </p>

      {error && (
        <div className="mb-4 rounded bg-red-50 text-red-700 border border-red-200 px-4 py-2 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">In Nav</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Published</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {pages.map((page) => (
              <tr key={page.id}>
                <td className="px-4 py-2 text-sm text-gray-900">{page.title}</td>
                <td className="px-4 py-2 text-sm text-gray-500">/{page.slug}</td>
                <td className="px-4 py-2 text-sm text-gray-500">{page.showInNav ? "Yes" : "No"}</td>
                <td className="px-4 py-2 text-sm text-gray-500">{page.isPublished ? "Published" : "Draft"}</td>
                <td className="px-4 py-2 text-sm space-x-3">
                  <button
                    onClick={() => startEdit(page)}
                    className="text-brand-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(page.id)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {pages.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-400">
                  No extra pages yet. Create one below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!editingId && (
        <form onSubmit={handleCreate} className="bg-white shadow rounded-lg p-6 mb-8 space-y-3">
          <h2 className="font-semibold text-gray-900">Add a new page</h2>
          <div className="flex gap-3">
            <input
              className="border rounded px-3 py-2 flex-1"
              placeholder="Page title (e.g. About Us)"
              value={newForm.title}
              onChange={(e) => setNewForm({ ...newForm, title: e.target.value })}
            />
            <input
              className="border rounded px-3 py-2 flex-1"
              placeholder="Page address (e.g. about-us)"
              value={newForm.slug}
              onChange={(e) => setNewForm({ ...newForm, slug: e.target.value })}
            />
            <button type="submit" className="bg-brand-600 text-white px-4 py-2 rounded whitespace-nowrap">
              Create Page
            </button>
          </div>
        </form>
      )}

      {editingId && (
        <div className="bg-white shadow rounded-lg p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Edit page</h2>
            <div className="space-x-3">
              <button onClick={cancelEdit} className="text-gray-500 hover:underline">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-brand-600 text-white px-4 py-2 rounded"
              >
                {saving ? "Saving..." : "Save Page"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="text-sm text-gray-600">
              Title
              <input
                className="mt-1 border rounded px-3 py-2 w-full"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
            </label>
            <label className="text-sm text-gray-600">
              Page address
              <input
                className="mt-1 border rounded px-3 py-2 w-full"
                value={editForm.slug}
                onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
              />
            </label>
            <label className="text-sm text-gray-600">
              Nav label
              <input
                className="mt-1 border rounded px-3 py-2 w-full"
                value={editForm.navLabel}
                onChange={(e) => setEditForm({ ...editForm, navLabel: e.target.value })}
              />
            </label>
            <div className="flex items-end gap-6">
              <label className="text-sm text-gray-600 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editForm.showInNav}
                  onChange={(e) => setEditForm({ ...editForm, showInNav: e.target.checked })}
                />
                Show in navigation
              </label>
              <label className="text-sm text-gray-600 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editForm.isPublished}
                  onChange={(e) => setEditForm({ ...editForm, isPublished: e.target.checked })}
                />
                Published
              </label>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Page content</h3>
            <div className="space-y-4">
              {blocks.map((block, index) => (
                <div key={index} className="border rounded p-4 relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs uppercase tracking-wide text-gray-400">
                      {block.type}
                    </span>
                    <div className="space-x-2 text-xs">
                      <button onClick={() => moveBlock(index, -1)} className="text-gray-500 hover:underline">
                        Up
                      </button>
                      <button onClick={() => moveBlock(index, 1)} className="text-gray-500 hover:underline">
                        Down
                      </button>
                      <button onClick={() => removeBlock(index)} className="text-red-600 hover:underline">
                        Remove
                      </button>
                    </div>
                  </div>

                  {block.type === "heading" && (
                    <input
                      className="border rounded px-3 py-2 w-full text-lg font-semibold"
                      value={block.text}
                      onChange={(e) => updateBlock(index, { text: e.target.value })}
                    />
                  )}

                  {block.type === "paragraph" && (
                    <textarea
                      className="border rounded px-3 py-2 w-full"
                      rows={4}
                      value={block.text}
                      onChange={(e) => updateBlock(index, { text: e.target.value })}
                    />
                  )}

                  {block.type === "image" && (
                    <div className="space-y-2">
                      {block.url && (
                        <img src={block.url} alt={block.alt} className="max-h-40 rounded border" />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          readImageFile(e.target.files?.[0], (dataUrl) =>
                            updateBlock(index, { url: dataUrl })
                          )
                        }
                      />
                      <input
                        className="border rounded px-3 py-2 w-full"
                        placeholder="Image alt text"
                        value={block.alt}
                        onChange={(e) => updateBlock(index, { alt: e.target.value })}
                      />
                    </div>
                  )}

                  {block.type === "button" && (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        className="border rounded px-3 py-2"
                        placeholder="Button label"
                        value={block.label}
                        onChange={(e) => updateBlock(index, { label: e.target.value })}
                      />
                      <input
                        className="border rounded px-3 py-2"
                        placeholder="Link (e.g. /book)"
                        value={block.href}
                        onChange={(e) => updateBlock(index, { href: e.target.value })}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 space-x-2">
              <button onClick={() => addBlock("heading")} className="border rounded px-3 py-1 text-sm">
                + Heading
              </button>
              <button onClick={() => addBlock("paragraph")} className="border rounded px-3 py-1 text-sm">
                + Paragraph
              </button>
              <button onClick={() => addBlock("image")} className="border rounded px-3 py-1 text-sm">
                + Image
              </button>
              <button onClick={() => addBlock("button")} className="border rounded px-3 py-1 text-sm">
                + Button
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
