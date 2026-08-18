"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Role = {
  id: string;
  name: string;
  slug: string;
  permissions: string[];
  isActive: boolean;
  _count?: { users: number };
};

type CatalogEntry = { code: string; label: string; group: string };

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPermissions, setNewPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [editName, setEditName] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    const [rolesRes, catalogRes] = await Promise.all([
      fetch("/api/roles"),
      fetch("/api/permissions-catalog"),
    ]);
    const rolesData = await rolesRes.json();
    if (!rolesRes.ok) {
      setError(rolesData.error || "Failed to load roles.");
      setRoles([]);
    } else {
      setRoles(rolesData.roles);
    }
    if (catalogRes.ok) {
      const catalogData = await catalogRes.json();
      setCatalog(catalogData.catalog);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function togglePermission(list: string[], code: string): string[] {
    return list.includes(code) ? list.filter((c) => c !== code) : [...list, code];
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, permissions: newPermissions }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Failed to create role.");
      return;
    }
    setNewName("");
    setNewPermissions([]);
    setShowForm(false);
    load();
  }

  function startEdit(role: Role) {
    setEditingId(role.id);
    setEditName(role.name);
    setEditPermissions(role.permissions || []);
  }

  async function saveEdit(id: string) {
    setError("");
    const res = await fetch("/api/roles/" + id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, permissions: editPermissions }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to update role.");
      return;
    }
    setEditingId(null);
    load();
  }

  async function toggleActive(role: Role) {
    setError("");
    const res = await fetch("/api/roles/" + role.id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !role.isActive }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to update role.");
      return;
    }
    load();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this role? This cannot be undone.")) return;
    setError("");
    const res = await fetch("/api/roles/" + id, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to delete role.");
      return;
    }
    load();
  }

  const groups = Array.from(new Set(catalog.map((c) => c.group)));

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Roles</h1>
          <p className="text-sm text-gray-500 mt-1">
            Build custom permission sets and assign them to staff logins on the
            <Link href="/dashboard/staff" className="text-indigo-600 hover:underline"> Staff Accounts</Link> page.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          {showForm ? "Cancel" : "Add Role"}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 rounded-lg border bg-white p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Role name</label>
            <input
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Dispatcher"
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
          {groups.map((group) => (
            <div key={group}>
              <p className="text-xs font-semibold text-gray-700 mt-3 mb-1">{group}</p>
              <div className="grid grid-cols-2 gap-1">
                {catalog.filter((c) => c.group === group).map((c) => (
                  <label key={c.code} className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={newPermissions.includes(c.code)}
                      onChange={() => setNewPermissions(togglePermission(newPermissions, c.code))}
                    />
                    {c.label}
                  </label>
                ))}
              </div>
            </div>
          ))}
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Role"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <div className="space-y-3">
          {roles.length === 0 && (
            <p className="text-sm text-gray-500">No custom roles yet. Staff without a role can sign in but see no dashboard sections.</p>
          )}
          {roles.map((role) => (
            <div key={role.id} className="rounded-lg border bg-white p-4">
              {editingId === role.id ? (
                <div className="space-y-3">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  />
                  {groups.map((group) => (
                    <div key={group}>
                      <p className="text-xs font-semibold text-gray-700 mt-2 mb-1">{group}</p>
                      <div className="grid grid-cols-2 gap-1">
                        {catalog.filter((c) => c.group === group).map((c) => (
                          <label key={c.code} className="flex items-center gap-2 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              checked={editPermissions.includes(c.code)}
                              onChange={() => setEditPermissions(togglePermission(editPermissions, c.code))}
                            />
                            {c.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveEdit(role.id)}
                      className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded-md border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {role.name}
                      {!role.isActive && <span className="ml-2 text-xs text-gray-400">(inactive)</span>}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {(role.permissions || []).length} permission(s)
                      {role._count ? " - " + role._count.users + " staff assigned" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => startEdit(role)}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => toggleActive(role)}
                      className="text-xs font-medium text-gray-600 hover:text-gray-800"
                    >
                      {role.isActive ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => handleDelete(role.id)}
                      className="text-xs font-medium text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
