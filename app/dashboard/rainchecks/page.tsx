import Link from "next/link";
import {requireCurrentOrganization} from "@/lib/tenant";
import {requirePermission} from "@/lib/authz";
import {prisma} from "@/lib/prisma";

type RaincheckRow={
  id:string; customerId:string; sourceOrderId:string|null; originalAmount:number; remainingAmount:number;
  reason:string|null; expiresAt:Date|null; status:string; createdAt:Date;
  firstName:string; lastName:string; email:string; orderNumber:string|null;
};

const money=(n:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n);

export default async function RainchecksPage({searchParams:paramsPromise}:{searchParams:Promise<{status?:string;q?:string}>}){
  const params=await paramsPromise;
  const organization=await requireCurrentOrganization();
  await requirePermission(organization.id,"customers.view");
  const status=["all","active","redeemed","expired"].includes(params.status||"")?String(params.status):"active";
  const q=(params.q||"").trim().slice(0,120);

  const rows=await prisma.$queryRawUnsafe<RaincheckRow[]>(
    'SELECT c."id",c."customerId",c."sourceOrderId",c."originalAmount",c."remainingAmount",c."reason",c."expiresAt",c."status",c."createdAt", '+
    'u."firstName",u."lastName",u."email",o."orderNumber" '+
    'FROM "StoreCredit" c JOIN "Customer" u ON u."id"=c."customerId" LEFT JOIN "Order" o ON o."id"=c."sourceOrderId" '+
    'WHERE c."organizationId"=$1 AND c."type"=\'rain_check\' ORDER BY c."createdAt" DESC',
    organization.id
  );

  const now=new Date();
  const filtered=rows.filter(row=>{
    const expired=Boolean(row.expiresAt&&row.expiresAt<now);
    const state=expired&&row.status==="active"?"expired":row.status;
    if(status!=="all"&&state!==status)return false;
    if(!q)return true;
    return [row.firstName,row.lastName,row.email,row.orderNumber||"",row.reason||""].join(" ").toLowerCase().includes(q.toLowerCase());
  });
  const activeRows=rows.filter(row=>row.status==="active"&&(!row.expiresAt||row.expiresAt>=now));
  const activeValue=activeRows.reduce((sum,row)=>sum+row.remainingAmount,0);
  const redeemed=rows.filter(row=>row.status==="redeemed"||row.remainingAmount<=0.001).length;
  const expiredCount=rows.filter(row=>row.status==="active"&&row.expiresAt&&row.expiresAt<now).length;

  return <div className="friendly-admin-page is-wide">
    <div className="friendly-admin-head">
      <div><h1>Rainchecks</h1><p>Real customer rain-check credits issued from the existing credit ledger.</p></div>
      <div className="friendly-admin-actions"><Link href="/dashboard/customers" className="friendly-admin-primary">Find Customer to Issue Raincheck</Link></div>
    </div>

    <section className="friendly-admin-kpis">
      <div className="friendly-admin-kpi"><small>Total rainchecks</small><strong>{rows.length}</strong></div>
      <div className="friendly-admin-kpi"><small>Active</small><strong>{activeRows.length}</strong></div>
      <div className="friendly-admin-kpi"><small>Active value</small><strong>{money(activeValue)}</strong></div>
      <div className="friendly-admin-kpi"><small>Redeemed / expired</small><strong>{redeemed+expiredCount}</strong></div>
    </section>

    <section className="friendly-admin-card accent-blue">
      <form className="friendly-admin-filters">
        <label className="min-w-[220px] flex-1"><span>Search</span><input name="q" defaultValue={q} placeholder="Customer, email, order #, or reason" className="w-full"/></label>
        <label><span>Status</span><select name="status" defaultValue={status}><option value="active">Active</option><option value="redeemed">Redeemed</option><option value="expired">Expired</option><option value="all">All</option></select></label>
        <button className="friendly-admin-secondary">Apply</button>
        {(q||status!=="active")&&<Link href="/dashboard/rainchecks" className="friendly-admin-secondary">Clear</Link>}
      </form>
    </section>

    <section className="friendly-admin-card flush">
      <div className="friendly-admin-table-wrap"><table className="friendly-admin-table">
        <thead><tr><th>Customer</th><th>Source Order</th><th>Reason</th><th>Issued</th><th>Expires</th><th className="numeric">Original</th><th className="numeric">Remaining</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{filtered.map(row=>{
          const isExpired=Boolean(row.expiresAt&&row.expiresAt<now&&row.status==="active");
          const state=isExpired?"expired":row.status;
          return <tr key={row.id}>
            <td><Link href={"/dashboard/customers/"+row.customerId}>{row.firstName} {row.lastName}</Link><div className="mt-1 text-[9px] text-slate-400">{row.email}</div></td>
            <td>{row.sourceOrderId&&row.orderNumber?<Link href={"/dashboard/orders/"+row.sourceOrderId}>#{row.orderNumber}</Link>:"—"}</td>
            <td>{row.reason||"—"}</td>
            <td>{row.createdAt.toLocaleDateString()}</td>
            <td>{row.expiresAt?row.expiresAt.toLocaleDateString():"No expiration"}</td>
            <td className="numeric">{money(row.originalAmount)}</td>
            <td className="numeric">{money(row.remainingAmount)}</td>
            <td><span className={"friendly-admin-badge "+(state==="active"?"green":state==="expired"?"yellow":"gray")}>{state}</span></td>
            <td><Link href={"/dashboard/customers/"+row.customerId+"/relationships"} className="friendly-admin-secondary !min-h-0 !px-3 !py-1">{state==="active"?"Apply / Manage":"View Credit"}</Link></td>
          </tr>;
        })}
        {!filtered.length&&<tr><td colSpan={9} className="friendly-admin-empty">No rainchecks match this view.</td></tr>}</tbody>
      </table></div>
    </section>

    <div className="friendly-admin-info">Rainchecks are issued and redeemed from the customer relationship workspace. Redemption creates a real store-credit payment and reduces the remaining balance atomically.</div>
  </div>;
}
