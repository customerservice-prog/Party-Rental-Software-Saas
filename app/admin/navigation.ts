import type { IconName } from "@/app/dashboard/components/Icon";
export type AdminDestination = {href:string;label:string;icon:IconName;description:string};
export const adminNavigation:{name:string;links:AdminDestination[]}[]=[
  {name:"Business",links:[
    {href:"/admin",label:"Overview",icon:"home",description:"Your platform at a glance"},
    {href:"/admin/organizations",label:"Organizations",icon:"box",description:"Tenant accounts and support workspaces"},
    {href:"/admin/users",label:"Tenant users",icon:"users",description:"Find owners, staff and account access"},
    {href:"/admin/billing",label:"Billing & revenue",icon:"wallet",description:"Subscriptions and Stripe invoice inspection"},
    {href:"/admin/onboarding",label:"Onboarding",icon:"check",description:"Setup milestones and next steps"},
    {href:"/admin/analytics",label:"Analytics",icon:"chart",description:"Signups and recorded platform usage"},
  ]},
  {name:"Operations",links:[
    {href:'/admin/operations',label:'Operations center',icon:'shield',description:'Webhook recovery, job history and certificate checks'},
    {href:'/admin/revenue',label:'Verified revenue',icon:'wallet',description:'Live subscription prices and recurring discount coverage'},
    {href:'/admin/access',label:'Administrator roles',icon:'users',description:'Grant least-privilege platform access'},
    {href:"/admin/health",label:"System health",icon:"shield",description:"Database, messaging and automation signals"},
    {href:"/admin/integrations",label:"Integrations",icon:"globe",description:"Read-only provider connection checks"},
    {href:"/admin/alerts",label:"Support alerts",icon:"clock",description:"Accounts and workflows needing review"},
    {href:"/admin/communications",label:"Communications",icon:"mail",description:"Tenant announcements and maintenance notices"},
    {href:"/admin/catalog-templates",label:"Global catalog",icon:"box",description:"Starter equipment, categories and photos"},
  ]},
  {name:"Platform controls",links:[
    {href:"/admin/feature-flags",label:"Feature flags",icon:"settings",description:"Global and tenant feature availability"},
    {href:"/admin/security",label:"Security",icon:"shield",description:"Administrators, MFA and session access"},
    {href:"/admin/data",label:"Data administration",icon:"orders",description:"Tenant exports and account lifecycle"},
    {href:"/admin/settings",label:"Settings & plans",icon:"settings",description:"Plan configuration and platform defaults"},
    {href:"/admin/audit-log",label:"Audit log",icon:"orders",description:"Search administrative change history"},
  ]},
];
export function adminDestination(path:string){return adminNavigation.flatMap(g=>g.links).find(d=>d.href==="/admin"?path===d.href:path===d.href||path.startsWith(d.href+"/"));}
