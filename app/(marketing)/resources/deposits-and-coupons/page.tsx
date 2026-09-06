import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "How Deposits and Coupons Protect Rental Revenue",
  description:
    "The case for collecting a deposit up front and using coupon codes deliberately, rather than discounting every order that asks.",
  path: "/resources/deposits-and-coupons",
});

export default function DepositsAndCouponsArticle() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/resources" className="text-sm font-medium text-orange-600">
        &larr; Back to Resources
      </Link>

      <h1 className="mt-6 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
        How Deposits and Coupons Protect Rental Revenue
      </h1>

      <div className="prose prose-gray mt-8 max-w-none text-gray-700">
        <p>
          Rental equipment leaves the warehouse before it's fully paid
          for, which puts a rental business in a different position than
          most retailers. Two small tools, a deposit collected at booking
          and a coupon system that's used on purpose rather than by
          default, go a long way toward protecting revenue without
          making the booking process feel unfriendly.
        </p>

        <h2>A deposit sets the booking, not just the intent</h2>
        <p>
          Collecting a deposit at the time an order is placed turns a
          tentative request into a real reservation. It also gives the
          business a cushion if equipment comes back damaged or a booking
          is cancelled close to the event date.
        </p>

        <h2>Automatic deposits remove the awkward conversation</h2>
        <p>
          When the deposit is built into the checkout or order-creation
          flow, staff don't have to ask each customer for a deposit
          individually, and customers see it as a normal part of booking
          rather than a special request aimed at them.
        </p>

        <h2>Coupons work best as a deliberate tool</h2>
        <p>
          A coupon code that has to be entered, rather than a discount
          applied automatically, keeps price reductions tied to an actual
          decision, a referral program, a slow-season promotion, a
          returning customer, instead of becoming the default price
          everyone expects.
        </p>

        <h2>Reporting shows whether discounting is working</h2>
        <p>
          Because coupon use is tracked against orders, it's possible to
          see which codes are actually driving bookings versus which ones
          are just cutting into revenue on orders that would have
          happened anyway.
        </p>

        <p>
          This is one piece of how the platform handles payments and
          pricing. See the full breakdown on the{" "}
          <Link href="/features" className="text-orange-600">
            features page
          </Link>
          , or see how it applies to self-serve bookings on the{" "}
          <Link
            href="/solutions/party-supply-rental"
            className="text-orange-600"
          >
            party supply rental solutions page
          </Link>
          .
        </p>
      </div>
    </article>
  );
}
