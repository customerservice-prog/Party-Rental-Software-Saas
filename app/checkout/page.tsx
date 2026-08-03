"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function CheckoutPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const itemId = searchParams.get("itemId");

  const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");
        setLoading(true);

      const form = new FormData(e.currentTarget);
        const payload = {
                itemId,
                firstName: form.get("firstName"),
                lastName: form.get("lastName"),
                email: form.get("email"),
                phone: form.get("phone"),
                eventDate: form.get("eventDate"),
      eventEndDate: form.get("eventEndDate") || null,
                deliveryAddress: form.get("deliveryAddress"),
        };

      try {
              const res = await fetch("/api/checkout", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
              });

          const data = await res.json();

          if (!res.ok) {
                    throw new Error(data.error || "Failed to start checkout");
          }

          if (data.url) {
                    window.location.href = data.url;
          } else {
                    router.push("/checkout/success");
          }
      } catch (err) {
              setError(err instanceof Error ? err.message : "Something went wrong");
              setLoading(false);
      }
  }

  return (
        <div className="max-w-xl mx-auto p-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-6">Complete Your Booking</h1>
        
          {error && (
                  <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>
              )}
        
              <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                                <div>
                                            <label className="block text-sm font-medium text-gray-700">First name</label>
                                            <input name="firstName" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                                </div>
                                <div>
                                            <label className="block text-sm font-medium text-gray-700">Last name</label>
                                            <input name="lastName" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                                </div>
                      </div>
              
                      <div>
                                <label className="block text-sm font-medium text-gray-700">Email</label>
                                <input type="email" name="email" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                      </div>
              
                      <div>
                                <label className="block text-sm font-medium text-gray-700">Phone</label>
                                <input type="tel" name="phone" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                      </div>
              
                      <div>
                                <label className="block text-sm font-medium text-gray-700">Event date</label>
                                <input type="date" name="eventDate" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                      </div>
                      <div>
                                <label className="block text-sm font-medium text-gray-700">Event end date (optional)</label>
                                <input type="date" name="eventEndDate" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                      </div>
              
                      <div>
                                <label className="block text-sm font-medium text-gray-700">Delivery address</label>
                                <input name="deliveryAddress" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                      </div>
              
                      <button
                                  type="submit"
                                  disabled={loading}
                                  className="w-full bg-indigo-600 text-white py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                                >
                        {loading ? "Redirecting to payment..." : "Continue to Payment"}
                      </button>
              </form>
        </div>
      );
}
