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
        return <div style={{ padding: 20 }}>Loading settings...</div>;
  }

  return (
        <div style={{ padding: 20, maxWidth: 600 }}>
                <h1>Business Settings</h1>
        
          {message && <p>{message}</p>}
        
              <h2>Profile</h2>
              <label style={{ display: "block", marginBottom: 10 }}>
                      Business name
                      <input
                                  value={profile.name}
                                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                  style={{ display: "block", width: "100%", padding: 8 }}
                                />
              </label>
              <label style={{ display: "block", marginBottom: 10 }}>
                      Contact email
                      <input
                                  value={profile.contactEmail}
                                  onChange={(e) => setProfile({ ...profile, contactEmail: e.target.value })}
                                  style={{ display: "block", width: "100%", padding: 8 }}
                                />
              </label>
              <label style={{ display: "block", marginBottom: 10 }}>
                      Contact phone
                      <input
                                  value={profile.contactPhone}
                                  onChange={(e) => setProfile({ ...profile, contactPhone: e.target.value })}
                                  style={{ display: "block", width: "100%", padding: 8 }}
                                />
              </label>
              <label style={{ display: "block", marginBottom: 10 }}>
                      Address
                      <input
                                  value={profile.address}
                                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                                  style={{ display: "block", width: "100%", padding: 8 }}
                                />
              </label>
              <label style={{ display: "block", marginBottom: 10 }}>
                      City
                      <input
                                  value={profile.city}
                                  onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                                  style={{ display: "block", width: "100%", padding: 8 }}
                                />
              </label>
              <label style={{ display: "block", marginBottom: 10 }}>
                      State
                      <input
                                  value={profile.state}
                                  onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                                  style={{ display: "block", width: "100%", padding: 8 }}
                                />
              </label>
              <label style={{ display: "block", marginBottom: 10 }}>
                      Zip
                      <input
                                  value={profile.zip}
                                  onChange={(e) => setProfile({ ...profile, zip: e.target.value })}
                                  style={{ display: "block", width: "100%", padding: 8 }}
                                />
              </label>
        
              <h2>Branding</h2>
              <label style={{ display: "block", marginBottom: 10 }}>
                      Logo URL
                      <input
                                  value={profile.logoUrl}
                                  onChange={(e) => setProfile({ ...profile, logoUrl: e.target.value })}
                                  style={{ display: "block", width: "100%", padding: 8 }}
                                />
              </label>
              <label style={{ display: "block", marginBottom: 10 }}>
                      Primary color{" "}
                      <input
                                  type="color"
                                  value={profile.primaryColor}
                                  onChange={(e) => setProfile({ ...profile, primaryColor: e.target.value })}
                                />
              </label>
        
              <button disabled={saving} onClick={handleSave} style={{ marginBottom: 30 }}>
                {saving ? "Saving..." : "Save Settings"}
              </button>
        
              <h2>Payments</h2>
          {stripeStatus.connected ? (
                  <div>
                            <p>
                                        Stripe account connected.{" "}
                              {stripeStatus.payoutsEnabled
                                              ? "Payouts are enabled."
                                              : "Additional details are needed before payouts can start."}
                            </p>
                            <button disabled={connecting} onClick={handleConnectStripe}>
                              {connecting ? "Loading..." : "Update Stripe details"}
                            </button>
                  </div>
                ) : (
                  <div>
                            <p>Connect a Stripe account to receive payments directly from your customers.</p>
                            <button disabled={connecting} onClick={handleConnectStripe}>
                              {connecting ? "Redirecting..." : "Connect with Stripe"}
                            </button>
                  </div>
              )}
        </div>
      );
}
