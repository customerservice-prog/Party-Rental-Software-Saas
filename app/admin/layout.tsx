import {requirePlatformAdmin,getPlatformAdminAccess} from "@/lib/admin";
import AdminNav from "./AdminNav";
import AdminChrome from "./AdminChrome";
import "./console.css";
export default async function AdminLayout({children}:{children:React.ReactNode}){
  const session=await requirePlatformAdmin('console');
 const accessRole=(await getPlatformAdminAccess((session.user as {id:string}).id))!;
  const adminName=(session.user as {name?:string})?.name||"Platform Admin";
  return <div className="platform-console"><a className="console-skip" href="#platform-main">Skip to platform content</a><AdminNav adminName={adminName} accessRole={accessRole}/><div className="console-workspace"><AdminChrome accessRole={accessRole}/><main id="platform-main" tabIndex={-1} className="console-content">{children}</main></div></div>;
}
