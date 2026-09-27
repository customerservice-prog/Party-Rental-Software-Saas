import Link from "next/link";
import {redirect,notFound} from "next/navigation";

const routes:Record<string,{title:string;target?:string;description:string}>={
  audiences:{title:"Audiences",target:"/dashboard/customers",description:"Customer audiences and contact eligibility."},
  campaigns:{title:"Campaigns",target:"/dashboard/message-templates",description:"Reusable campaign and customer-message templates."},
  automations:{title:"Automations",target:"/dashboard/automations",description:"Automated booking lifecycle messaging."},
  performance:{title:"Performance",target:"/dashboard/analytics",description:"Business and outreach performance signals currently collected by the CRM."},
  history:{title:"History",target:"/dashboard/messages",description:"Outbound and inbound customer message history."},
  scheduler:{title:"Scheduler",target:"/dashboard/automations/schedule",description:"Owner-approved scheduled automation controls and delivery history."},
  calendar:{title:"Calendar",target:"/dashboard/scheduling",description:"Scheduling calendar used to coordinate event and outreach timing."},
  settings:{title:"Marketing Settings",target:"/dashboard/settings/business#email",description:"Email and messaging connection settings."},
  "campaigns-builder":{title:"Campaign Builder",description:"A dedicated multi-step campaign builder is not implemented yet. Tenant messaging currently uses Message Templates and manual/automated sends."},
  "campaigns-gallery":{title:"Campaign Gallery",description:"A separate visual campaign gallery is not implemented yet. Reusable content currently lives in Message Templates."},
};

export default async function MarketingSectionPage({params:paramsPromise}:{params:Promise<{section:string}>}){
  const {section}=await paramsPromise;
  const config=routes[section];
  if(!config)notFound();
  if(config.target)redirect(config.target);
  return <div className="friendly-admin-page">
    <div className="mb-4"><Link href="/dashboard/marketing" className="text-xs font-semibold text-[#1a6fd4] hover:underline">← Marketing</Link></div>
    <div className="friendly-admin-head"><div><h1>{config.title}</h1><p>{config.description}</p></div></div>
    <section className="friendly-admin-card accent-blue">
      <h2 className="friendly-admin-card-title">Not supported in this tenant CRM yet</h2>
      <p className="text-xs leading-6 text-slate-600">Friendly Party Rental has a dedicated screen for this workflow. Party Rental CRM does not yet have a separate campaign entity/editor to make this screen real, so this route does not fabricate campaign data or pretend a send occurred.</p>
      <div className="mt-4 flex gap-2"><Link href="/dashboard/message-templates" className="friendly-admin-primary">Open Message Templates</Link><Link href="/dashboard/marketing" className="friendly-admin-secondary">Back to Marketing</Link></div>
    </section>
  </div>;
}