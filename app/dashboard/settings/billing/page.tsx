"use client";

import { createElement as h, useEffect, useState } from "react";
import Link from "next/link";

type BillingData = {
  organization: { name: string; status: string; trialEndsAt: string | null };
  subscription: {
  status: string;
  planTier: string;
  billingInterval: string;
  currentPeriodEnd: string | null;
  pastDueSince: string | null;
  foundingCustomer: boolean;
  foundingPriceLockedUntil: string | null;
  } | null;
  billing: {
  blocked: boolean;
  code: string;
  message: string | null;
  trialDaysLeft: number | null;
  subscriptionStatus: string | null;
  planTier: string | null;
  };
  plan: {
  code: string;
  name: string;
  tagline: string;
  isCustomPricing: boolean;
  monthlyPrice: number | null;
  annualMonthlyPrice: number | null;
  annualBilledTotal: number | null;
  includedSummary: string[];
  };
  seats: {
  office: { current: number; limit: number | null };
  crew: { current: number; limit: number | null };
  };
};

const STATUS_LABELS: Record<string, string> = {
  trialing: "Free Trial",
  active: "Active",
  past_due: "Past Due",
  trial_ended: "Trial Ended",
  unpaid: "Unpaid",
  canceled: "Canceled",
};

const STATUS_COLORS: Record<string, string> = {
  trialing: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800",
  past_due: "bg-yellow-100 text-yellow-800",
  trial_ended: "bg-red-100 text-red-800",
  unpaid: "bg-red-100 text-red-800",
  canceled: "bg-gray-200 text-gray-700",
};

const CHECKOUT_PLANS: { code: string; name: string; monthlyPrice: number; annualMonthlyPrice: number }[] = [
  { code: "starter", name: "Starter", monthlyPrice: 49, annualMonthlyPrice: 39 },
  { code: "growth", name: "Growth", monthlyPrice: 99, annualMonthlyPrice: 79 },
  { code: "pro", name: "Pro", monthlyPrice: 199, annualMonthlyPrice: 159 },
  ];

function formatDate(value: string | null): string {
  if (!value) return "Not available yet";
  const d = new Date(value);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function seatBar(label: string, current: number, limit: number | null) {
  const pct = limit ? Math.min(100, Math.round((current / limit) * 100)) : 0;
  return h(
    "div",
    { className: "mb-4" },
    h(
      "div",
      { className: "flex items-center justify-between text-sm mb-1" },
      h("span", { className: "font-medium text-gray-700" }, label),
      h(
        "span",
        { className: "text-gray-500" },
        limit === null ? current + " used - unlimited" : current + " / " + limit + " used"
        )
      ),
    limit === null
    ? null
    : h(
      "div",
      { className: "w-full h-2 bg-gray-100 rounded-full overflow-hidden" },
      h("div", { className: "h-full bg-indigo-600", style: { width: pct + "%" } })
      )
    );
}

function summaryItem(text: string) {
  return h(
    "li",
    { key: text, className: "flex items-start gap-2 text-sm text-gray-700" },
    h("span", { className: "text-indigo-600" }, "\u2713"),
    h("span", null, text)
    );
}

export default function BillingPage() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [billingInterval, setBillingInterval] = useState("monthly");

useEffect(() => {
  async function load() {
    try {
      const res = await fetch("/api/billing");
      if (!res.ok) throw new Error("Failed to load billing information");
      setData(await res.json());
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }
  load();
}, []);

async function startCheckout(planCode: string) {
  setActionError("");
  setActionLoading(planCode);
  try {
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planCode, interval: billingInterval }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Unable to start checkout");
    if (json.url) window.location.href = json.url;
  } catch (e: any) {
    setActionError(e.message || "Something went wrong");
    setActionLoading("");
  }
}

async function openBillingPortal() {
  setActionError("");
  setActionLoading("portal");
  try {
    const res = await fetch("/api/billing/portal", { method: "POST" });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Unable to open billing portal");
    if (json.url) window.location.href = json.url;
  } catch (e: any) {
    setActionError(e.message || "Something went wrong");
    setActionLoading("");
  }
}
  function planButton(p: { code: string; name: string; monthlyPrice: number; annualMonthlyPrice: number }) {
    const price = billingInterval === "annual" ? p.annualMonthlyPrice : p.monthlyPrice;
    const isCurrent = plan.code === p.code;
    return h(
      "button",
      {
        key: p.code,
        type: "button",
        disabled: isCurrent || actionLoading === p.code,
        onClick: () => startCheckout(p.code),
        className:
          "flex-1 min-w-[150px] rounded-lg border-2 px-4 py-4 text-left transition " +
          (isCurrent ? "border-indigo-600 bg-indigo-50 cursor-default" : "border-gray-200 hover:border-indigo-400"),
      },
      h("div", { className: "font-semibold text-gray-900" }, p.name),
      h("div", { className: "text-sm text-gray-600" }, "$" + price + "/mo"),
      isCurrent
      ? h("div", { className: "text-xs text-indigo-600 mt-1 font-medium" }, "Current plan")
      : h("div", { className: "text-xs text-gray-500 mt-1" }, actionLoading === p.code ? "Redirecting..." : "Choose plan")
      );
  }

if (loading) {
  return h("div", { className: "p-6" }, "Loading billing information...");
}

if (error || !data) {
  return h("div", { className: "p-6 text-red-600" }, error || "Unable to load billing information.");
}

const { subscription, billing, plan, seats } = data;
  const statusKey = (billing.subscriptionStatus || "trialing").toLowerCase();
  const statusLabel = STATUS_LABELS[statusKey] || statusKey;
  const statusColor = STATUS_COLORS[statusKey] || "bg-gray-100 text-gray-700";

const sectionClass = "bg-white border rounded-lg p-6 mb-8";
  const sectionTitleClass = "text-lg font-semibold mb-4";

return h(
  "div",
  { className: "max-w-3xl p-6" },
  h("h1", { className: "text-2xl font-bold mb-6" }, "Plan & Billing"),

  billing.message
  ? h(
    "div",
    {
      className:
        "mb-6 rounded-lg border px-4 py-3 text-sm " +
        (billing.blocked
         ? "bg-red-50 border-red-200 text-red-700"
         : "bg-yellow-50 border-yellow-200 text-yellow-800"),
    },
    billing.message
    )
  : null,

  h(
    "div",
    { className: sectionClass },
    h(
      "div",
      { className: "flex items-center justify-between mb-2" },
      h("h2", { className: sectionTitleClass + " mb-0" }, "Current Plan"),
      h("span", { className: "text-xs font-semibold px-2.5 py-1 rounded-full " + statusColor }, statusLabel)
      ),
    h("p", { className: "text-xl font-bold text-gray-900" }, plan.name),
    h("p", { className: "text-sm text-gray-600 mb-3" }, plan.tagline),
    plan.isCustomPricing
    ? h("p", { className: "text-sm text-gray-700 mb-3" }, "Custom pricing - contact us for details.")
    : h(
      "p",
      { className: "text-sm text-gray-700 mb-3" },
      "$" +
      plan.monthlyPrice +
      "/month" +
      (subscription && subscription.billingInterval === "annual"
       ? " (billed annually at $" + plan.annualBilledTotal + "/year)"
       : "")
      ),

    subscription && subscription.foundingCustomer
    ? h(
      "span",
      { className: "inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 mb-3" },
      "Founding Customer - price locked" +
      (subscription.foundingPriceLockedUntil
       ? " until " + formatDate(subscription.foundingPriceLockedUntil)
       : "")
      )
    : null,
    billing.trialDaysLeft !== null && billing.trialDaysLeft >= 0
    ? h(
      "p",
      { className: "text-sm text-gray-600 mb-3" },
      billing.trialDaysLeft === 0
      ? "Your free trial ends today."
      : "Your free trial ends in " + billing.trialDaysLeft + " day" + (billing.trialDaysLeft === 1 ? "" : "s") + "."
      )
    : null,
    h(
      "p",
      { className: "text-sm text-gray-600" },
      "Next billing date: " + (subscription ? formatDate(subscription.currentPeriodEnd) : "Not available yet")
      ),

    h(
      "div",
      { className: "mt-4 flex items-center gap-3" },
      h(Link, { href: "/pricing", className: "text-indigo-600 font-medium hover:underline text-sm" }, "View full plan comparison ->"),
      subscription && subscription.status && subscription.status !== "canceled"
      ? h(
        "button",
        {
          type: "button",
          onClick: openBillingPortal,
          disabled: actionLoading === "portal",
          className: "text-sm font-medium text-gray-700 border border-gray-300 rounded px-3 py-1.5 hover:bg-gray-50",
        },
        actionLoading === "portal" ? "Opening..." : "Manage billing"
        )
      : null
      )
    ),

  h(
    "div",
    { className: sectionClass },
    h(
      "div",
      { className: "flex items-center justify-between mb-4" },
      h("h2", { className: sectionTitleClass + " mb-0" }, "Change Plan"),
      h(
        "div",
        { className: "flex items-center gap-1 bg-gray-100 rounded-full p-1 text-xs font-medium" },
        h(
          "button",
          {
            type: "button",
            onClick: () => setBillingInterval("monthly"),
            className: "px-3 py-1 rounded-full " + (billingInterval === "monthly" ? "bg-white shadow text-gray-900" : "text-gray-500"),
          },
          "Monthly"
          ),
        h(
          "button",
          {
            type: "button",
            onClick: () => setBillingInterval("annual"),
            className: "px-3 py-1 rounded-full " + (billingInterval === "annual" ? "bg-white shadow text-gray-900" : "text-gray-500"),
          },
          "Annual"
          )
        )
      ),
    actionError ? h("p", { className: "text-sm text-red-600 mb-3" }, actionError) : null,
    h("div", { className: "flex flex-wrap gap-3" }, CHECKOUT_PLANS.map(planButton)),
    h(
      "p",
      { className: "text-xs text-gray-500 mt-3" },
      "Enterprise plans are custom. ",
      h(Link, { href: "/contact", className: "text-indigo-600 hover:underline" }, "Contact us"),
      " to discuss your needs."
      )
    ),

  h(
    "div",
    { className: sectionClass },
    h("h2", { className: sectionTitleClass }, "Team Usage"),
    seatBar("Full office users", seats.office.current, seats.office.limit),
    seatBar("Crew / driver logins", seats.crew.current, seats.crew.limit),
    h("p", { className: "text-xs text-gray-500" }, "Need more seats? Upgrading your plan raises these limits.")
    ),

  h(
    "div",
    { className: sectionClass },
    h("h2", { className: sectionTitleClass }, "What's included"),
    h("ul", { className: "space-y-2" }, plan.includedSummary.map(summaryItem))
    ),

  h(
    "div",
    { className: sectionClass },
    h("h2", { className: sectionTitleClass }, "Need help with billing?"),
    h(
      "p",
      { className: "text-sm text-gray-600 mb-3" },
      "Use \"Manage billing\" above to update your payment method, view invoices, or cancel your subscription. For anything else, we're happy to help."
      ),
    h(Link, { href: "/contact", className: "text-indigo-600 font-medium hover:underline text-sm" }, "Contact us ->")
    )
  );
}
