import {NextRequest,NextResponse} from 'next/server';
import type Stripe from 'stripe';
import {stripe} from '@/lib/stripe';
import {acceptBillingEvent} from '@/lib/platformBillingLedger';
export const dynamic='force-dynamic';
export async function POST(request:NextRequest){
 const secret=process.env.STRIPE_PLATFORM_WEBHOOK_SECRET,signature=request.headers.get('stripe-signature');
 if(!secret)return NextResponse.json({error:'Platform webhook is not configured.'},{status:503});
 if(!signature)return NextResponse.json({error:'Missing signature.'},{status:400});
 let event:Stripe.Event;
 try{event=stripe.webhooks.constructEvent(await request.text(),signature,secret);}catch{return NextResponse.json({error:'Invalid webhook signature.'},{status:400});}
 try{return NextResponse.json({received:true,...await acceptBillingEvent(event)});}
 catch{console.error('Platform billing reconciliation failed; receipt retained for retry.');return NextResponse.json({error:'Reconciliation did not complete. Retry this event.'},{status:503});}
}
