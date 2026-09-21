export type IntegrationCheck = {provider:string;state:"verified"|"attention"|"unverified"|"not configured";detail:string};
type TenantConnections = {stripeAccountId:string|null;resendApiKey:string|null;senderEmail:string|null;twilioAccountSid:string|null;twilioAuthToken:string|null;twilioFromNumber:string|null;customDomain:string|null};
type Deps = {fetch:typeof fetch;stripeConfigured:boolean;account:(id:string)=>Promise<{charges_enabled:boolean;payouts_enabled:boolean;details_submitted:boolean}>};
async function readProvider(fetcher:typeof fetch,url:string,headers:Record<string,string>) {
  return fetcher(url,{method:"GET",headers,cache:"no-store",redirect:"error",signal:AbortSignal.timeout(8000)});
}
export async function inspectTenantConnections(o:TenantConnections,deps:Deps):Promise<IntegrationCheck[]> {
  const stripe = async ():Promise<IntegrationCheck> => {
    if (!o.stripeAccountId) return {provider:"Stripe Connect",state:"not configured",detail:"No connected account saved."};
    if (!/^acct_[a-zA-Z0-9]+$/.test(o.stripeAccountId)) return {provider:"Stripe Connect",state:"attention",detail:"The saved account identifier is invalid."};
    if (!deps.stripeConfigured) return {provider:"Stripe Connect",state:"unverified",detail:"Platform Stripe credentials are not configured."};
    try {
      const a = await deps.account(o.stripeAccountId);
      const ready = a.charges_enabled && a.payouts_enabled && a.details_submitted;
      return {provider:"Stripe Connect",state:ready?"verified":"attention",detail:`Charges ${a.charges_enabled?"enabled":"disabled"}; payouts ${a.payouts_enabled?"enabled":"disabled"}; onboarding ${a.details_submitted?"submitted":"incomplete"}. No charge was attempted.`};
    } catch { return {provider:"Stripe Connect",state:"unverified",detail:"Account lookup failed or timed out. Check platform access and retry; this is not proof of a checkout outage."}; }
  };
  const email = async ():Promise<IntegrationCheck> => {
    if (!o.resendApiKey && !o.senderEmail) return {provider:"Resend",state:"not configured",detail:"Email provider and sender have not been saved."};
    if (!o.resendApiKey || !o.senderEmail) return {provider:"Resend",state:"attention",detail:"Email credentials or sender address are missing."};
    try {
      const r = await readProvider(deps.fetch,"https://api.resend.com/domains?limit=100",{Authorization:`Bearer ${o.resendApiKey}`});
      if (!r.ok) return {provider:"Resend",state:"unverified",detail:`Domain inspection returned HTTP ${r.status}. Sending-only keys may not allow domain inspection. No email was sent.`};
      const data = await r.json() as {data?:Array<{name:string;status:string}>;has_more?:boolean};
      const domain = o.senderEmail.trim().toLowerCase().split("@")[1];
      const match = Array.isArray(data.data) ? data.data.find(d => d.name?.toLowerCase() === domain) : undefined;
      if (!match) return {provider:"Resend",state:"unverified",detail:"The sender domain was not found in the first 100 returned domains. Delivery has not been tested."};
      return {provider:"Resend",state:match.status==="verified"?"verified":"attention",detail:match.status==="verified"?"The exact sender domain is verified by Resend. Sending permission and inbox delivery were not tested.":"The sender domain is not verified by Resend. Review its DNS configuration."};
    } catch { return {provider:"Resend",state:"unverified",detail:"Domain lookup failed or timed out. No email was sent."}; }
  };
  const sms = async ():Promise<IntegrationCheck> => {
    if (!o.twilioAccountSid && !o.twilioAuthToken && !o.twilioFromNumber) return {provider:"Twilio",state:"not configured",detail:"SMS provider has not been configured."};
    if (!o.twilioAccountSid || !/^AC[a-fA-F0-9]{32}$/.test(o.twilioAccountSid) || !o.twilioAuthToken || !o.twilioFromNumber) return {provider:"Twilio",state:"attention",detail:"SMS requires a valid account SID, auth token and sender number."};
    try {
      const r = await readProvider(deps.fetch,`https://api.twilio.com/2010-04-01/Accounts/${o.twilioAccountSid}.json`,{Authorization:`Basic ${Buffer.from(`${o.twilioAccountSid}:${o.twilioAuthToken}`).toString("base64")}`});
      if (!r.ok) return {provider:"Twilio",state:"unverified",detail:`Account inspection returned HTTP ${r.status}. Check provider access. No SMS was sent.`};
      const data = await r.json() as {status?:string};
      return {provider:"Twilio",state:data.status==="active"?"verified":"attention",detail:data.status==="active"?"Twilio reports an active account. Sender ownership, messaging registration and delivery are not verified.":"Twilio did not report an active account. Review its account status."};
    } catch { return {provider:"Twilio",state:"unverified",detail:"Account lookup failed or timed out. No SMS was sent."}; }
  };
  return [...await Promise.all([stripe(),email(),sms()]),{provider:"Custom domain / SSL",state:o.customDomain?"unverified":"not configured",detail:o.customDomain?"A domain is saved. DNS ownership, routing and certificate validity have not been probed.":"Optional custom domain is not configured."}];
}
