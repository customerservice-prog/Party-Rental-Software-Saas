import {NextRequest,NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {requireCurrentOrganization} from '@/lib/tenant';
import {requirePermission,requireOwnerSession,authzErrorResponse} from '@/lib/authz';
import {logActivity} from '@/lib/audit';
import {runBookingAutomations} from '@/lib/automations';
import {tenantMutationOriginAllowed} from '@/lib/tenantMutationOrigin';
export async function GET(){try{
 const organization=await requireCurrentOrganization();await requirePermission(organization.id,'customers.message');
 const [confirmationsSentCount,remindersSentCount,balanceRemindersSentCount,recent]=await Promise.all([
  prisma.sentMessage.count({where:{organizationId:organization.id,automationType:'booking_confirmation',status:'sent'}}),
  prisma.sentMessage.count({where:{organizationId:organization.id,automationType:'event_reminder',status:'sent'}}),
  prisma.sentMessage.count({where:{organizationId:organization.id,automationType:'balance_due',status:'sent'}}),
  prisma.sentMessage.findMany({where:{organizationId:organization.id,automationType:{not:null}},orderBy:{createdAt:'desc'},take:20})
 ]);
 return NextResponse.json({autoConfirmationEnabled:organization.autoConfirmationEnabled,autoReminderEnabled:organization.autoReminderEnabled,reminderDaysBefore:organization.reminderDaysBefore,autoBalanceReminderEnabled:organization.autoBalanceReminderEnabled,balanceReminderDaysBefore:organization.balanceReminderDaysBefore,automationsLastRunAt:organization.automationsLastRunAt,emailProviderConfigured:Boolean(organization.resendApiKey&&organization.senderEmail),smsProviderConfigured:Boolean(organization.twilioAccountSid&&organization.twilioAuthToken&&organization.twilioFromNumber),confirmationsSentCount,remindersSentCount,balanceRemindersSentCount,recent},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return authzErrorResponse(e);}}
export async function PATCH(req:NextRequest){try{
 const organization=await requireCurrentOrganization(),session=await requireOwnerSession(organization.id);
 if(session.effectiveUserId||!tenantMutationOriginAllowed(req,organization))return NextResponse.json({error:'Use the tenant owner’s own sign-in to change sending authorization.'},{status:403});
 const body=await req.json().catch(()=>null);if(!body)return NextResponse.json({error:'Provide automation settings.'},{status:400});
 const data:Record<string,boolean|number>={};
 for(const field of ['autoConfirmationEnabled','autoReminderEnabled','autoBalanceReminderEnabled'])if(typeof body[field]==='boolean')data[field]=body[field];
 for(const field of ['reminderDaysBefore','balanceReminderDaysBefore'])if(typeof body[field]==='number'&&Number.isFinite(body[field])&&body[field]>=1&&body[field]<=30)data[field]=Math.round(body[field]);
 await prisma.organization.update({where:{id:organization.id},data});
 await logActivity({organizationId:organization.id,performedBy:session.id,action:'Updated automation settings'});
 return NextResponse.json({success:true});
 }catch(e){return authzErrorResponse(e);}}
export async function POST(request:Request){try{
 const organization=await requireCurrentOrganization(),session=await requirePermission(organization.id,'customers.message');
 if(session.effectiveUserId||!tenantMutationOriginAllowed(request,organization))return NextResponse.json({error:'Use the tenant’s own authorized sign-in to send messages.'},{status:403});
 const result=await runBookingAutomations(organization.id);return NextResponse.json(result);
 }catch(e){return authzErrorResponse(e);}}
