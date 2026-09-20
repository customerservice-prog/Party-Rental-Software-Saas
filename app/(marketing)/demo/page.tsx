import Link from "next/link";
import type {Metadata} from "next";
import {pageMetadata} from "@/lib/seo";
import ProductTour from "../_components/ProductTour";
import "../_components/marketing-home.css";
export const metadata:Metadata=pageMetadata({title:"Watch the Product Tour",description:"See bookings, inventory, payments, delivery planning and the rental website in a one-minute animated walkthrough. No signup required.",path:"/demo"});
export default function DemoPage(){return <div className="crm-marketing"><section className="crm-section"><div className="crm-wrap"><div className="crm-center-heading mb-10"><p className="crm-eyebrow">SEE IT BEFORE YOU SIGN UP</p><h1 className="mt-4 text-4xl font-medium tracking-tight text-[#263e32] sm:text-5xl">A rental weekend.<br/>One connected workspace.</h1><p>Play the one-minute walkthrough, or choose a chapter to explore.</p></div><ProductTour/><div className="mt-10 text-center"><p className="mb-5 text-sm text-slate-500">Ready to explore it with your own rental items?</p><Link className="crm-cta" href="/signup">Start your free trial →</Link></div></div></section></div>}
