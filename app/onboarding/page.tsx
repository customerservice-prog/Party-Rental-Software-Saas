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

  return (
        <div style={{ maxWidth: 560, margin: "40px auto", padding: "0 20px" }}>
                <h1>Welcome! Let's set up your rental business</h1>
        
              <div style={{ display: "flex", gap: 8, margin: "20px 0" }}>
                {STEPS.map((label, i) => (
                    <div
                                  key={label}
                                  style={{
                                                  flex: 1,
                                                  textAlign: "center",
                                                  padding: 8,
                                                  borderRadius: 6,
                                                  background: i === step ? "#7c3aed" : "#eee",
                                                  color: i === step ? "#fff" : "#333",
                                                  fontSize: 12,
                                  }}
                                >
                      {label}
                    </div>
                  ))}
              </div>
        
          {error && <p style={{ color: "red" }}>{error}</p>}
        
          {step === 0 && (
                  <div>
                            <h2>Business Profile</h2>
                            <input
                                          placeholder="Street address"
                                          value={profile.address}
                                          onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                                          style={{ display: "block", width: "100%", marginBottom: 10, padding: 8 }}
                                        />
                            <input
                                          placeholder="City"
                                          value={profile.city}
                                          onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                                          style={{ display: "block", width: "100%", marginBottom: 10, padding: 8 }}
                                        />
                            <input
                                          placeholder="State"
                                          value={profile.state}
                                          onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                                          style={{ display: "block", width: "100%", marginBottom: 10, padding: 8 }}
                                        />
                            <input
                                          placeholder="Zip"
                                          value={profile.zip}
                                          onChange={(e) => setProfile({ ...profile, zip: e.target.value })}
                                          style={{ display: "block", width: "100%", marginBottom: 10, padding: 8 }}
                                        />
                            <input
                                          placeholder="Contact phone"
                                          value={profile.contactPhone}
                                          onChange={(e) => setProfile({ ...profile, contactPhone: e.target.value })}
                                          style={{ display: "block", width: "100%", marginBottom: 10, padding: 8 }}
                                        />
                            <button disabled={saving} onClick={saveProfileAndContinue}>
                              {saving ? "Saving..." : "Continue"}
                            </button>
                  </div>
              )}
        
          {step === 1 && (
                  <div>
                            <h2>Branding</h2>
                            <input
                                          placeholder="Logo URL (optional)"
                                          value={branding.logoUrl}
                                          onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
                                          style={{ display: "block", width: "100%", marginBottom: 10, padding: 8 }}
                                        />
                            <label style={{ display: "block", marginBottom: 10 }}>
                                        Primary color:{" "}
                                        <input
                                                        type="color"
                                                        value={branding.primaryColor}
                                                        onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                                                      />
                            </label>
                            <button disabled={saving} onClick={saveBrandingAndContinue}>
                              {saving ? "Saving..." : "Continue"}
                            </button>
                  </div>
              )}
        
          {step === 2 && (
                  <div>
                            <h2>Create your first inventory category</h2>
                            <p>e.g. "Bounce Houses", "Tables & Chairs", "Tents"</p>
                            <input
                                          placeholder="Category name"
                                          value={categoryName}
                                          onChange={(e) => setCategoryName(e.target.value)}
                                          style={{ display: "block", width: "100%", marginBottom: 10, padding: 8 }}
                                        />
                            <button disabled={saving} onClick={createCategoryAndContinue}>
                              {saving ? "Saving..." : "Continue"}
                            </button>
                  </div>
              )}
        
          {step === 3 && (
                  <div>
                            <h2>You're all set!</h2>
                            <p>Head to your dashboard to add inventory items and start taking bookings.</p>
                            <button onClick={() => router.push("/dashboard")}>Go to Dashboard</button>
                  </div>
              )}
        </div>
      );
}
