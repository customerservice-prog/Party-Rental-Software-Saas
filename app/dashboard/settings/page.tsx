import Link from "next/link";

type SettingEntry={label:string;href?:string};
type SettingSection={title:string;items:SettingEntry[]};

const routeOverrides:Record<string,string>={
  "FPRMail":"ersmail",
  "Price Rule Sets":"pricing-tiers",
  "Loyalty & Credit Types":"loyalty-credit-types",
  "Email Templates for Orders":"email-templates-orders",
  "Email Templates for Marketing":"email-templates-marketing",
  "Text Message Templates":"text-message-templates",
  "Automatic Text Messaging":"automatic-text-messaging",
  "Misc Order Settings":"misc-order-settings",
  "QuickBooks Online":"quickbooks-online",
  "HighLevel Connect":"highlevel-connect",
  "Cost of Goods":"cost-of-goods",
};
function settingHref(item:SettingEntry){
  if(item.href)return item.href;
  const slug=routeOverrides[item.label]||item.label.toLowerCase().replace(/&/g,"and").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
  return "/dashboard/settings/"+slug;
}

const sections:SettingSection[]=[
  {title:"General Config",items:[
    {label:"Company Info",href:"/dashboard/settings/business#company-info"},
    {label:"Time Zone",href:"/dashboard/settings/business#company-info"},
    {label:"Routing Settings",href:"/dashboard/settings/business#order-pricing"},
    {label:"Google Integration"},
    {label:"QuickBooks Online"},
    {label:"Mailchimp"},
    {label:"AWeber"},
    {label:"Constant Contact"},
    {label:"Text Messaging",href:"/dashboard/settings/business#sms"},
    {label:"Text Logs",href:"/dashboard/messages"},
    {label:"Tax Rate",href:"/dashboard/settings/business#order-pricing"},
    {label:"Misc Settings",href:"/dashboard/settings/business"},
    {label:"API Info"},
    {label:"Users",href:"/dashboard/staff"},
    {label:"System Setup",href:"/dashboard/settings/business"},
    {label:"System Settings",href:"/dashboard/settings/business"},
    {label:"Locations",href:"/dashboard/settings/business#company-info"},
    {label:"Company Types"},
    {label:"Company Roles",href:"/dashboard/roles"},
    {label:"HighLevel Connect"},
  ]},
  {title:"Order Config",items:[
    {label:"Reminders",href:"/dashboard/automations"},
    {label:"Order Options",href:"/dashboard/settings/business#order-pricing"},
    {label:"References"},
    {label:"Setup Surfaces"},
    {label:"Coupons",href:"/dashboard/coupons"},
    {label:"Service Areas"},
    {label:"Closed Dates",href:"/dashboard/settings/business#closed-dates"},
    {label:"Misc Order Settings",href:"/dashboard/settings/business#order-pricing"},
    {label:"Loyalty & Credit Types"},
  ]},
  {title:"Documents",items:[
    {label:"General Documents"},
    {label:"Source Code"},
    {label:"Setup Surveys"},
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
    {label:"Sorting"},
    {label:"Schedule Profiles"},
    {label:"Bulk Pricing"},
    {label:"Addons",href:"/dashboard/inventory"},
    {label:"Product Sharing"},
    {label:"Cost of Goods",href:"/dashboard/reports/overview?tab=cogs"},
    {label:"Register Setup"},
    {label:"Auto Charge"},
    {label:"Recurring Profiles"},
    {label:"Wedding Packages",href:"/dashboard/inventory/packages"},
  ]},
  {title:"Rules",items:[
    {label:"Adjustments"},
    {label:"Deposit Rules",href:"/dashboard/settings/business#order-pricing"},
    {label:"Price Rule Sets"},
    {label:"Special Request Fees"},
    {label:"Availability Rule Sets"},
  ]},
  {title:"Website",items:[
    {label:"Website Pages",href:"/dashboard/pages"},
    {label:"Visual Builder",href:"/dashboard/website"},
    {label:"General Images",href:"/dashboard/settings/business#website"},
    {label:"Gallery"},
    {label:"Navigation Editor"},
    {label:"Premium Features"},
    {label:"Responsive Editor",href:"/dashboard/website"},
    {label:"Conversion Booster"},
  ]},
];

export default function SettingsPage(){
  return <div className="friendly-admin-page">
    <h1 className="mb-6 text-xl font-bold text-[#1a1a1a]">Settings</h1>

    <div className="space-y-4">
      {sections.map(section=><section key={section.title} className="friendly-admin-settings-section">
        <h2>{section.title}</h2>
        <div className="friendly-admin-settings-grid">
          {section.items.map(item=><Link key={item.label} href={settingHref(item)}>{item.label}</Link>)}
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
