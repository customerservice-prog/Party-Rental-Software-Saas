"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type TenantRoleRef = { id: string; name: string };

type StaffUser = {
  id: string;
  username: string;
  name: string;
  role: string;
  tenantRoleId: string | null;
  tenantRole: TenantRoleRef | null;
  createdAt: string;
};

type RoleOption = { id: string; name: string; isActive: boolean };

export default function StaffPage() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: "", name: "", password: "", role: "staff", tenantRoleId: "" });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    const [usersRes, rolesRes] = await Promise.all([
      fetch("/api/users"),
      fetch("/api/roles"),
    ]);
    const usersData = await usersRes.json();
    const rolesData = await rolesRes.json();
    if (!usersRes.ok) {
      setError(usersData.error || "Failed to load staff accounts.");
      setUsers([]);
    } else {
      setUsers(usersData.users);
    }
    if (rolesRes.ok) {
      setRoles(rolesData.roles);
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
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        tenantRoleId: form.role === "owner" ? null : form.tenantRoleId || null,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Failed to create account.");
      return;
    }
    setForm({ username: "", name: "", password: "", role: "staff", tenantRoleId: "" });
    setShowForm(false);
    load();
  }

  async function handleRoleChange(id: string, role: string) {
    setError("");
    const res = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, role, tenantRoleId: role === "owner" ? null : undefined }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to update role.");
      return;
    }
    load();
  }

  async function handleTenantRoleChange(id: string, tenantRoleId: string) {
    setError("");
    const res = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, tenantRoleId: tenantRoleId || null }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to update permission role.");
      return;
    }
    load();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Remove this staff account? They will no longer be able to sign in.")) {
      return;
    }
    setError("");
    const res = await fetch("/api/users?id=" + encodeURIComponent(id), { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to remove account.");
      return;
    }
    load();
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Accounts</h1>
          <p className="text-sm text-gray-500 mt-1">
            Owners can sign in to everything. Staff accounts can be given a
            custom permission role that controls what they can see and do.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/roles"
            className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Manage Roles
          </Link>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            {showForm ? "Cancel" : "Add Staff Account"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 rounded-lg border bg-white p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Full name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Username</label>
              <input
                required
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Temporary password</label>
              <input
                required
                type="password"
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Account type</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="staff">Staff</option>
                <option value="owner">Owner</option>
              </select>
            </div>
            {form.role === "staff" && (
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Permission role</label>
                <select
                  value={form.tenantRoleId}
                  onChange={(e) => setForm({ ...form, tenantRoleId: e.target.value })}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="">No role assigned (no dashboard access beyond login)</option>
                  {roles.filter((r) => r.isActive).map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Account"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <div className="rounded-lg border bg-white divide-y">
          {users.length === 0 && (
            <p className="p-4 text-sm text-gray-500">No staff accounts yet.</p>
          )}
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between px-4 py-3 gap-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{u.name}</p>
                <p className="text-xs text-gray-500">@{u.username}</p>
              </div>
              <div className="flex items-center gap-3">
                {u.role === "staff" && (
                  <select
                    value={u.tenantRoleId || ""}
                    onChange={(e) => handleTenantRoleChange(u.id, e.target.value)}
                    className="rounded-md border px-2 py-1 text-xs"
                  >
                    <option value="">No permission role</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                )}
                <select
                  value={u.role}
                  onChange={(e) => handleRoleChange(u.id, e.target.value)}
                  className="rounded-md border px-2 py-1 text-xs"
                >
                  <option value="staff">Staff</option>
                  <option value="owner">Owner</option>
                </select>
                <button
                  onClick={() => handleDelete(u.id)}
                  className="text-xs font-medium text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
