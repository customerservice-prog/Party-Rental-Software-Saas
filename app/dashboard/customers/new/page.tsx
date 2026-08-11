"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewCustomerPage() {
    const router = useRouter();
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");
        setLoading(true);

      const form = new FormData(e.currentTarget);
        const payload = {
                firstName: form.get("firstName"),
                lastName: form.get("lastName"),
                email: form.get("email"),
                phone: form.get("phone"),
                address: form.get("address"),
                leadSource: form.get("leadSource"),
        };

      try {
              const res = await fetch("/api/customers", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
              });

          if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || "Failed to create customer");
          }

          router.push("/dashboard/customers");
              router.refresh();
      } catch (err) {
              setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
              setLoading(false);
      }
  }

  return (
        <div className="p-8 max-w-xl">
              <h1 className="text-2xl font-bold text-gray-900 mb-6">Add Customer</h1>
        
          {error && (
                  <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>
              )}
        
              <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                                <div>
                                            <label className="block text-sm font-medium text-gray-700">First name</label>
                                            <input
                                                            name="firstName"
                                                            required
                                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                                                          />
                                </div>
                                <div>
                                            <label className="block text-sm font-medium text-gray-700">Last name</label>
                                            <input
                                                            name="lastName"
                                                            required
                                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                                                          />
                                </div>
                      </div>
              
                      <div>
                                <label className="block text-sm font-medium text-gray-700">Email</label>
                                <input
                                              type="email"
                                              name="email"
                                              required
                                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                                            />
                      </div>
              
                      <div>
                                <label className="block text-sm font-medium text-gray-700">Phone</label>
                                <input
                                              type="tel"
                                              name="phone"
                                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                                            />
                      </div>
              
                      <div>
                                <label className="block text-sm font-medium text-gray-700">Address</label>
                                <input
                                              name="address"
                                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                                            />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Lead source</label>
                        <select
                          name="leadSource"
                          defaultValue="other"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        >
                          <option value="referral">Referral</option>
                          <option value="google">Google / Search</option>
                          <option value="social">Social Media</option>
                          <option value="repeat">Repeat Customer</option>
                          <option value="event">Event / Show</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
              
                      <button
                                  type="submit"
                                  disabled={loading}
                                  className="w-full bg-indigo-600 text-white py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                                >
                        {loading ? "Saving..." : "Save Customer"}
                      </button>
              </form>
        </div>
      );
}
