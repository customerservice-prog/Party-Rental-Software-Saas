"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "yourplatform.com";

export default function SignupPage() {
    const router = useRouter();
    const [form, setForm] = useState({
          businessName: "",
          slug: "",
          ownerName: "",
          username: "",
          password: "",
          contactEmail: "",
    });
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

  function updateField(field: string, value: string) {
        setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);

      const res = await fetch("/api/signup", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(form),
      });

      setLoading(false);

      if (!res.ok) {
              const data = await res.json();
              setError(data.error?.formErrors?.[0] || data.error || "Signup failed");
              return;
      }

      const data = await res.json();
        router.push("/t/" + data.slug + "/login?signup=success");
  }

  return (
        <div className="max-w-md mx-auto py-12 px-4">
              <h1 className="text-2xl font-bold mb-6">Start Your Rental Business</h1>
              <p className="text-gray-600 mb-6">
                      Create your account and get your own booking site and control panel
                      in minutes.
              </p>
        
          {error && (
                  <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">
                    {error}
                  </div>
              )}
        
              <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                                <label className="block text-sm font-medium mb-1">
                                            Business Name
                                </label>
                                <input
                                              className="w-full border rounded p-2"
                                              value={form.businessName}
                                              onChange={(e) => updateField("businessName", e.target.value)}
                                              required
                                            />
                      </div>
              
                      <div>
                                <label className="block text-sm font-medium mb-1">
                                            Choose Your Subdomain
                                </label>
                                <div className="flex items-center">
                                            <input
                                                            className="w-full border rounded p-2"
                                                            value={form.slug}
                                                            onChange={(e) =>
                                                                              updateField("slug", e.target.value.toLowerCase())
                                                            }
                                                            placeholder="yourbusiness"
                                                            required
                                                          />
                                            <span className="ml-2 text-gray-500 text-sm whitespace-nowrap">
                                                          {`.${ROOT_DOMAIN}`}
                                            </span>
                                </div>
                      </div>
              
                      <div>
                                <label className="block text-sm font-medium mb-1">Your Name</label>
                                <input
                                              className="w-full border rounded p-2"
                                              value={form.ownerName}
                                              onChange={(e) => updateField("ownerName", e.target.value)}
                                              required
                                            />
                      </div>
              
                      <div>
                                <label className="block text-sm font-medium mb-1">
                                            Contact Email
                                </label>
                                <input
                                              type="email"
                                              className="w-full border rounded p-2"
                                              value={form.contactEmail}
                                              onChange={(e) => updateField("contactEmail", e.target.value)}
                                              required
                                            />
                      </div>
              
                      <div>
                                <label className="block text-sm font-medium mb-1">
                                            Choose a Username
                                </label>
                                <input
                                              className="w-full border rounded p-2"
                                              value={form.username}
                                              onChange={(e) => updateField("username", e.target.value)}
                                              required
                                            />
                      </div>
              
                      <div>
                                <label className="block text-sm font-medium mb-1">Password</label>
                                <input
                                              type="password"
                                              className="w-full border rounded p-2"
                                              value={form.password}
                                              onChange={(e) => updateField("password", e.target.value)}
                                              minLength={8}
                                              required
                                            />
                      </div>
              
                      <button
                                  type="submit"
                                  disabled={loading}
                                  className="w-full bg-brand-600 text-white rounded p-2 font-medium disabled:opacity-50"
                                >
                        {loading ? "Creating your account..." : "Create Account"}
                      </button>
              </form>
        </div>
      );
}
