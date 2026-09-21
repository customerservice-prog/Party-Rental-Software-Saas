import {requirePlatformAdmin} from "@/lib/admin";
import AdminNav from "./AdminNav";
import AdminChrome from "./AdminChrome";
import "./console.css";
export default async function AdminLayout({children}:{children:React.ReactNode}){
  const session=await requirePlatformAdmin();
  const adminName=(session.user as {name?:string})?.name||"Platform Admin";
  return <div className="platform-console"><a className="console-skip" href="#platform-main">Skip to platform content</a><AdminNav adminName={adminName}/><div className="console-workspace"><AdminChrome/><main id="platform-main" tabIndex={-1} className="console-content">{children}</main></div></div>;
}
