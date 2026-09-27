import Link from "next/link";
import {redirect,notFound} from "next/navigation";

type RouteConfig={target?:string;title:string;description:string};

const routes:Record<string,RouteConfig>={
  "company-info":{target:"/dashboard/settings/business#company-info",title:"Company Info",description:"Business identity, contact details, address, time zone, branding, and contract terms."},
  "time-zone":{target:"/dashboard/settings/business#company-info",title:"Time Zone",description:"Business time zone used by schedules and date-based automation."},
  "routing-settings":{target:"/dashboard/settings/business#order-pricing",title:"Routing Settings",description:"Delivery and order pricing controls currently available to this tenant."},
  "text-messaging":{target:"/dashboard/settings/business#sms",title:"Text Messaging",description:"Connect and manage tenant-owned SMS sending."},
  "text-logs":{target:"/dashboard/messages",title:"Text Logs",description:"Review tenant message activity."},
  "tax-rate":{target:"/dashboard/settings/business#order-pricing",title:"Tax Rate",description:"Customer order tax configuration."},
  "misc-settings":{target:"/dashboard/settings/business",title:"Misc Settings",description:"Business-wide settings currently supported by Party Rental CRM."},
  "users":{target:"/dashboard/staff",title:"Users",description:"Tenant staff accounts."},
  "system-setup":{target:"/dashboard/settings/business",title:"System Setup",description:"Core tenant business configuration."},
  "system-settings":{target:"/dashboard/settings/business",title:"System Settings",description:"Core tenant system configuration."},
  "locations":{target:"/dashboard/settings/business#company-info",title:"Locations",description:"Primary business location information."},
  "company-roles":{target:"/dashboard/roles",title:"Company Roles",description:"Tenant roles and permissions."},
  "reminders":{target:"/dashboard/automations",title:"Reminders",description:"Booking lifecycle reminders and automations."},
  "order-options":{target:"/dashboard/settings/business#order-pricing",title:"Order Options",description:"Order pricing, delivery, deposit, and tax settings."},
  "coupons":{target:"/dashboard/coupons",title:"Coupons",description:"Customer coupon codes."},
  "closed-dates":{target:"/dashboard/settings/business#closed-dates",title:"Closed Dates",description:"Dates the business is closed."},
  "misc-order-settings":{target:"/dashboard/settings/business#order-pricing",title:"Misc Order Settings",description:"Current tenant order configuration."},
  "automatic-messages":{target:"/dashboard/automations",title:"Automatic Messages",description:"Automated booking lifecycle messages."},
  "automatic-text-messaging":{target:"/dashboard/automations",title:"Automatic Text Messaging",description:"Automated customer messaging rules."},
  "text-message-templates":{target:"/dashboard/message-templates",title:"Text Message Templates",description:"Reusable customer message templates."},
  "email-templates-orders":{target:"/dashboard/message-templates",title:"Email Templates for Orders",description:"Reusable order email templates."},
  "email-templates-marketing":{target:"/dashboard/message-templates",title:"Email Templates for Marketing",description:"Reusable marketing email templates."},
  "ersmail":{target:"/dashboard/messages",title:"FPRMail",description:"Tenant customer messaging workspace."},
  "contract-options":{target:"/dashboard/settings/business#company-info",title:"Contract Options",description:"Rental agreement terms currently supported by Party Rental CRM."},
  "categories":{target:"/dashboard/categories",title:"Categories",description:"Rental inventory categories."},
  "items":{target:"/dashboard/inventory",title:"Items",description:"Rental inventory items."},
  "addons":{target:"/dashboard/inventory",title:"Addons",description:"Item add-ons are managed from each item workspace."},
  "cost-of-goods":{target:"/dashboard/reports/overview?tab=cogs",title:"Cost of Goods",description:"Inventory acquisition cost and return reporting."},
  "wedding-packages":{target:"/dashboard/inventory/packages",title:"Wedding Packages",description:"Rental package builder."},
  "deposit-rules":{target:"/dashboard/settings/business#order-pricing",title:"Deposit Rules",description:"Deposit configuration for customer orders."},
  "website-pages":{target:"/dashboard/pages",title:"Website Pages",description:"Tenant-created public website pages."},
  "visual-builder":{target:"/dashboard/website",title:"Visual Builder",description:"Tenant website visual editor."},
  "general-images":{target:"/dashboard/settings/business#website",title:"General Images",description:"Logo and website imagery supported by the tenant website."},
  "navigation-editor":{target:"/dashboard/pages",title:"Navigation Editor",description:"Website page visibility and navigation are managed from Website Pages."},
  "premium-features":{target:"/dashboard/settings/billing",title:"Premium Features",description:"Tenant plan and feature access."},
  "responsive-editor":{target:"/dashboard/website",title:"Responsive Editor",description:"Tenant website editor with responsive preview."},

  "google-integration":{title:"Google Integration",description:"A dedicated Google business integration is not implemented in the tenant CRM yet."},
  "quickbooks-online":{title:"QuickBooks Online",description:"QuickBooks Online is not connected in the tenant CRM yet."},
  "mailchimp":{title:"Mailchimp",description:"Mailchimp is not connected in the tenant CRM yet."},
  "aweber":{title:"AWeber",description:"AWeber is not connected in the tenant CRM yet."},
  "constant-contact":{title:"Constant Contact",description:"Constant Contact is not connected in the tenant CRM yet."},
  "api-info":{title:"API Info",description:"A tenant-facing API credential/control screen is not implemented yet."},
  "company-types":{title:"Company Types",description:"Company-type configuration is not implemented in the tenant CRM yet."},
  "highlevel-connect":{title:"HighLevel Connect",description:"HighLevel integration is not implemented in the tenant CRM yet."},
  "references":{title:"References",description:"Order reference configuration is not implemented yet."},
  "setup-surfaces":{title:"Setup Surfaces",description:"Dedicated setup-surface rules are not implemented yet."},
  "service-areas":{title:"Service Areas",description:"Dedicated service-area rules are not implemented yet."},
  "loyalty-credit-types":{title:"Loyalty & Credit Types",description:"Loyalty and credit type configuration is not implemented yet."},
  "general-documents":{title:"General Documents",description:"A general document library is not implemented yet."},
  "source-code":{title:"Source Code",description:"Tenant source-code editing is intentionally not exposed in this CRM."},
  "setup-surveys":{title:"Setup Surveys",description:"Setup surveys are not implemented yet."},
  "sorting":{title:"Sorting",description:"A dedicated product sorting screen is not implemented yet."},
  "schedule-profiles":{title:"Schedule Profiles",description:"Schedule profiles are not implemented yet."},
  "bulk-pricing":{title:"Bulk Pricing",description:"Bulk pricing rules are not implemented yet."},
  "product-sharing":{title:"Product Sharing",description:"Cross-account product sharing is not implemented yet."},
  "register-setup":{title:"Register Setup",description:"Point-of-sale register setup is not implemented yet."},
  "auto-charge":{title:"Auto Charge",description:"Automatic customer card charging is not implemented yet."},
  "recurring-profiles":{title:"Recurring Profiles",description:"Recurring rental profiles are not implemented yet."},
  "adjustments":{title:"Adjustments",description:"A separate adjustment rules engine is not implemented yet."},
  "pricing-tiers":{title:"Price Rule Sets",description:"Advanced price rule sets are not implemented yet."},
  "special-request-fees":{title:"Special Request Fees",description:"Dedicated special-request fee rules are not implemented yet."},
  "availability-rule-sets":{title:"Availability Rule Sets",description:"Advanced availability rule sets are not implemented yet."},
  "gallery":{title:"Gallery",description:"A dedicated tenant photo gallery is not implemented yet."},
  "conversion-booster":{title:"Conversion Booster",description:"A separate conversion-booster module is not implemented yet."},
};

export default async function FriendlySettingRoute({params:paramsPromise}:{params:Promise<{section:string}>}){
  const {section}=await paramsPromise;
  const config=routes[section];
  if(!config)notFound();
  if(config.target)redirect(config.target);

  return <div className="friendly-admin-page">
    <div className="mb-4"><Link href="/dashboard/settings" className="text-xs font-semibold text-[#1a6fd4] hover:underline">← Settings</Link></div>
    <div className="friendly-admin-head"><div><h1>{config.title}</h1><p>{config.description}</p></div></div>
    <section className="friendly-admin-card accent-blue">
      <h2 className="friendly-admin-card-title">Not supported in this tenant CRM yet</h2>
      <p className="text-xs leading-6 text-slate-600">
        Friendly Party Rental has a dedicated screen for this setting. Party Rental CRM does not currently have the underlying tenant data or workflow needed to make this control real, so this page does not pretend the feature exists.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/dashboard/settings" className="friendly-admin-secondary">Back to Settings</Link>
        <Link href="/dashboard/settings/business" className="friendly-admin-secondary">Business Settings</Link>
      </div>
    </section>
  </div>;
}
