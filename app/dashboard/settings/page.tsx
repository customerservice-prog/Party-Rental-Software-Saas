"use client";

function readImageFile(file: File | undefined | null, onLoaded: (dataUrl: string) => void) {
  if (!file) return;
  if (file.size > 3 * 1024 * 1024) {
    alert("Please choose an image smaller than 3MB.");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => onLoaded(reader.result as string);
  reader.readAsDataURL(file);
}

import { useEffect, useState } from "react";

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type BusinessHour = {
  dayOfWeek: number;
  isClosed: boolean;
  openTime: string;
  closeTime: string;
};

type ClosedDate = {
  id: string;
  date: string;
  note: string | null;
};

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
    contractTerms: "",
  });
  const [site, setSite] = useState({
    tagline: "",
    heroImageUrl: "",
    aboutText: "",
    facebookUrl: "",
    instagramUrl: "",
    showHoursOnSite: true,
  });
  const [hours, setHours] = useState<BusinessHour[]>(
    Array.from({ length: 7 }, (_, i) => ({
      dayOfWeek: i,
      isClosed: false,
      openTime: "09:00",
      closeTime: "17:00",
    }))
  );
  const [closedDates, setClosedDates] = useState<ClosedDate[]>([]);
  const [newClosedDate, setNewClosedDate] = useState("");
  const [newClosedNote, setNewClosedNote] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSite, setSavingSite] = useState(false);
  const [savingHours, setSavingHours] = useState(false);
  const [message, setMessage] = useState("");
  const [siteMessage, setSiteMessage] = useState("");
  const [hoursMessage, setHoursMessage] = useState("");
  const [stripeStatus, setStripeStatus] = useState<{
    connected: boolean;
    payoutsEnabled?: boolean;
    detailsSubmitted?: boolean;
  }>({ connected: false });
  const [connecting, setConnecting] = useState(false);
  const [orgSlug, setOrgSlug] = useState("");
  const [pricing, setPricing] = useState({
    flatDeliveryFee: "0",
    depositType: "percentage",
    depositAmount: "25",
    depositActive: true,
    taxRate: "0",
  });
  const [pricingMessage, setPricingMessage] = useState("");
  const [savingPricing, setSavingPricing] = useState(false);

  useEffect(() => {
    async function load() {
      const [orgRes, stripeRes, hoursRes, closedRes, depositRes] = await Promise.all([
        fetch("/api/organizations"),
        fetch("/api/stripe/connect"),
        fetch("/api/business-hours"),
        fetch("/api/closed-dates"),
        fetch("/api/deposit-rules"),
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
          contractTerms: organization.contractTerms || "",
        });
        setSite({
          tagline: organization.tagline || "",
          heroImageUrl: organization.heroImageUrl || "",
          aboutText: organization.aboutText || "",
          facebookUrl: organization.facebookUrl || "",
          instagramUrl: organization.instagramUrl || "",
          showHoursOnSite:
            organization.showHoursOnSite === undefined ? true : organization.showHoursOnSite,
        });
        setOrgSlug(organization.slug || "");
        setPricing((prev) => ({
          ...prev,
          flatDeliveryFee: String(organization.flatDeliveryFee || 0),
          taxRate: String(organization.taxRate || 0),
        }));
      }
      if (stripeRes.ok) {
        setStripeStatus(await stripeRes.json());
      }
      if (hoursRes.ok) {
        const { businessHours } = await hoursRes.json();
        setHours((prev) =>
          prev.map((row) => {
            const existing = businessHours.find((h: any) => h.dayOfWeek === row.dayOfWeek);
            return existing
              ? {
                  dayOfWeek: row.dayOfWeek,
                  isClosed: existing.isClosed,
                  openTime: existing.openTime || "09:00",
                  closeTime: existing.closeTime || "17:00",
                }
              : row;
          })
        );
      }
      if (closedRes.ok) {
        const { closedDates: rows } = await closedRes.json();
        setClosedDates(rows);
      }
      if (depositRes.ok) {
        const data = await depositRes.json();
        if (data.rule) {
          setPricing((prev) => ({
            ...prev,
            depositType: data.rule.type,
            depositAmount: String(data.rule.amount),
            depositActive: data.rule.isActive,
          }));
        }
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

  async function handleSaveSite() {
    setSavingSite(true);
    setSiteMessage("");
    try {
      const res = await fetch("/api/organizations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(site),
      });
      if (!res.ok) throw new Error("Failed to save website settings");
      setSiteMessage("Website updated. View it live using the link above.");
    } catch (e: any) {
      setSiteMessage(e.message || "Something went wrong");
    } finally {
      setSavingSite(false);
    }
  }

  async function handleSavePricing() {
    setSavingPricing(true);
    setPricingMessage("");
    try {
      const fee = parseFloat(pricing.flatDeliveryFee) || 0;
      const depositAmt = parseFloat(pricing.depositAmount) || 0;
      const taxRateValue = Math.max(0, parseFloat(pricing.taxRate) || 0);
      const [orgRes, depositRes] = await Promise.all([
        fetch("/api/organizations", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ flatDeliveryFee: fee, taxRate: taxRateValue }),
        }),
        fetch("/api/deposit-rules", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: pricing.depositType,
            amount: depositAmt,
            isActive: pricing.depositActive,
          }),
        }),
      ]);
      if (!orgRes.ok || !depositRes.ok) throw new Error("Failed to save pricing settings");
      setPricingMessage("Delivery fee, tax rate, and deposit rule saved.");
    } catch (e: any) {
      setPricingMessage(e.message || "Something went wrong");
    } finally {
      setSavingPricing(false);
    }
  }

  async function handleSaveHours() {
    setSavingHours(true);
    setHoursMessage("");
    try {
      await Promise.all(
        hours.map((row) =>
          fetch("/api/business-hours", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(row),
          })
        )
      );
      setHoursMessage("Business hours saved.");
    } catch (e: any) {
      setHoursMessage("Something went wrong saving hours.");
    } finally {
      setSavingHours(false);
    }
  }

  async function handleAddClosedDate() {
    if (!newClosedDate) return;
    const res = await fetch("/api/closed-dates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: newClosedDate, note: newClosedNote || undefined }),
    });
    if (res.ok) {
      const { closedDate } = await res.json();
      setClosedDates((prev) =>
        [...prev, closedDate].sort((a, b) => (a.date > b.date ? 1 : -1))
      );
      setNewClosedDate("");
      setNewClosedNote("");
    }
  }

  async function handleRemoveClosedDate(id: string) {
    const res = await fetch("/api/closed-dates?id=" + id, { method: "DELETE" });
    if (res.ok) {
      setClosedDates((prev) => prev.filter((d) => d.id !== id));
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
    "bg-indigo-600 text-white rounded px-4 py-2 font-medium disabled:opacity-50 hover:bg-indigo-700";
  const sectionClass = "bg-white border rounded-lg p-6 mb-8";
  const sectionTitleClass = "text-lg font-semibold mb-4";

  return (
    <div className="max-w-3xl p-6">
      <h1 className="text-2xl font-bold mb-6">Business Settings</h1>

      <div className={sectionClass}>
        <h2 className={sectionTitleClass}>Profile</h2>
        {message && <p className="mb-4 text-sm text-green-700">{message}</p>}
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
        <div className="grid grid-cols-3 gap-3">
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
        </div>

        <h3 className="text-sm font-semibold uppercase text-gray-500 mt-6 mb-3">Branding</h3>
        <label className={labelClass}>
          <span className={labelTextClass}>Logo URL</span>
          <input
            value={profile.logoUrl}
            onChange={(e) => setProfile({ ...profile, logoUrl: e.target.value })}
            className={inputClass}
          />
          <input
            type="file"
            accept="image/*"
            className="mt-1 text-xs"
            onChange={(e) => readImageFile(e.target.files?.[0], (dataUrl) => setProfile({ ...profile, logoUrl: dataUrl }))}
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

        <label className={labelClass}>
          <span className={labelTextClass}>Rental agreement / contract terms</span>
          <textarea
            value={profile.contractTerms}
            onChange={(e) => setProfile({ ...profile, contractTerms: e.target.value })}
            rows={5}
            placeholder="Shown to customers at checkout when they sign the rental contract. Leave blank to use the default terms."
            className={inputClass}
          />
        </label>

        <button disabled={saving} onClick={handleSave} className={buttonClass}>
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>

      <div className={sectionClass}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={sectionTitleClass + " mb-0"}>Website / Site Builder</h2>
          <a
            href={orgSlug ? "/t/" + orgSlug + "/book" : "/book"}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-indigo-600 hover:underline"
          >
            View live site &rarr;
          </a>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Customize the public booking page your customers see, similar to how other rental
          platforms let you build out your storefront.
        </p>
        {siteMessage && <p className="mb-4 text-sm text-green-700">{siteMessage}</p>}
        <label className={labelClass}>
          <span className={labelTextClass}>Tagline</span>
          <input
            value={site.tagline}
            onChange={(e) => setSite({ ...site, tagline: e.target.value })}
            placeholder="e.g. Central New York's favorite party & event rentals"
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          <span className={labelTextClass}>Hero image URL</span>
          <input
            value={site.heroImageUrl}
            onChange={(e) => setSite({ ...site, heroImageUrl: e.target.value })}
            placeholder="https://..."
            className={inputClass}
          />
          <input
            type="file"
            accept="image/*"
            className="mt-1 text-xs"
            onChange={(e) => readImageFile(e.target.files?.[0], (dataUrl) => setSite({ ...site, heroImageUrl: dataUrl }))}
          />
        </label>
        <label className={labelClass}>
          <span className={labelTextClass}>About your business</span>
          <textarea
            value={site.aboutText}
            onChange={(e) => setSite({ ...site, aboutText: e.target.value })}
            rows={4}
            className={inputClass}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className={labelClass}>
            <span className={labelTextClass}>Facebook URL</span>
            <input
              value={site.facebookUrl}
              onChange={(e) => setSite({ ...site, facebookUrl: e.target.value })}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            <span className={labelTextClass}>Instagram URL</span>
            <input
              value={site.instagramUrl}
              onChange={(e) => setSite({ ...site, instagramUrl: e.target.value })}
              className={inputClass}
            />
          </label>
        </div>
        <label className="flex items-center gap-2 mb-6">
          <input
            type="checkbox"
            checked={site.showHoursOnSite}
            onChange={(e) => setSite({ ...site, showHoursOnSite: e.target.checked })}
          />
          <span className="text-sm">Show business hours on public booking page</span>
        </label>
        <button disabled={savingSite} onClick={handleSaveSite} className={buttonClass}>
          {savingSite ? "Saving..." : "Save Website"}
        </button>
      </div>

      <div className={sectionClass}>
        <h2 className={sectionTitleClass}>Delivery, Deposit &amp; Tax</h2>
        {pricingMessage && <p className="mb-4 text-sm text-green-700">{pricingMessage}</p>}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <label className={labelClass}>
            <span className={labelTextClass}>Flat delivery fee ($)</span>
            <input
              value={pricing.flatDeliveryFee}
              onChange={(e) => setPricing({ ...pricing, flatDeliveryFee: e.target.value })}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            <span className={labelTextClass}>Deposit type</span>
            <select
              value={pricing.depositType}
              onChange={(e) => setPricing({ ...pricing, depositType: e.target.value })}
              className={inputClass}
            >
              <option value="percentage">Percentage of total</option>
              <option value="flat">Flat amount</option>
            </select>
          </label>
          <label className={labelClass}>
            <span className={labelTextClass}>
              Deposit amount {pricing.depositType === "percentage" ? "(%)" : "($)"}
            </span>
            <input
              value={pricing.depositAmount}
              onChange={(e) => setPricing({ ...pricing, depositAmount: e.target.value })}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            <span className={labelTextClass}>Sales tax rate (%)</span>
            <input
              value={pricing.taxRate}
              onChange={(e) => setPricing({ ...pricing, taxRate: e.target.value })}
              placeholder="e.g. 8.25"
              className={inputClass}
            />
          </label>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Tax is calculated on the rental subtotal and add-ons (not the delivery fee) and shown
          as a separate line item at checkout and on orders. Leave at 0 if your state doesn't
          require you to charge sales tax on rentals, or if you handle tax outside this system.
        </p>
        <label className="flex items-center gap-2 mb-6">
          <input
            type="checkbox"
            checked={pricing.depositActive}
            onChange={(e) => setPricing({ ...pricing, depositActive: e.target.checked })}
          />
          <span className="text-sm">
            Require a deposit at booking (if off, customers pay the full amount online)
          </span>
        </label>
        <button disabled={savingPricing} onClick={handleSavePricing} className={buttonClass}>
          {savingPricing ? "Saving..." : "Save Delivery, Deposit & Tax"}
        </button>
      </div>

      <div className={sectionClass}>
        <h2 className={sectionTitleClass}>Business Hours</h2>
        {hoursMessage && <p className="mb-4 text-sm text-green-700">{hoursMessage}</p>}
        <div className="space-y-2 mb-4">
          {hours.map((row, idx) => (
            <div key={row.dayOfWeek} className="flex items-center gap-3">
              <span className="w-24 text-sm font-medium">{DAY_LABELS[row.dayOfWeek]}</span>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={row.isClosed}
                  onChange={(e) => {
                    const next = [...hours];
                    next[idx] = { ...row, isClosed: e.target.checked };
                    setHours(next);
                  }}
                />
                Closed
              </label>
              {!row.isClosed && (
                <>
                  <input
                    type="time"
                    value={row.openTime}
                    onChange={(e) => {
                      const next = [...hours];
                      next[idx] = { ...row, openTime: e.target.value };
                      setHours(next);
                    }}
                    className="border rounded p-1 text-sm"
                  />
                  <span className="text-sm text-gray-400">to</span>
                  <input
                    type="time"
                    value={row.closeTime}
                    onChange={(e) => {
                      const next = [...hours];
                      next[idx] = { ...row, closeTime: e.target.value };
                      setHours(next);
                    }}
                    className="border rounded p-1 text-sm"
                  />
                </>
              )}
            </div>
          ))}
        </div>
        <button disabled={savingHours} onClick={handleSaveHours} className={buttonClass}>
          {savingHours ? "Saving..." : "Save Hours"}
        </button>
      </div>

      <div className={sectionClass}>
        <h2 className={sectionTitleClass}>Closed Dates</h2>
        <p className="text-sm text-gray-500 mb-4">
          Add specific holidays or days off that override your regular business hours.
        </p>
        <ul className="mb-4 divide-y">
          {closedDates.length === 0 && (
            <li className="text-sm text-gray-500 py-2">No closed dates added yet.</li>
          )}
          {closedDates.map((d) => (
            <li key={d.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                {new Date(d.date).toLocaleDateString()}
                {d.note ? " – " + d.note : ""}
              </span>
              <button
                onClick={() => handleRemoveClosedDate(d.id)}
                className="text-red-600 hover:underline"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <div className="flex items-end gap-3">
          <label className="block">
            <span className={labelTextClass}>Date</span>
            <input
              type="date"
              value={newClosedDate}
              onChange={(e) => setNewClosedDate(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block flex-1">
            <span className={labelTextClass}>Note (optional)</span>
            <input
              value={newClosedNote}
              onChange={(e) => setNewClosedNote(e.target.value)}
              placeholder="e.g. Thanksgiving"
              className={inputClass}
            />
          </label>
          <button onClick={handleAddClosedDate} className={buttonClass}>
            Add
          </button>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={sectionTitleClass}>Payments</h2>
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
    </div>
  );
}
