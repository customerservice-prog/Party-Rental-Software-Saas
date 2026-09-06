import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Contact",
  description: "Get in touch with questions about the platform.",
  path: "/contact",
});

// NOTE: replace this with a real monitored inbox before launch.
const CONTACT_EMAIL = "hello@rentalos.app";

export default function ContactPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-20">
      <h1 className="text-4xl font-bold text-gray-900">Contact</h1>
      <p className="mt-4 text-gray-600">
        Whether you’re evaluating the software or already have an
        account and need help, the fastest way to reach us is email.
      </p>

      <div className="mt-10 grid sm:grid-cols-2 gap-8">
        <div className="border rounded-lg p-6">
          <h2 className="font-semibold text-gray-900">
            Considering signing up?
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Questions about features, pricing, or whether this fits your
            type of rental business.
          </p>
          <a
            href={"mailto:" + CONTACT_EMAIL}
            className="mt-4 inline-block text-brand-600 font-medium hover:underline"
          >
            {CONTACT_EMAIL}
          </a>
        </div>
        <div className="border rounded-lg p-6">
          <h2 className="font-semibold text-gray-900">
            Already have an account?
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            For account or technical support, email us with your business
            name and we’ll get back to you.
          </p>
          <a
            href={"mailto:" + CONTACT_EMAIL}
            className="mt-4 inline-block text-brand-600 font-medium hover:underline"
          >
            {CONTACT_EMAIL}
          </a>
        </div>
      </div>

      <p className="mt-10 text-sm text-gray-500">
        We aim to respond within one business day.
      </p>
    </div>
  );
}
