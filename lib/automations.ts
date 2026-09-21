import {prisma} from '@/lib/prisma';
import {runBookingBatch} from './automationEngine.cjs';
// Existing dashboard/manual entry points share the worker's durable duplicate
// claims. Only explicit successful provider responses set order sent markers.
export async function runBookingAutomations(organizationId:string){return runBookingBatch(prisma,organizationId);}
