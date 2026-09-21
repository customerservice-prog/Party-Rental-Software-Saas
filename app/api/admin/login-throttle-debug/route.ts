import {NextResponse} from 'next/server';
export async function GET(){return NextResponse.json({error:'This legacy development endpoint has been retired. Use the secured platform console.'},{status:410});}
export async function DELETE(){return NextResponse.json({error:'This legacy development endpoint has been retired. Use the secured platform console.'},{status:410});}
