import {NextResponse} from 'next/server';
export async function POST(){return NextResponse.json({error:'This legacy development endpoint has been retired. Use the secured platform console.'},{status:410});}
