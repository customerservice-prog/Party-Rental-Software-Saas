"use client";

import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [profile, setProfile] = useState({
    name: "",
    contactEmail: "",
    contactPhone: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    timezone: "America/New_York",
    logoUrl: "",
    primaryColor: "#7c3aed",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [stripeStatus, setStripeStatus] = useState<{
    connected: boolean;
    payoutsEnabled?: boolean;
    detailsSubmitted?: boolean;
  }>({ connected: false });
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    async function load() {
      const [orgRes, stripeRes] = await Promise.all([
        fetch("/api/organizations"),
        fetch("/api/stripe/connect"),
      ]);
      if (orgRes.ok) {
        const { organization } = await orgRes.json();
        setProfile({
          name: organization.name || "",
          contactEmail: organization.contactEmail || "",
          contactPhone: organization.contactPhone || "",
          address: organization.address || "",
          city: organization.city || "",
          state: organization.state || "",
          zip: organization.zip || "",
          timezone: organization.timezone || "America/New_York",
          logoUrl: organization.logoUrl || "",
          primaryColor: organization.primaryColor || "#7c3aed",
        });
      }
      if (stripeRes.ok) {
        setStripeStatus(await stripeRes.json());
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/organizations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      setMessage("Settings saved.");
    } catch (e: any) {
      setMessage(e.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleConnectStripe() {
    setConnecting(true);
    try {
      const res = await fetch("/api/stripe/connect", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setConnecting(false);
    }
  }

  if (loading) {
    return <div className="p-6">Loading settings...</div>;
  }

  const inputClass = "block w-full border rounded p-2";
  const labelClass = "block mb-4";
  const labelTextClass = "block text-sm font-medium mb-1";
  const buttonClass =
    "bg-brand-600 text-white rounded px-4 py-2 font-medium disabled:opacity-50";

  return (
    <div className="max-w-xl p-6">
      <h1 className="text-2xl font-bold mb-6">Business Settings</h1>

      {message && <p className="mb-4 text-sm text-green-700">{message}</p>}

      <h2 className="text-lg font-semibold mb-3">Profile</h2>
      <label className={labelClass}>
        <span className={labelTextClass}>Business name</span>
        <input
          value={profile.name}
          onChange={(e) => setProfile({ ...profile, name: e.target.value })}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        <span className={labelTextClass}>Contact email</span>
        <input
          value={profile.contactEmail}
          onChange={(e) => setProfile({ ...profile, contactEmail: e.target.value })}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        <span className={labelTextClass}>Contact phone</span>
        <input
          value={profile.contactPhone}
          onChange={(e) => setProfile({ ...profile, contactPhone: e.target.value })}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        <span className={labelTextClass}>Address</span>
        <input
          value={profile.address}
          onChange={(e) => setProfile({ ...profile, address: e.target.value })}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        <span className={labelTextClass}>City</span>
        <input
          value={profile.city}
          onChange={(e) => setProfile({ ...profile, city: e.target.value })}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        <span className={labelTextClass}>State</span>
        <input
          value={profile.state}
          onChange={(e) => setProfile({ ...profile, state: e.target.value })}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        <span className={labelTextClass}>Zip</span>
        <input
          value={profile.zip}
          onChange={(e) => setProfile({ ...profile, zip: e.target.value })}
          className={inputClass}
        />
      </label>

      <h2 className="text-lg font-semibold mb-3 mt-6">Branding</h2>
      <label className={labelClass}>
        <span className={labelTextClass}>Logo URL</span>
        <input
          value={profile.logoUrl}
          onChange={(e) => setProfile({ ...profile, logoUrl: e.target.value })}
          className={inputClass}
        />
      </label>
      <label className="block mb-6">
        <span className={labelTextClass}>Primary color</span>{" "}
        <input
          type="color"
          value={profile.primaryColor}
          onChange={(e) => setProfile({ ...profile, primaryColor: e.target.value })}
        />
      </label>

      <button disabled={saving} onClick={handleSave} className={buttonClass + " mb-8"}>
        {saving ? "Saving..." : "Save Settings"}
      </button>

      <h2 className="text-lg font-semibold mb-3">Payments</h2>
      {stripeStatus.connected ? (
        <div>
          <p className="text-gray-600 mb-3">
            Stripe account connected.{" "}
            {stripeStatus.payoutsEnabled
              ? "Payouts are enabled."
              : "Additional details are needed before payouts can start."}
          </p>
          <button disabled={connecting} onClick={handleConnectStripe} className={buttonClass}>
            {connecting ? "Loading..." : "Update Stripe details"}
          </button>
        </div>
      ) : (
        <div>
          <p className="text-gray-600 mb-3">
            Connect a Stripe account to receive payments directly from your customers.
          </p>
          <button disabled={connecting} onClick={handleConnectStripe} className={buttonClass}>
            {connecting ? "Redirecting..." : "Connect with Stripe"}
          </button>
        </div>
      )}
    </div>
  );
}
