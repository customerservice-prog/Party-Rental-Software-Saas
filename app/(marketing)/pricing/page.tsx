import Link from "next/link";
import { createElement as h } from "react";
import type { Metadata } from "next";
import { pageMetadata, SITE_URL } from "@/lib/seo";
import { PLANS, getPlan, FOUNDING_OFFER, TRIAL_DAYS } from "@/lib/plans";
import PricingCards from "./PricingCards";

export const metadata: Metadata = pageMetadata({
    title: "Pricing",
    description:
          "Compare Party Rental CRM plans for managing bookings, inventory, customers, deliveries, staff and rental operations.",
    path: "/pricing",
});

const enterprise = getPlan("enterprise");

const REASSURANCE_ITEMS = [
    TRIAL_DAYS + "-day free trial",
    "No credit card required",
    "No setup fee",
    "Unlimited inventory & orders",
    "0% booking commission",
    "Cancel anytime",
  ];

type Cell = boolean | string;
type FeatureRow = { label: string; starter: Cell; growth: Cell; pro: Cell; enterprise: Cell };
type FeatureSection = { category: string; rows: FeatureRow[] };

const FEATURE_SECTIONS: FeatureSection[] = [
  {
        category: "Team size",
        rows: [
          { label: "Full office users", starter: "1", growth: "3", pro: "10", enterprise: "Custom" },
          { label: "Crew / driver users", starter: "Up to 3", growth: "Up to 15", pro: "Unlimited", enterprise: "Custom" },
          { label: "Business locations", starter: "1", growth: "1", pro: "1", enterprise: "Custom" },
              ],
  },
  {
        category: "Core rental management",
        rows: [
          { label: "Unlimited inventory, orders & customers", starter: true, growth: true, pro: true, enterprise: true },
          { label: "Online booking storefront", starter: true, growth: true, pro: true, enterprise: true },
          { label: "Order & quote management", starter: true, growth: true, pro: true, enterprise: true },
          { label: "Inventory availability calendar", starter: true, growth: true, pro: true, enterprise: true },
          { label: "Scheduling calendar", starter: true, growth: true, pro: true, enterprise: true },
              ],
  },
  {
        category: "Financial",
        rows: [
          { label: "Contracts", starter: true, growth: true, pro: true, enterprise: true },
          { label: "Deposits", starter: true, growth: true, pro: true, enterprise: true },
          { label: "Coupons & discounts", starter: true, growth: true, pro: true, enterprise: true },
          { label: "Payment & balance tracking", starter: true, growth: true, pro: true, enterprise: true },
              ],
  },
  {
        category: "Operations",
        rows: [
          { label: "Delivery scheduling & driver dispatch", starter: false, growth: true, pro: true, enterprise: true },
          { label: "Driver runs & route management", starter: false, growth: true, pro: true, enterprise: true },
          { label: "Warehouse pull lists & packing workflow", starter: false, growth: true, pro: true, enterprise: true },
              ],
  },
  {
        category: "Team & security",
        rows: [
          { label: "Staff roles & granular permissions", starter: false, growth: true, pro: true, enterprise: true },
          { label: "Do Not Rent controls", starter: false, growth: true, pro: true, enterprise: true },
          { label: "Activity/audit history", starter: false, growth: true, pro: true, enterprise: true },
              ],
  },
  {
        category: "Reporting",
        rows: [
          { label: "Basic reporting", starter: true, growth: true, pro: true, enterprise: true },
          { label: "Advanced reporting & analytics", starter: false, growth: true, pro: true, enterprise: true },
              ],
  },
  {
        category: "Support",
        rows: [
          { label: "Support level", starter: "Email", growth: "Priority", pro: "Priority", enterprise: "Priority + dedicated" },
              ],
  },
  ];

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
        q: "Do you charge per order or per inventory item?",
        a: "No. Inventory, orders and customers are unlimited on every paid plan. Plans are priced by team size, not by how much business you do.",
  },
  {
        q: "Do you take a percentage of my bookings?",
        a: "No. Party Rental CRM does not charge a percentage-based commission on your rental bookings. If you connect a payment processor to accept customer payments, standard processing fees may apply separately.",
  },
  {
        q: "Is a credit card required for the free trial?",
        a: "No. You can start your " + TRIAL_DAYS + "-day free trial without entering a credit card.",
  },
  {
        q: "Can I cancel anytime?",
        a: "Yes. There is no long-term contract requirement.",
  },
  {
        q: "Can I change plans later?",
        a: "Yes. You can move to a different plan as your team grows. Contact us and we can help you switch.",
  },
  {
        q: "What happens when my trial ends?",
        a: "Your data is never deleted automatically. If a plan is not active when your trial ends, dashboard access is paused until a plan is selected, and your existing data stays intact.",
  },
  {
        q: "Are payment processing fees included in the price?",
        a: "No. Your plan price does not include third-party payment processing fees. Those are set by the payment processor and apply separately if you accept online payments.",
  },
  {
        q: "What counts as a full office user?",
        a: "A full office user is a login for an owner or staff member who accesses the dashboard: orders, customers, reports, settings, and more.",
  },
  {
        q: "What counts as a crew or driver user?",
        a: "Crew and driver logins use a separate, simpler PIN-based login built for delivery and warehouse staff, and are counted separately from full office users.",
  },
  {
        q: "Do you help with data migration?",
        a: "For larger accounts we can discuss migration assistance as part of an Enterprise plan. Contact us to talk through what you need.",
  },
  {
        q: "Is annual billing charged monthly or all at once?",
        a: "Annual billing is charged as a single upfront annual payment at the discounted rate shown when you select Yearly.",
  },
  {
        q: "What is the Founding Customer offer?",
        a:
                "It locks in everything currently released on Party Rental CRM for $" +
                FOUNDING_OFFER.monthlyPrice +
                "/month, held for " +
                FOUNDING_OFFER.priceLockMonths +
                " months, for a limited number of qualifying rental companies. It does not include features released after you join beyond what your plan normally covers.",
  },
  {
        q: "What happens after the Founding Customer price lock ends?",
        a: "We will communicate the applicable pricing to you before the locked period ends. We have not set that future price yet.",
  },
  ];

function cell(value: Cell) {
    if (value === true) {
          return h("td", { className: "px-4 py-3 text-center text-brand-600 font-semibold" }, "\u2713");
    }
    if (value === false) {
          return h("td", { className: "px-4 py-3 text-center text-gray-300" }, "\u2014");
    }
    return h("td", { className: "px-4 py-3 text-center text-gray-700 text-sm" }, value);
}

function categoryRow(label: string) {
    return h(
          "tr",
      { key: "cat-" + label, className: "bg-gray-50" },
          h(
                  "td",
            { colSpan: 5, className: "px-4 py-2 text-xs font-bold uppercase tracking-wide text-gray-500" },
                  label
                )
        );
}

function featureRow(row: FeatureRow) {
    return h(
          "tr",
      { key: row.label, className: "border-t border-gray-100" },
          h("td", { className: "px-4 py-3 text-sm text-gray-800" }, row.label),
          cell(row.starter),
          cell(row.growth),
          cell(row.pro),
          cell(row.enterprise)
        );
}

function buildTable() {
    const rows: ReturnType<typeof h>[] = [];
    FEATURE_SECTIONS.forEach((section) => {
          rows.push(categoryRow(section.category));
          section.rows.forEach((row) => rows.push(featureRow(row)));
    });

  return h(
        "div",
    { className: "overflow-x-auto mt-8" },
        h(
                "table",
          { className: "w-full min-w-[640px] border border-gray-200 rounded-xl overflow-hidden" },
                h(
                          "thead",
                  {},
                          h(
                                      "tr",
                            { className: "bg-gray-900 text-white" },
                                      h("th", { className: "px-4 py-3 text-left text-sm font-semibold" }, "Feature"),
                                      h("th", { className: "px-4 py-3 text-sm font-semibold" }, "Starter"),
                                      h("th", { className: "px-4 py-3 text-sm font-semibold" }, "Growth"),
                                      h("th", { className: "px-4 py-3 text-sm font-semibold" }, "Pro"),
                                      h("th", { className: "px-4 py-3 text-sm font-semibold" }, "Enterprise")
                                    )
                        ),
                h("tbody", {}, rows)
              )
      );
}

function faqItem(item: { q: string; a: string }) {
    return h(
          "details",
      { key: item.q, className: "border-b border-gray-200 py-4 group" },
          h(
                  "summary",
            { className: "cursor-pointer font-semibold text-gray-900 list-none flex justify-between items-center gap-4" },
                  h("span", {}, item.q),
                  h("span", { className: "text-gray-400 group-open:rotate-45 transition shrink-0" }, "+")
                ),
          h("p", { className: "mt-2 text-sm text-gray-600" }, item.a)
        );
}

export default function PricingPage() {
    const structuredData = {
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Party Rental CRM",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          offers: PLANS.filter((p) => !p.isCustomPricing).map((p) => ({
                  "@type": "Offer",
                  name: p.name,
                  price: String(p.monthlyPrice),
                  priceCurrency: "USD",
                  url: SITE_URL + "/pricing",
          })),
    };

  return h(
        "div",
    { className: "max-w-6xl mx-auto px-4 py-20" },
        h("script", {
                type: "application/ld+json",
                dangerouslySetInnerHTML: { __html: JSON.stringify(structuredData) },
        }),
        h(
                "div",
          { className: "text-center max-w-3xl mx-auto" },
                h("h1", { className: "text-4xl md:text-5xl font-bold text-gray-900" }, "Simple pricing for rental companies"),
                h(
                          "p",
                  { className: "mt-4 text-lg text-gray-600" },
                          "Unlimited inventory. Unlimited orders. Unlimited customers. No percentage of your bookings."
                        )
              ),
        h(
                "div",
          { className: "mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-gray-600" },
                REASSURANCE_ITEMS.map((item) =>
                          h(
                                      "span",
                            { key: item, className: "flex items-center gap-1" },
                                      h("span", { className: "text-brand-600" }, "\u2713"),
                                      item
                                    )
                                            )
              ),
        h("div", { className: "mt-14" }, h(PricingCards, {})),
        h(
                "div",
          {
                    className:
                                "mt-10 max-w-3xl mx-auto rounded-2xl border border-gray-200 bg-white p-8 flex flex-col md:flex-row items-center justify-between gap-6",
          },
                h(
                          "div",
                  {},
                          h("div", { className: "text-lg font-bold text-gray-900" }, "Enterprise"),
                          h("p", { className: "mt-1 text-sm text-gray-600 max-w-md" }, enterprise.tagline)
                        ),
                h(
                          Link,
                  { href: "/contact", className: "shrink-0 bg-gray-900 text-white px-6 py-3 rounded font-semibold hover:bg-black" },
                          "Contact Us"
                        )
              ),
        h(
                "div",
          { className: "mt-20 max-w-5xl mx-auto" },
                h("h2", { className: "text-2xl font-bold text-gray-900 text-center" }, "Compare plans"),
                buildTable()
              ),
        h(
                "div",
          {
                    className:
                                "mt-20 max-w-3xl mx-auto rounded-2xl border-2 border-brand-600 bg-brand-50 p-8 text-center",
          },
                h("div", { className: "text-xs font-bold uppercase tracking-wide text-brand-600" }, "Founding Customer Offer"),
                h(
                          "h2",
                  { className: "mt-2 text-2xl font-bold text-gray-900" },
                          "Everything currently released, for $" + FOUNDING_OFFER.monthlyPrice + "/month"
                        ),
                h(
                          "p",
                  { className: "mt-3 text-gray-700" },
                          "Join early and lock in $" +
                            FOUNDING_OFFER.monthlyPrice +
                            "/month for " +
                            FOUNDING_OFFER.priceLockMonths +
                            " months, covering everything Party Rental CRM currently offers. This does not include features released in the future beyond what your plan normally includes. Limited to the first " +
                            FOUNDING_OFFER.maxFoundingCustomers +
                            " qualifying rental companies."
                        ),
                h(
                          Link,
                  {
                              href: "/signup",
                              className: "mt-6 inline-block bg-brand-600 text-white px-6 py-3 rounded font-semibold hover:bg-brand-700",
                  },
                          "Become a Founding Customer"
                        ),
                h(
                          "p",
                  { className: "mt-3 text-xs text-gray-500" },
                          "No annual commitment. No setup fee. " + TRIAL_DAYS + "-day free trial."
                        )
              ),
        h(
                "div",
          { className: "mt-20 max-w-3xl mx-auto" },
                h("h2", { className: "text-2xl font-bold text-gray-900 text-center mb-6" }, "Pricing FAQ"),
                FAQ_ITEMS.map((item) => faqItem(item))
              ),
        h(
                "div",
          { className: "mt-20 text-center" },
                h(
                          "p",
                  { className: "text-gray-600" },
                          "Questions about pricing for a larger or multi-location business? ",
                          h(Link, { href: "/contact", className: "text-brand-600 hover:underline" }, "Contact us"),
                          " and we will talk through what you need."
                        )
              )
      );
}
