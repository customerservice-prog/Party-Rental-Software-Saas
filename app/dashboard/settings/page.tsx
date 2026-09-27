import Link from "next/link";

const sections=[
  {title:"General Config",items:[
    ["Company Info","/dashboard/settings/business#company-info"],
    ["Time Zone","/dashboard/settings/business#company-info"],
    ["Routing / Delivery","/dashboard/settings/business#order-pricing"],
    ["Text Messaging","/dashboard/settings/business#sms"],
    ["Email Sending","/dashboard/settings/business#email"],
    ["Tax Rate","/dashboard/settings/business#order-pricing"],
    ["Users","/dashboard/staff"],
    ["Company Roles","/dashboard/roles"],
    ["Sign-in Sessions","/dashboard/sessions"],
    ["Plan & Billing","/dashboard/settings/billing"],
  ]},
  {title:"Order Config",items:[
    ["Reminders","/dashboard/automations"],
    ["Order Options","/dashboard/settings/business#order-pricing"],
    ["Coupons","/dashboard/coupons"],
    ["Closed Dates","/dashboard/settings/business#closed-dates"],
    ["Business Hours","/dashboard/settings/business#business-hours"],
    ["Deposit Rules","/dashboard/settings/business#order-pricing"],
    ["Scheduling","/dashboard/scheduling"],
    ["Do Not Rent","/dashboard/do-not-rent"],
  ]},
  {title:"Documents & Messaging",items:[
    ["Automatic Messages","/dashboard/automations"],
    ["Scheduled Delivery","/dashboard/automations/schedule"],
    ["Message Templates","/dashboard/message-templates"],
    ["Messages","/dashboard/messages"],
    ["Contract Options","/dashboard/settings/business#company-info"],
    ["Print Contracts","/dashboard/deliveries/print-contracts"],
    ["Print Invoices","/dashboard/deliveries/print-invoices"],
  ]},
  {title:"Products",items:[
    ["Categories","/dashboard/categories"],
    ["Items","/dashboard/inventory"],
    ["Packages","/dashboard/inventory/packages"],
    ["Add-ons","/dashboard/inventory"],
    ["Cost of Goods","/dashboard/reports/overview?tab=cogs"],
    ["Warehouse","/dashboard/warehouse"],
    ["Returns & Damage","/dashboard/returns"],
  ]},
  {title:"Website",items:[
    ["Website Pages","/dashboard/pages"],
    ["Edit Website","/dashboard/website"],
    ["Branding & Images","/dashboard/settings/business#website"],
    ["SEO","/dashboard/settings/business#seo"],
    ["Public Site Settings","/dashboard/settings/business#website"],
  ]},
  {title:"Operations",items:[
    ["Delivery","/dashboard/deliveries"],
    ["Assign Drivers","/dashboard/dispatch"],
    ["Drivers","/dashboard/drivers"],
    ["Packing List","/dashboard/deliveries/packing-list"],
    ["Tasks","/dashboard/tasks"],
    ["Workforce","/dashboard/workforce"],
    ["Activity Log","/dashboard/activity"],
  ]},
];

export default function SettingsPage(){
  return <div className="friendly-admin-page">
    <div className="friendly-admin-head">
      <div><h1>Settings</h1><p>Business setup organized like the Friendly Party Rental admin instead of one long configuration page.</p></div>
      <div className="friendly-admin-actions">
        <Link href="/dashboard/settings/business" className="friendly-admin-primary">Full Business Settings</Link>
      </div>
    </div>
    <div className="space-y-4">
      {sections.map(section=><section key={section.title} className="friendly-admin-settings-section">
        <h2>{section.title}</h2>
        <div className="friendly-admin-settings-grid">
          {section.items.map(([label,href])=><Link key={label} href={href}>{label}</Link>)}
        </div>
      </section>)}
    </div>
  </div>;
}
