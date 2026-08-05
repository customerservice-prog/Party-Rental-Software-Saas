# Roadmap

A phased build plan for the Party Rental Software SaaS platform, informed by feature analysis of an established competitor (Event Rental Systems / ERS). Goal: reach feature parity incrementally, prioritizing the core operational loop before expanding into reporting, marketing, and platform-admin tooling.

## Phase 1 - Core Operations (MVP)
- Tenant-scoped inventory: categories, items, pricing, quantity/availability tracking
- Booking calendar with status views (active, pickup vs. delivery, quotes sent, canceled, incomplete)
- Basic CRM: customer records, search, lead source tracking
- Order/quote creation with digital contracts

## Phase 2 - Payments & Billing
- Stripe Connect integration for tenant customer payments
- Tenant subscription billing via Stripe
- Deposit rules (fixed amount or percentage-based)
- Coupons
- Basic invoices/receipts flow

## Phase 3 - Delivery & Routing
- Delivery-specific calendar view
- Driver assignment
- Route building
- Printable packing lists, invoices, and contracts for drivers

## Phase 4 - Reporting
Start small, expand based on tenant demand:
- Sales overview
- Payments / receivables
- Order list
- Customer list
- Basic inventory usage / ROI

## Phase 5 - Marketing & Automation
- Customer email/text campaign tool (in-house ERSMail equivalent)
- Automated booking confirmations/reminders
- Third-party integrations (Mailchimp, QuickBooks) instead of building ad-management tools in-house

## Phase 6 - Platform Admin & Tenant Onboarding
- Cross-tenant super-admin dashboard
- Tenant signup / subdomain claim flow
- Branding/theme setup per tenant
- Role-based access (Owner / Staff / Driver)
- Billing and support tooling for the platform operator

## Notes
- Admin/settings surface area (company config, integrations, website builder, product rules) should be built incrementally per tenant need rather than all upfront.
- Marketing features like SEO/Google Ads/Facebook Ads management in competitor products are often services upsells (human-delivered), not software features - consider integration hooks instead of building these in-house.
