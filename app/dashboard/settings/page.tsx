import Link from "next/link";

type SettingEntry={label:string;href?:string};
type SettingSection={title:string;items:SettingEntry[]};

const sections:SettingSection[]=[
  {title:"General Config",items:[
    {label:"Company Info",href:"/dashboard/settings/business#company-info"},
    {label:"Time Zone",href:"/dashboard/settings/business#company-info"},
    {label:"Routing Settings",href:"/dashboard/settings/business#order-pricing"},
    {label:"Google Integration",href:"/dashboard/settings/google-integration"},
    {label:"QuickBooks Online",href:"/dashboard/settings/quickbooks-online"},
    {label:"Mailchimp",href:"/dashboard/settings/mailchimp"},
    {label:"AWeber",href:"/dashboard/settings/aweber"},
    {label:"Constant Contact",href:"/dashboard/settings/constant-contact"},
    {label:"Text Messaging",href:"/dashboard/settings/business#sms"},
    {label:"Text Logs",href:"/dashboard/messages"},
    {label:"Tax Rate",href:"/dashboard/settings/business#order-pricing"},
    {label:"Misc Settings",href:"/dashboard/settings/business"},
    {label:"API Info",href:"/dashboard/settings/api-info"},
    {label:"Users",href:"/dashboard/staff"},
    {label:"System Setup",href:"/dashboard/settings/business"},
    {label:"System Settings",href:"/dashboard/settings/business"},
    {label:"Locations",href:"/dashboard/settings/business#company-info"},
    {label:"Company Types",href:"/dashboard/settings/company-types"},
    {label:"Company Roles",href:"/dashboard/roles"},
    {label:"HighLevel Connect",href:"/dashboard/settings/highlevel-connect"},
  ]},
  {title:"Order Config",items:[
    {label:"Reminders",href:"/dashboard/automations"},
    {label:"Order Options",href:"/dashboard/settings/business#order-pricing"},
    {label:"References",href:"/dashboard/settings/references"},
    {label:"Setup Surfaces",href:"/dashboard/settings/setup-surfaces"},
    {label:"Coupons",href:"/dashboard/coupons"},
    {label:"Service Areas",href:"/dashboard/settings/service-areas"},
    {label:"Closed Dates",href:"/dashboard/settings/business#closed-dates"},
    {label:"Misc Order Settings",href:"/dashboard/settings/business#order-pricing"},
    {label:"Loyalty & Credit Types",href:"/dashboard/settings/loyalty-credit-types"},
  ]},
  {title:"Documents",items:[
    {label:"General Documents",href:"/dashboard/settings/general-documents"},
    {label:"Source Code",href:"/dashboard/settings/source-code"},
    {label:"Setup Surveys",href:"/dashboard/settings/setup-surveys"},
    {label:"Automatic Messages",href:"/dashboard/automations"},
    {label:"Automatic Text Messaging",href:"/dashboard/automations"},
    {label:"Text Message Templates",href:"/dashboard/message-templates"},
    {label:"Email Templates for Orders",href:"/dashboard/message-templates"},
    {label:"Email Templates for Marketing",href:"/dashboard/message-templates"},
    {label:"FPRMail",href:"/dashboard/messages"},
    {label:"Contract Options",href:"/dashboard/settings/business#company-info"},
  ]},
  {title:"Products",items:[
    {label:"Categories",href:"/dashboard/categories"},
    {label:"Items",href:"/dashboard/inventory"},
    {label:"Sorting",href:"/dashboard/settings/sorting"},
    {label:"Schedule Profiles",href:"/dashboard/settings/schedule-profiles"},
    {label:"Bulk Pricing",href:"/dashboard/settings/bulk-pricing"},
    {label:"Addons",href:"/dashboard/inventory"},
    {label:"Product Sharing",href:"/dashboard/settings/product-sharing"},
    {label:"Cost of Goods",href:"/dashboard/reports/overview?tab=cogs"},
    {label:"Register Setup",href:"/dashboard/settings/register-setup"},
    {label:"Auto Charge",href:"/dashboard/settings/auto-charge"},
    {label:"Recurring Profiles",href:"/dashboard/settings/recurring-profiles"},
    {label:"Wedding Packages",href:"/dashboard/inventory/packages"},
  ]},
  {title:"Rules",items:[
    {label:"Adjustments",href:"/dashboard/settings/adjustments"},
    {label:"Deposit Rules",href:"/dashboard/settings/business#order-pricing"},
    {label:"Price Rule Sets",href:"/dashboard/settings/pricing-tiers"},
    {label:"Special Request Fees",href:"/dashboard/settings/special-request-fees"},
    {label:"Availability Rule Sets",href:"/dashboard/settings/availability-rule-sets"},
  ]},
  {title:"Website",items:[
    {label:"Website Pages",href:"/dashboard/pages"},
    {label:"Visual Builder",href:"/dashboard/website"},
    {label:"General Images",href:"/dashboard/settings/business#website"},
    {label:"Gallery",href:"/dashboard/settings/gallery"},
    {label:"Navigation Editor",href:"/dashboard/settings/navigation-editor"},
    {label:"Premium Features",href:"/dashboard/settings/premium-features"},
    {label:"Responsive Editor",href:"/dashboard/website"},
    {label:"Conversion Booster",href:"/dashboard/settings/conversion-booster"},
  ]},
];

export default function SettingsPage(){
  return <div className="friendly-admin-page">
    <h1 className="mb-6 text-xl font-bold text-[#1a1a1a]">Settings</h1>

    <div className="space-y-4">
      {sections.map(section=><section key={section.title} className="friendly-admin-settings-section">
        <h2>{section.title}</h2>
        <div className="friendly-admin-settings-grid">
          {section.items.map(item=><Link key={item.label} href={item.href||"/dashboard/settings"}>{item.label}</Link>)}
        </div>
      </section>)}
    </div>

    <div className="mt-5 flex flex-wrap gap-2">
      <Link href="/dashboard/settings/business" className="friendly-admin-secondary">Business Settings</Link>
      <Link href="/dashboard/settings/billing" className="friendly-admin-secondary">Plan & Billing</Link>
      <Link href="/dashboard/sessions" className="friendly-admin-secondary">Sign-in Sessions</Link>
    </div>
  </div>;
}
