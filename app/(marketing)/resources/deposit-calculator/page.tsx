import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import DepositCalculator from "./DepositCalculator";

export const metadata = pageMetadata({
  title: "Rental Deposit & Balance Calculator",
  description:
    "A free tool that calculates the deposit due at booking and the remaining balance owed, based on an order total and deposit percentage.",
  path: "/resources/deposit-calculator",
});

export default function DepositCalculatorPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/resources" className="text-sm font-medium text-orange-600">
        &larr; Back to Resources
      </Link>

      <h1 className="mt-6 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
        Rental Deposit &amp; Balance Calculator
      </h1>
      <p className="mt-4 text-lg text-gray-600">
        Enter an order total and a deposit percentage to see the deposit due
        at booking and the balance still owed before the event. This is a
        general planning guide, not a quote, actual deposit terms vary by
        contract.
      </p>

      <div className="mt-10">
        <DepositCalculator />
      </div>

      <div className="mt-16 rounded-lg border border-gray-200 bg-gray-50 p-8">
        <h2 className="text-xl font-semibold text-gray-900">
          Ready to track deposits and balances automatically?
        </h2>
        <p className="mt-2 text-gray-600">
          See how deposits, balances, and payment tracking come together on
          the{" "}
          <Link href="/features" className="text-orange-600">
            features page
          </Link>
          , or read more about{" "}
          <Link href="/resources/deposits-and-coupons" className="text-orange-600">
            deposits and coupons
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
