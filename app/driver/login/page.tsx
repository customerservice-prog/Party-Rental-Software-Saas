"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Driver sign-in: business subdomain + PIN. Completely separate from the
// staff /login page - drivers are not User accounts.
export default function DriverLoginPage() {
  const router = useRouter();
  const [tenantSlug, setTenantSlug] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/driver/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantSlug, pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid subdomain or PIN.");
        setLoading(false);
        return;
      }
      router.push("/driver");
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="max-w-sm w-full bg-white border rounded-lg shadow-sm p-8"
      >
        <h1 className="text-xl font-bold text-gray-900 mb-1">Driver Sign In</h1>
        <p className="text-sm text-gray-500 mb-6">
          Enter your business subdomain and driver PIN.
        </p>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </div>
        )}

        <label className="block text-sm font-medium text-gray-700 mb-1">
          Business subdomain
        </label>
        <input
          type="text"
          value={tenantSlug}
          onChange={(e) => setTenantSlug(e.target.value)}
          placeholder="yourbusiness"
          className="w-full border rounded px-3 py-2 mb-4"
          required
        />

        <label className="block text-sm font-medium text-gray-700 mb-1">Driver PIN</label>
        <input
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="****"
          className="w-full border rounded px-3 py-2 mb-6"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white rounded py-2 font-medium disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}
