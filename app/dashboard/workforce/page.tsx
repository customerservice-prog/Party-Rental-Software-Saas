import {requireCurrentOrganization} from "@/lib/tenant";
import {requirePermission} from "@/lib/authz";
import WorkforceClient from "./WorkforceClient";
export default async function WorkforcePage(){const org=await requireCurrentOrganization();await requirePermission(org.id,"staff.manage");return <div className="friendly-admin-page is-wide"><div><h1 className="text-2xl font-bold text-dark">Workforce</h1><p className="mt-1 text-sm text-slate-500">Schedule crews, prevent overlapping shifts, track time, and manage time off.</p></div><WorkforceClient/></div>}
