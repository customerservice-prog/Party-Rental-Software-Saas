"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STEPS = ["Business Profile", "Branding", "First Category", "Done"];

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
            Examples: Bounce Houses, Tables and Chairs, Tents
          </p>
          <input
            placeholder="Category name"
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
          <h2 className="text-lg font-semibold mb-2">You are all set.</h2>
          <p className="text-gray-600 mb-4">
            Head to your dashboard to add inventory items and start taking bookings.
          </p>
          <button onClick={() => router.push("/dashboard")} className={buttonClass}>
            Go to Dashboard
          </button>
        </div>
      )}
    </div>
  );
}
