import Link from "next/link";

const capabilities = [
  ["Inventory", "Know what is available before you promise it.", "Live quantities, categories and availability tied directly to orders."],
  ["Orders & quotes", "Move from inquiry to confirmed order faster.", "Keep event details, rental items, totals and balances together."],
  ["Delivery", "Give busy weekends one operating plan.", "Organize deliveries, pickups, drivers and event timing from the same system."],
  ["Online booking", "Let customers shop when your office is closed.", "Give every rental company a branded storefront connected to its inventory."],
  ["Customers", "Keep the full customer history in one place.", "Contact information and rental history stay connected to the work."],
  ["Payments", "See what is paid and what is still owed.", "Balances and collected payments live with the order instead of another spreadsheet."],
];

const workflow = [
  ["01", "Customer books", "An online request becomes part of the same system your team uses."],
  ["02", "Inventory is checked", "Availability stays connected to the event date and order."],
  ["03", "Team prepares", "Staff can work from shared order and schedule information."],
  ["04", "Driver delivers", "Delivery and pickup details stay attached to the job."],
  ["05", "You get paid", "Track the balance without rebuilding the order somewhere else."],
];

const faqs = [
  ["Is Party Rental CRM made specifically for event rental companies?", "Yes. The product is organized around rental inventory, event dates, customers, orders, delivery and pickup, staff and payments."],
  ["Can customers book rentals online?", "Yes. Accounts can use a customer-facing storefront so customers can browse rental categories and submit bookings online."],
  ["Can I manage different rental categories together?", "Yes. Tents, tables, chairs, inflatables, linens and other rental inventory can be organized in the same account."],
  ["Can staff have their own access?", "Yes. Staff roles and permissions let an owner control access without sharing one owner login."],
  ["How much does it cost?", "Plans start at $49 per month with a 14-day free trial. See the Pricing page for current plan details."],
];

const Check = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true" className="h-5 w-5 shrink-0 fill-current"><path fillRule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4l3.3 3.3 6.8-6.8a1 1 0 0 1 1.4 0Z" clipRule="evenodd" /></svg>
);

export default function MarketingHomePage() {
  return (
    <div className="overflow-hidden bg-white text-slate-950">
      <section className="relative border-b border-slate-200 bg-[radial-gradient(circle_at_80%_10%,rgba(37,99,235,.13),transparent_34%),linear-gradient(to_bottom,#f8fbff,#ffffff)]">
        <div className="mx-auto max-w-7xl px-5 pb-16 pt-16 sm:px-6 sm:pb-24 sm:pt-24 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
              Built for party & event rental companies
            </div>
            <h1 className="text-balance text-4xl font-black tracking-[-0.04em] text-slate-950 sm:text-6xl lg:text-7xl">
              Run your rental business without running six different systems.
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-600 sm:text-xl">
              Bookings, inventory, customers, scheduling, deliveries, payments and staff — connected in one place built around the way rental companies actually work.
            </p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/signup" className="rounded-xl bg-blue-600 px-7 py-4 text-base font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700">Start free for 14 days</Link>
              <Link href="/demo" className="rounded-xl border border-slate-300 bg-white px-7 py-4 text-base font-bold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50">See the product</Link>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-500">
              <span>No credit card required</span><span>•</span><span>Plans from $49/month</span><span>•</span><span>Built for rental operations</span>
            </div>
          </div>

          <div className="relative mx-auto mt-14 max-w-6xl">
            <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-blue-100/60 blur-3xl" />
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_30px_90px_-35px_rgba(15,23,42,.4)]">
              <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-300"/><span className="h-2.5 w-2.5 rounded-full bg-slate-300"/><span className="h-2.5 w-2.5 rounded-full bg-slate-300"/>
                <div className="ml-3 rounded-md border border-slate-200 bg-white px-4 py-1 text-xs text-slate-400">partyrentalcrm.com/dashboard</div>
              </div>
              <img src="/marketing/screenshots/dashboard-home.png" alt="Party Rental CRM dashboard" className="block h-auto w-full" />
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 text-center sm:grid-cols-3 sm:px-6 lg:px-8">
          <div><div className="text-2xl font-black">One system</div><div className="mt-1 text-sm text-slate-400">from booking through return</div></div>
          <div><div className="text-2xl font-black">Real product</div><div className="mt-1 text-sm text-slate-400">built around rental operations</div></div>
          <div><div className="text-2xl font-black">14-day trial</div><div className="mt-1 text-sm text-slate-400">start without a credit card</div></div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[.18em] text-blue-600">Built for the busy weekend</p>
          <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">Everything important stays connected.</h2>
          <p className="mt-5 text-lg leading-8 text-slate-600">Rental software should do more than store names and dates. It should help your office, warehouse and drivers work from the same information.</p>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {capabilities.map(([title, headline, body]) => (
            <div key={title} className="group rounded-2xl border border-slate-200 bg-white p-7 transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-slate-200/60">
              <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 font-black text-blue-600">✓</div>
              <div className="text-sm font-bold uppercase tracking-wider text-blue-600">{title}</div>
              <h3 className="mt-2 text-xl font-bold tracking-tight">{headline}</h3>
              <p className="mt-3 leading-7 text-slate-600">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-[.85fr_1.15fr]">
            <div>
              <p className="text-sm font-bold uppercase tracking-[.18em] text-blue-600">See the work, not a feature list</p>
              <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">Orders your team can actually operate from.</h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">Keep the customer, event, items, timing and money tied together so the next person does not have to hunt through texts, paper and separate apps.</p>
              <ul className="mt-7 space-y-4">
                {["See order status and event details together", "Keep rental items attached to the job", "Track totals and balances", "Give staff one source of truth"].map((item) => <li key={item} className="flex gap-3 font-medium text-slate-700"><span className="text-blue-600"><Check/></span>{item}</li>)}
              </ul>
              <Link href="/features" className="mt-8 inline-flex font-bold text-blue-600 hover:text-blue-700">Explore all features →</Link>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-300/50">
              <img src="/marketing/screenshots/dashboard-orders.png" alt="Party Rental CRM orders screen" className="w-full" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-[.18em] text-blue-600">One connected workflow</p>
          <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">From the first click to the final pickup.</h2>
        </div>
        <div className="mt-12 grid gap-4 lg:grid-cols-5">
          {workflow.map(([num,title,body]) => <div key={num} className="relative rounded-2xl border border-slate-200 p-6"><div className="text-sm font-black text-blue-600">{num}</div><h3 className="mt-5 text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{body}</p></div>)}
        </div>
      </section>

      <section className="bg-blue-600 text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-20">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.18em] text-blue-100">Your storefront is part of the system</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Take rental requests while you are setting up the next event.</h2>
            <p className="mt-4 max-w-xl text-lg leading-8 text-blue-100">Customers can browse your rental categories online while your team manages the business behind the scenes.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:justify-end"><Link href="/signup" className="rounded-xl bg-white px-7 py-4 text-center font-bold text-blue-700 hover:bg-blue-50">Create your account</Link><Link href="/pricing" className="rounded-xl border border-blue-300 px-7 py-4 text-center font-bold text-white hover:bg-blue-700">View pricing</Link></div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="order-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl lg:order-1"><img src="/marketing/screenshots/dashboard-inventory.png" alt="Party Rental CRM inventory screen" className="w-full" /></div>
          <div className="order-1 lg:order-2">
            <p className="text-sm font-bold uppercase tracking-[.18em] text-blue-600">Inventory that belongs to the operation</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">Stop finding out about conflicts after the customer calls.</h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">Organize rental categories, items and quantities in the same platform handling your customers and orders.</p>
            <Link href="/signup" className="mt-8 inline-flex rounded-xl bg-slate-950 px-6 py-3.5 font-bold text-white hover:bg-slate-800">Start building your account</Link>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-4xl px-5 py-20 sm:px-6 sm:py-24">
          <div className="text-center"><p className="text-sm font-bold uppercase tracking-[.18em] text-blue-600">Questions before you switch?</p><h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Straight answers.</h2></div>
          <div className="mt-10 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white px-6 sm:px-8">
            {faqs.map(([q,a]) => <details key={q} className="group py-6"><summary className="flex cursor-pointer list-none items-center justify-between gap-5 font-bold text-slate-900">{q}<span className="text-xl text-blue-600 transition group-open:rotate-45">+</span></summary><p className="mt-3 max-w-3xl leading-7 text-slate-600">{a}</p></details>)}
          </div>
        </div>
      </section>

      <section className="bg-slate-950 text-white">
        <div className="mx-auto max-w-5xl px-5 py-20 text-center sm:px-6 sm:py-24">
          <h2 className="text-3xl font-black tracking-tight sm:text-5xl">Your next busy weekend should feel more organized than your last one.</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-300">Put bookings, inventory, customers, delivery and payments in one operating system for your rental business.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/signup" className="rounded-xl bg-blue-600 px-7 py-4 font-bold text-white hover:bg-blue-500">Start your 14-day free trial</Link><Link href="/demo" className="rounded-xl border border-slate-700 px-7 py-4 font-bold text-white hover:bg-slate-900">See product tour</Link></div>
          <p className="mt-4 text-sm text-slate-400">No credit card required.</p>
        </div>
      </section>
    </div>
  );
}
