"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CatalogBrowser from "../dashboard/inventory/CatalogBrowser";

const STEPS = ["Business Profile", "Branding", "Category", "Inventory", "Done"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [profile, setProfile] = useState({
    address: "",
    city: "",
    state: "",
    zip: "",
    timezone: "America/New_York",
    contactPhone: "",
  });

  const [branding, setBranding] = useState({
    logoUrl: "",
    primaryColor: "#7c3aed",
  });

  const [categoryName, setCategoryName] = useState("");
  const [showCatalog, setShowCatalog] = useState(false);
  const [inventorySummary, setInventorySummary] = useState<string | null>(null);

  async function saveProfileAndContinue() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/organizations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error("Failed to save business profile");
      setStep(1);
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function saveBrandingAndContinue() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/organizations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(branding),
      });
      if (!res.ok) throw new Error("Failed to save branding");
      setStep(2);
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function createCategoryAndContinue() {
    if (!categoryName.trim()) {
      setStep(3);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: categoryName }),
      });
      if (!res.ok) throw new Error("Failed to create category");
      setStep(3);
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "block w-full border rounded p-2 mb-3";
  const buttonClass =
    "bg-brand-600 text-white rounded px-4 py-2 font-medium disabled:opacity-50";

  return (
    <div className="max-w-lg mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">
        Welcome. Let us set up your rental business
      </h1>

      <div className="flex gap-2 mb-6">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={
              "flex-1 text-center rounded py-2 text-xs font-medium " +
              (i === step ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600")
            }
          >
            {label}
          </div>
        ))}
      </div>

      {error && <p className="text-red-600 mb-4 text-sm">{error}</p>}

      {step === 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Business Profile</h2>
          <input
            placeholder="Street address"
            value={profile.address}
            onChange={(e) => setProfile({ ...profile, address: e.target.value })}
            className={inputClass}
          />
          <input
            placeholder="City"
            value={profile.city}
            onChange={(e) => setProfile({ ...profile, city: e.target.value })}
            className={inputClass}
          />
          <input
            placeholder="State"
            value={profile.state}
            onChange={(e) => setProfile({ ...profile, state: e.target.value })}
            className={inputClass}
          />
          <input
            placeholder="Zip"
            value={profile.zip}
            onChange={(e) => setProfile({ ...profile, zip: e.target.value })}
            className={inputClass}
          />
          <input
            placeholder="Contact phone"
            value={profile.contactPhone}
            onChange={(e) => setProfile({ ...profile, contactPhone: e.target.value })}
            className={inputClass}
          />
          <button disabled={saving} onClick={saveProfileAndContinue} className={buttonClass}>
            {saving ? "Saving..." : "Continue"}
          </button>
        </div>
      )}

      {step === 1 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Branding</h2>
          <input
            placeholder="Logo URL (optional)"
            value={branding.logoUrl}
            onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
            className={inputClass}
          />
          <label className="block mb-4">
            Primary color:{" "}
            <input
              type="color"
              value={branding.primaryColor}
              onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
            />
          </label>
          <button disabled={saving} onClick={saveBrandingAndContinue} className={buttonClass}>
            {saving ? "Saving..." : "Continue"}
          </button>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2 className="text-lg font-semibold mb-2">Create your first inventory category</h2>
          <p className="text-gray-500 text-sm mb-3">
            Examples: Bounce Houses, Tables and Chairs, Tents. You can skip this - the next step can create
            categories for you automatically.
          </p>
          <input
            placeholder="Category name (optional)"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            className={inputClass}
          />
          <button disabled={saving} onClick={createCategoryAndContinue} className={buttonClass}>
            {saving ? "Saving..." : "Continue"}
          </button>
        </div>
      )}

      {step === 3 && (
        <div>
          <h2 className="text-lg font-semibold mb-2">Now let's build your rental catalog</h2>
          <p className="text-gray-500 text-sm mb-4">
            Tell us what you actually own - we will never invent inventory or prices for you. Pick the option that
            fits your business.
          </p>

          {inventorySummary && (
            <p className="text-sm text-indigo-700 bg-indigo-50 rounded p-3 mb-4">{inventorySummary}</p>
          )}

          <div className="space-y-3 mb-4">
            <button
              onClick={() => setShowCatalog(true)}
              className="w-full text-left border rounded p-4 hover:border-brand-600"
              type="button"
            >
              <span className="block font-medium">Start with Party Rental Templates</span>
              <span className="block text-sm text-gray-500">
                Best for new businesses. Pick the equipment you carry, then tell us your real quantities and prices.
              </span>
            </button>

            <div className="w-full text-left border rounded p-4 opacity-50 cursor-not-allowed">
              <span className="block font-medium">Import from a spreadsheet</span>
              <span className="block text-sm text-gray-500">
                Coming soon - for established companies moving from another system. For now, use the Inventory page
                to add items manually or from templates.
              </span>
            </div>

            <button
              onClick={() => setStep(4)}
              className="w-full text-left border rounded p-4 hover:border-brand-600"
              type="button"
            >
              <span className="block font-medium">I'll add my inventory manually later</span>
              <span className="block text-sm text-gray-500">
                Skip for now - you can add categories and items any time from the Inventory page.
              </span>
            </button>
          </div>

          <button onClick={() => setStep(4)} className="text-sm text-gray-500">
            Skip this step
          </button>

          {showCatalog && (
            <CatalogBrowser
              onClose={() => setShowCatalog(false)}
              onAdded={(result) => {
                setShowCatalog(false);
                const parts: string[] = [];
                if (result.created.length > 0) parts.push(result.created.length + " item(s) added to your inventory.");
                if (result.skipped.length > 0) parts.push(result.skipped.length + " were already added.");
                setInventorySummary(parts.join(" ") || "No items were added.");
              }}
            />
          )}
        </div>
      )}

      {step === 4 && (
        <div>
          <h2 className="text-lg font-semibold mb-2">You are all set.</h2>
          <p className="text-gray-600 mb-4">
            Head to your dashboard to review your inventory, invite staff, and start taking bookings.
          </p>
          <button onClick={() => router.push("/dashboard")} className={buttonClass}>
            Go to Dashboard
          </button>
        </div>
      )}
    </div>
  );
}
