import SupportWorkspace from "./SupportWorkspace";

export default function TenantSupportPage({params}:{params:{id:string}}){
  return <SupportWorkspace organizationId={params.id}/>;
}
