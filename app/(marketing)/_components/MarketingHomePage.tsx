import Link from "next/link";

const features = [
  ["Inventory", "See availability before you promise it", "Quantities, categories and reservations stay tied to the orders using them.", "M4 6h16M4 12h16M4 18h10"],
  ["Orders", "Keep every event in one operational record", "Customer, event, rentals, timing, totals and balance stay together.", "M7 3h10v4H7zM5 7h14v14H5zM9 12h6M9 16h4"],
  ["Delivery", "Turn the weekend into a plan", "Keep delivery and pickup timing connected to the work your team is fulfilling.", "M3 7h11v9H3zM14 10h4l3 3v3h-7zM7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM18 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"],
  ["Storefront", "Let customers browse while you are on-site", "Your customer-facing rental catalog connects back to the same operating system.", "M4 5h16l-1 5H5L4 5Zm2 5v9h12v-9M9 19v-5h6v5"],
  ["Customers", "Stop losing history in texts and inboxes", "Contact information and rental history remain attached to the customer.", "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0"],
  ["Payments", "Know what is paid and what is still due", "Balances live with the order instead of another spreadsheet or notebook.", "M4 6h16v12H4zM4 10h16M8 15h4"],
];

const workflow = [
  ["01", "Booking", "Customer request enters the system."],
  ["02", "Availability", "Inventory is checked against the event."],
  ["03", "Preparation", "Your team works from the same order."],
  ["04", "Delivery", "Timing stays attached to the job."],
  ["05", "Payment", "Balance remains visible through completion."],
];

const faqs = [
  ["Is Party Rental CRM specifically for rental companies?", "Yes. It is organized around rental inventory, event dates, customers, orders, delivery and pickup, staff and payments."],
  ["Can customers book rentals online?", "Accounts can use a customer-facing storefront so customers can browse rental categories and submit bookings online."],
  ["Can I manage tents, tables, chairs, inflatables and linens together?", "Yes. Different rental categories can be organized in the same account instead of being split between separate systems."],
  ["Can staff have their own access?", "Yes. Roles and permissions let an owner control staff access without sharing one owner login."],
  ["How much does it cost?", "Plans start at $49 per month with a 14-day free trial. See the Pricing page for current plan details."],
];

function Icon({ path }: { path: string }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={path}/></svg>;
}

function ProductWindow({ src, alt, label }: { src: string; alt: string; label: string }) {
  return (
    <div className="relative overflow-hidden rounded-[22px] border border-slate-200/90 bg-white shadow-[0_32px_90px_-38px_rgba(15,23,42,.48)]">
      <div className="flex h-11 items-center border-b border-slate-200 bg-slate-50/80 px-4">
        <div className="flex gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-slate-300"/><span className="h-2.5 w-2.5 rounded-full bg-slate-300"/><span className="h-2.5 w-2.5 rounded-full bg-slate-300"/></div>
        <div className="mx-auto rounded-md border border-slate-200 bg-white px-5 py-1 text-[10px] font-medium text-slate-400">{label}</div>
        <div className="w-10" />
      </div>
      <img src={src} alt={alt} className="block h-auto w-full" />
    </div>
  );
}

export default function MarketingHomePage() {
  return (
    <div className="overflow-hidden bg-white text-slate-950">
      <section className="relative isolate border-b border-slate-200 bg-[#f8fbff]">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_15%,rgba(37,99,235,.14),transparent_34%),linear-gradient(rgba(255,255,255,.45)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.45)_1px,transparent_1px)] bg-[size:auto,36px_36px,36px_36px]" />
        <div className="mx-auto max-w-7xl px-5 pb-16 pt-16 sm:px-6 sm:pb-24 sm:pt-24 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-4 py-2 text-sm font-bold text-blue-700 shadow-sm backdrop-blur"><span className="h-2 w-2 rounded-full bg-blue-600"/>Rental operations, in one place</div>
            <h1 className="mt-7 text-balance text-4xl font-black tracking-[-0.045em] text-slate-950 sm:text-6xl lg:text-[68px] lg:leading-[1.02]">The operating system for your party rental business.</h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-600 sm:text-xl">Bookings, inventory, customers, scheduling, deliveries, payments and staff stay connected — so your team can run the event instead of chasing information.</p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/signup" className="rounded-xl bg-blue-600 px-7 py-4 text-base font-bold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700">Start free for 14 days</Link><Link href="/demo" className="rounded-xl border border-slate-300 bg-white px-7 py-4 text-base font-bold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400">Explore the product →</Link></div>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-slate-500"><span>No credit card required</span><span className="text-slate-300">•</span><span>Plans from $49/month</span><span className="text-slate-300">•</span><span>Built for event rentals</span></div>
          </div>
          <div className="relative mx-auto mt-14 max-w-6xl lg:mt-16"><div className="absolute -inset-10 -z-10 rounded-[3rem] bg-blue-200/30 blur-3xl"/><ProductWindow src="/marketing/screenshots/dashboard-home.png" alt="Party Rental CRM dashboard showing rental operations" label="Party Rental CRM / Dashboard"/><div className="pointer-events-none absolute -bottom-5 left-6 hidden rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl md:block"><div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Today</div><div className="mt-1 text-sm font-bold text-slate-900">Your operation at a glance</div></div></div>
        </div>
      </section>

      <section className="bg-slate-950 text-white"><div className="mx-auto grid max-w-7xl divide-y divide-slate-800 px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-6 lg:px-8"><div className="py-7 text-center"><div className="text-lg font-black">One source of truth</div><div className="mt-1 text-sm text-slate-400">customer → order → fulfillment</div></div><div className="py-7 text-center"><div className="text-lg font-black">Rental-first workflow</div><div className="mt-1 text-sm text-slate-400">not generic retail software</div></div><div className="py-7 text-center"><div className="text-lg font-black">Start in 14 days free</div><div className="mt-1 text-sm text-slate-400">no credit card required</div></div></div></section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[.75fr_1.25fr] lg:items-end"><div><p className="text-sm font-black uppercase tracking-[.18em] text-blue-600">Built around the work</p><h2 className="mt-4 text-3xl font-black tracking-[-.035em] sm:text-5xl">Less switching. Fewer blind spots.</h2></div><p className="max-w-2xl text-lg leading-8 text-slate-600 lg:justify-self-end">The useful parts of your rental business should not live in separate tabs, spreadsheets and message threads. Party Rental CRM keeps the operational record connected.</p></div>
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{features.map(([title, headline, body, path]) => <article key={title} className="group rounded-2xl border border-slate-200 bg-white p-7 transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_20px_55px_-30px_rgba(15,23,42,.4)]"><div className="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600"><Icon path={path}/></div><div className="mt-6 text-xs font-black uppercase tracking-[.16em] text-blue-600">{title}</div><h3 className="mt-2 text-xl font-black tracking-tight">{headline}</h3><p className="mt-3 leading-7 text-slate-600">{body}</p></article>)}</div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50/80"><div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-28 lg:px-8"><div className="grid items-center gap-14 lg:grid-cols-[.8fr_1.2fr]"><div><span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-black uppercase tracking-[.15em] text-blue-700">Orders</span><h2 className="mt-5 text-3xl font-black tracking-[-.035em] sm:text-5xl">Open an order and understand the job.</h2><p className="mt-5 text-lg leading-8 text-slate-600">Customer details, event information, rental items and money belong together. Your office should not need to reconstruct the job every time someone answers the phone.</p><div className="mt-8 grid gap-3 sm:grid-cols-2">{["Event details","Rental items","Order status","Balances"].map(x => <div key={x} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-xs text-blue-600">✓</span>{x}</div>)}</div><Link href="/features" className="mt-8 inline-flex font-bold text-blue-600 hover:text-blue-700">See everything Party Rental CRM manages →</Link></div><ProductWindow src="/marketing/screenshots/dashboard-orders.png" alt="Party Rental CRM order management screen" label="Party Rental CRM / Orders"/></div></div></section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-28 lg:px-8"><div className="mx-auto max-w-3xl text-center"><p className="text-sm font-black uppercase tracking-[.18em] text-blue-600">One connected workflow</p><h2 className="mt-4 text-3xl font-black tracking-[-.035em] sm:text-5xl">One event. One operational trail.</h2><p className="mt-5 text-lg leading-8 text-slate-600">The information created at booking should keep moving with the job instead of being re-entered at every step.</p></div><div className="relative mt-14 grid gap-4 lg:grid-cols-5"><div className="absolute left-[10%] right-[10%] top-7 hidden h-px bg-slate-200 lg:block"/>{workflow.map(([n,t,b]) => <div key={n} className="relative rounded-2xl border border-slate-200 bg-white p-6"><div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-slate-950 text-sm font-black text-white shadow-sm">{n}</div><h3 className="mt-5 text-lg font-black">{t}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{b}</p></div>)}</div></section>

      <section className="relative overflow-hidden bg-blue-600 text-white"><div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-white/10 blur-2xl"/><div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 sm:px-6 lg:grid-cols-[1.15fr_.85fr] lg:px-8 lg:py-20"><div><p className="text-sm font-black uppercase tracking-[.18em] text-blue-100">Customer-facing storefront</p><h2 className="mt-4 max-w-3xl text-3xl font-black tracking-[-.035em] sm:text-5xl">Your online catalog should feed your operation — not create more admin work.</h2><p className="mt-5 max-w-2xl text-lg leading-8 text-blue-100">Customers can browse rental categories and submit bookings while the business continues working behind the scenes.</p></div><div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-stretch"><Link href="/signup" className="rounded-xl bg-white px-7 py-4 text-center font-black text-blue-700 shadow-lg hover:bg-blue-50">Create your account</Link><Link href="/pricing" className="rounded-xl border border-blue-300 px-7 py-4 text-center font-black text-white hover:bg-blue-700">Compare plans</Link></div></div></section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-28 lg:px-8"><div className="grid items-center gap-14 lg:grid-cols-[1.15fr_.85fr]"><ProductWindow src="/marketing/screenshots/dashboard-inventory.png" alt="Party Rental CRM inventory management screen" label="Party Rental CRM / Inventory"/><div><span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-black uppercase tracking-[.15em] text-blue-700">Inventory</span><h2 className="mt-5 text-3xl font-black tracking-[-.035em] sm:text-5xl">Know what you can rent before you sell it.</h2><p className="mt-5 text-lg leading-8 text-slate-600">Organize rental categories, items and quantities inside the same system handling the customers and orders that consume them.</p><Link href="/signup" className="mt-8 inline-flex rounded-xl bg-slate-950 px-6 py-3.5 font-black text-white transition hover:-translate-y-0.5 hover:bg-slate-800">Start building your account</Link></div></div></section>

      <section className="border-y border-slate-200 bg-slate-50"><div className="mx-auto max-w-4xl px-5 py-20 sm:px-6 sm:py-24"><div className="text-center"><p className="text-sm font-black uppercase tracking-[.18em] text-blue-600">Common questions</p><h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Know what you are switching to.</h2></div><div className="mt-10 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white px-6 shadow-sm sm:px-8">{faqs.map(([q,a]) => <details key={q} className="group py-6"><summary className="flex cursor-pointer list-none items-center justify-between gap-5 font-bold text-slate-900">{q}<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg text-blue-600 transition group-open:rotate-45">+</span></summary><p className="mt-3 max-w-3xl leading-7 text-slate-600">{a}</p></details>)}</div></div></section>

      <section className="relative overflow-hidden bg-slate-950 text-white"><div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(37,99,235,.35),transparent_40%)]"/><div className="relative mx-auto max-w-5xl px-5 py-20 text-center sm:px-6 sm:py-28"><p className="text-sm font-black uppercase tracking-[.18em] text-blue-400">Ready when your next order comes in</p><h2 className="mt-5 text-balance text-3xl font-black tracking-[-.04em] sm:text-5xl">Run the business from one place.</h2><p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-300">Bring bookings, inventory, customers, delivery and payments into one rental operating system.</p><div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/signup" className="rounded-xl bg-blue-600 px-7 py-4 font-black text-white shadow-lg shadow-blue-900/30 hover:bg-blue-500">Start your 14-day free trial</Link><Link href="/demo" className="rounded-xl border border-slate-700 bg-slate-900/50 px-7 py-4 font-black text-white hover:bg-slate-900">Explore the product</Link></div><p className="mt-4 text-sm text-slate-400">No credit card required.</p></div></section>
    </div>
  );
}
