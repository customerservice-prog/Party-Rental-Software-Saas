import Link from "next/link";

const CONNECTED_STAGES = [
  "Online Booking",
  "Inventory",
  "Scheduling",
  "Delivery & Drivers",
  "Payments",
  "Reporting",
];

const FRAGMENTED_TOOLS = [
  "A spreadsheet for inventory",
  "A separate calendar for events",
  "Paper or emailed contracts",
  "Text messages with drivers about addresses",
  "A different tool for taking payments",
  "No single place to see what’s actually happening today",
];

const FEATURES: { title: string; description: string }[] = [
  {
    title: "Online booking & storefront",
    description:
      "Every tenant gets its own branded storefront where customers can browse categories, check availability, and book online — instead of relying on phone calls and back-and-forth messages.",
  },
  {
    title: "Inventory & categories",
    description:
      "Track every rental item and category in one place, so you always know what you actually own and what’s already booked before you confirm another order.",
  },
  {
    title: "Order & quote management",
    description:
      "See every order’s status, items, delivery details, and balance in one screen instead of piecing it together from texts and paper.",
  },
  {
    title: "Scheduling & calendar",
    description:
      "A shared calendar view of every event date keeps deliveries, pickups, and staff from colliding on the same day.",
  },
  {
    title: "Delivery & driver dispatch",
    description:
      "Turn tomorrow’s orders into an organized driver plan, with delivery and pickup tracked as part of the order itself, not a side conversation.",
  },
  {
    title: "Payments & balances",
    description:
      "Track what’s been collected against every order and see payments received over time, so outstanding balances don’t get lost.",
  },
  {
    title: "Staff roles & permissions",
    description:
      "Give office staff, warehouse staff, and drivers their own logins with the access they need — without handing everyone the keys to everything.",
  },
  {
    title: "Reports & analytics",
    description:
      "See recent orders, best-selling items, and inventory counts from a single dashboard instead of reconstructing them by hand at month end.",
  },
  {
    title: "Tasks & team coordination",
    description:
      "Keep a running list of what still needs to happen — for an order, a delivery, or the business in general — so nothing depends on someone remembering it.",
  },
];

const FAQS: { question: string; answer: string }[] = [
  {
    question: "Is this built specifically for party and event rental companies?",
    answer:
      "Yes. It is modeled on how rental businesses actually operate day to day — inventory, availability, delivery and pickup, deposits, and event dates — rather than being a generic booking or CRM tool.",
  },
  {
    question: "Can I manage tents, tables, chairs, inflatables, and other categories together?",
    answer:
      "Yes. Categories and inventory items are flexible, so a single account can manage bounce houses, tables and chairs, linens, and other rental categories side by side.",
  },
  {
    question: "Can my customers book online?",
    answer:
      "Yes. Every account gets its own storefront where customers can browse categories and submit bookings without you taking the request over the phone.",
  },
  {
    question: "Can my staff and drivers have their own logins?",
    answer:
      "Yes. Staff accounts and roles are separate from the owner account, so you can control who sees what.",
  },
  {
    question: "Is my business’s data kept separate from other companies using the platform?",
    answer:
      "Yes. Every account’s data — customers, orders, inventory, and staff — is isolated from every other account on the platform.",
  },
  {
    question: "Can I bring in my existing customers and inventory?",
    answer:
      "We are still building out guided data import. In the meantime our team can help you get your inventory and customer list into the system during setup.",
  },
  {
    question: "What does it cost?",
    answer:
      "See the Pricing page for current details. We are in an early access period, so final published pricing is still being finalized — you will always see the price before you are ever charged.",
  },
  {
    question: "Do I need to be technical to use this?",
    answer:
      "No. It is built to be run by whoever manages your rental business day to day, not by a developer.",
  },
];

export default function MarketingHomePage() {
  return (
    <div>
      <section className="bg-brand-50">
        <div className="max-w-6xl mx-auto px-4 py-20 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900">
              Party & event rental software built to run your whole rental business
            </h1>
            <p className="mt-6 text-lg text-gray-600">
              Manage bookings, inventory, customers, scheduling, delivery,
              drivers, payments, staff, and reporting from one system —
              instead of a spreadsheet, a calendar, a contract folder, and a
              phone full of texts.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/signup"
                className="bg-brand-600 text-white px-6 py-3 rounded font-semibold hover:bg-brand-700"
              >
                Get Started
              </Link>
              <Link
                href="/demo"
                className="border border-gray-300 bg-white px-6 py-3 rounded font-semibold text-gray-800 hover:border-brand-600 hover:text-brand-600"
              >
                See Product Tour
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              No credit card required to create an account.
            </p>
          </div>

          <div className="bg-white border rounded-xl shadow-sm p-6">
            <div className="text-xs font-semibold text-gray-400 mb-3">
              YOUR DASHBOARD
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="border rounded p-3">
                <div className="text-xs text-gray-500">Today’s Deliveries</div>
                <div className="text-2xl font-bold text-gray-900">6</div>
              </div>
              <div className="border rounded p-3">
                <div className="text-xs text-gray-500">Collected Today</div>
                <div className="text-2xl font-bold text-gray-900">$1,240</div>
              </div>
              <div className="border rounded p-3">
                <div className="text-xs text-gray-500">Open Tasks</div>
                <div className="text-2xl font-bold text-gray-900">3</div>
              </div>
              <div className="border rounded p-3">
                <div className="text-xs text-gray-500">Inventory Items</div>
                <div className="text-2xl font-bold text-gray-900">128</div>
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-400">
              Illustrative preview — your dashboard reflects your own orders and inventory.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-b bg-white">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm font-medium text-gray-600">
            {CONNECTED_STAGES.map((stage, i) => (
              <div key={stage} className="flex items-center gap-3">
                <span className="px-3 py-1.5 rounded-full border border-brand-200 bg-brand-50 text-brand-700">
                  {stage}
                </span>
                {i < CONNECTED_STAGES.length - 1 && (
                  <span className="text-gray-400">&rarr;</span>
                )}
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-gray-500 text-sm">
            One connected system, not a booking widget bolted onto everything else you already use.
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-start">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Your rental business shouldn’t require six different systems
            </h2>
            <p className="mt-4 text-gray-600">
              Most rental companies didn’t choose to run this way —
              it just grew into this over time.
            </p>
            <ul className="mt-6 space-y-2 text-gray-600">
              {FRAGMENTED_TOOLS.map((tool) => (
                <li key={tool} className="flex items-start gap-2">
                  <span className="text-gray-400">&times;</span>
                  <span>{tool}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-brand-50 border border-brand-100 rounded-xl p-8">
            <h3 className="font-semibold text-gray-900 mb-4">
              With everything in one system
            </h3>
            <ul className="space-y-3 text-gray-700">
              <li>&check; Bookings create orders automatically</li>
              <li>&check; Inventory updates as orders are placed</li>
              <li>&check; Every delivery has a driver and a route</li>
              <li>&check; Every order shows what’s been paid</li>
              <li>&check; Everyone sees the same calendar</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-gray-50 border-t border-b">
        <div className="max-w-6xl mx-auto px-4 py-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center">
            Everything a rental business actually needs to run
          </h2>
          <div className="mt-10 grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="bg-white border rounded-lg p-5">
                <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/features" className="text-brand-600 font-medium hover:underline">
              See everything it does &rarr;
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center">
          Built for how rental companies actually work, not fake polish
        </h2>
        <div className="mt-8 space-y-4 text-gray-600">
          <p>
            We are a newly launched platform, and we would rather tell you
            that plainly than dress up an empty testimonials section. What we
            can show you instead: a real product, transparent pricing, and a
            straightforward explanation of how your data is kept separate
            from every other business on the platform.
          </p>
          <p>
            Every account’s customers, orders, inventory, and staff are
            isolated from every other account. See the{" "}
            <Link href="/security" className="text-brand-600 hover:underline">
              Security page
            </Link>{" "}
            for details.
          </p>
        </div>
      </section>

      <section className="bg-gray-50 border-t">
        <div className="max-w-3xl mx-auto px-4 py-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center">
            Frequently asked questions
          </h2>
          <dl className="mt-10 space-y-8">
            {FAQS.map((faq) => (
              <div key={faq.question}>
                <dt className="font-semibold text-gray-900">{faq.question}</dt>
                <dd className="mt-2 text-gray-600">{faq.answer}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="bg-brand-600">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h2 className="text-3xl font-bold text-white">
            Ready to run your rental business from one place?
          </h2>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/signup"
              className="bg-white text-brand-700 px-6 py-3 rounded font-semibold hover:bg-gray-100"
            >
              Get Started
            </Link>
            <Link
              href="/pricing"
              className="border border-white text-white px-6 py-3 rounded font-semibold hover:bg-brand-700"
            >
              See Pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
