import {requireCurrentOrganization} from "@/lib/tenant";
import {requirePermission} from "@/lib/authz";
import WorkforceClient from "./WorkforceClient";
export default async function WorkforcePage(){const org=await requireCurrentOrganization();await requirePermission(org.id,"staff.manage");return <div className="mx-auto max-w-7xl space-y-5 pb-10"><div><div className="text-xs font-black uppercase tracking-[.16em] text-blue-600">Team Operations</div><h1 className="mt-1 text-3xl font-black tracking-tight">Workforce</h1><p className="mt-1 text-sm text-slate-500">Schedule crews, prevent overlapping shifts, track time, and manage time off.</p></div><WorkforceClient/></div>}
