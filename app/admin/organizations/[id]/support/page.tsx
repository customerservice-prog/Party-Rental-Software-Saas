import SupportWorkspace from "./SupportWorkspace";

export default async function TenantSupportPage({params: paramsPromise}:{params:Promise<{id:string}>}){
  const params = await paramsPromise;

  return <SupportWorkspace organizationId={params.id}/>;
}
