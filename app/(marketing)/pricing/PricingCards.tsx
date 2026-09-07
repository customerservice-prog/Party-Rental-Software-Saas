"use client";

import { useState, createElement as h } from "react";
import Link from "next/link";
import { PLANS, PlanDefinition, BillingInterval } from "@/lib/plans";

function priceLabel(plan: PlanDefinition, interval: BillingInterval): string {
    if (plan.isCustomPricing) return "Custom";
    const price = interval === "monthly" ? plan.monthlyPrice : plan.annualMonthlyPrice;
    return "$" + price;
}

function toggleButton(label: string, active: boolean, onClick: () => void) {
    const cls =
          "px-5 py-2 rounded-full text-sm font-semibold border transition " +
          (active
                 ? "bg-brand-600 text-white border-brand-600"
                 : "bg-white text-gray-700 border-gray-300");
    return h("button", { type: "button", onClick, className: cls, key: label }, label);
}

function planCard(plan: PlanDefinition, interval: BillingInterval) {
    const cardCls =
          "rounded-2xl border p-8 flex flex-col bg-white " +
          (plan.highlighted
                 ? "border-brand-600 shadow-xl ring-2 ring-brand-600 md:-translate-y-2"
                 : "border-gray-200");

  const badge = plan.highlighted
      ? h(
                "div",
        { className: "text-xs font-bold tracking-wide text-brand-600 uppercase mb-2" },
                "Most Popular"
              )
        : h("div", { className: "mb-2 h-4" });

  const billedLine =
        interval === "annual" && plan.annualBilledTotal !== null
        ? h(
                    "p",
          { className: "text-xs text-gray-500 mt-1" },
                    "Billed $" + plan.annualBilledTotal + " annually"
                  )
          : h("p", { className: "text-xs text-gray-500 mt-1" }, "Billed monthly");

  const ctaCls =
        "mt-6 block text-center px-6 py-3 rounded font-semibold transition " +
        (plan.highlighted
               ? "bg-brand-600 text-white hover:bg-brand-700"
               : "bg-gray-100 text-gray-900 hover:bg-gray-200");

  const list = h(
        "ul",
    { className: "mt-6 space-y-2 text-sm text-gray-700" },
        plan.includedSummary.map((line) =>
                h(
                          "li",
                  { key: line, className: "flex items-start gap-2" },
                          h("span", { className: "text-brand-600" }, "\u2713"),
                          h("span", {}, line)
                        )
                                     )
      );

  return h(
        "div",
    { key: plan.code, className: cardCls },
        badge,
        h("div", { className: "text-xl font-bold text-gray-900" }, plan.name),
        h("p", { className: "mt-2 text-sm text-gray-600 min-h-[40px]" }, plan.tagline),
        h(
                "div",
          { className: "mt-4 flex items-baseline gap-1" },
                h("span", { className: "text-4xl font-bold text-gray-900" }, priceLabel(plan, interval)),
                h("span", { className: "text-gray-500 text-sm" }, "/month")
              ),
        billedLine,
        h(Link, { href: "/signup", className: ctaCls }, plan.ctaLabel),
        list
      );
}

export default function PricingCards() {
    const [interval, setBillingInterval] = useState<BillingInterval>("monthly");
    const selfServePlans = PLANS.filter((p) => !p.isCustomPricing);

  return h(
        "div",
    {},
        h(
                "div",
          { className: "flex items-center justify-center gap-3" },
                toggleButton("Monthly", interval === "monthly", () => setBillingInterval("monthly")),
                toggleButton("Yearly \u2014 Save ~20%", interval === "annual", () =>
                          setBillingInterval("annual")
                                   )
              ),
        h(
                "div",
          { className: "mt-10 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto items-start" },
                selfServePlans.map((plan) => planCard(plan, interval))
              )
      );
}
