import {requirePlatformAdmin} from '@/lib/admin';
import SupportWorkspace from "./SupportWorkspace";

export default async function TenantSupportPage({params: paramsPromise}:{params:Promise<{id:string}>}){
 await requirePlatformAdmin('support');

  const params = await paramsPromise;

  return <SupportWorkspace organizationId={params.id}/>;
}
