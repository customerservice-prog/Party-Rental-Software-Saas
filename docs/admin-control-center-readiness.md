# Control-center continuation — September 21, 2026

Scope: Party Rental CRM only, customerservice-prog/Party-Rental-Software-Saas.
Existing tenant impersonation, permissions, MFA, security controls, exports,
communications, flags, catalog and account-management workflows are preserved.

## Added / corrected

- Tenant user directory with safe field selection, search, pagination, and links
  to audited support controls and per-user tenant impersonation.
- Dedicated integrations directory with explicit read-only Stripe Connect,
  Resend sender-domain and Twilio account inspections. Provider credentials
  remain server-side. No messages or charges are issued. Domain DNS/SSL is
  explicitly unverified and never fetched from a tenant-controlled address.
- Per-tenant Stripe subscription/invoice inspector, local/remote discrepancy
  warnings, test-mode labels, safe customer-linkage checks and audit records.
  Inspection does not synchronize or modify subscriptions.
- Billing reports distinguish configured list-price estimates from net MRR.
  Custom/founding/unknown prices remain unestimated, rather than invented as
  zero. Active local records are not labeled paid customers.
- Onboarding measures four core milestones; optional SMS/custom domains do not
  reduce core progress. Integration readiness is reviewed separately.
- Health reports catch individual probe failures, distinguish absent telemetry
  from operational status, and exclude disabled/inactive automation runners.
- Overview no longer calculates platform totals from 250 sampled tenants.
- Analytics identifies current status shares rather than claiming historical
  paid conversion, retention or churn from a snapshot.
- Grouped mobile navigation and responsive cards on the redesigned directories.

## Validation

`node --test tests/*.test.cjs`, `npx tsc --noEmit`, `npm run build`.
The GitHub workflow also provisions an isolated PostgreSQL service, runs actual
admin sign-in, checks admin routes at desktop/mobile widths, and exercises
search/pagination, no-credential provider checks, tenant view and exit.
Synthetic fixtures are guarded to a local CI database, with no provider keys.
Production accounts, messages and billing are not used as test fixtures.
See the exact commit's Actions result and uploaded report/screenshots for the
actual result; this document is not a claim that every check passed.

## Still outside this continuation

A reconciled platform MRR/ARR ledger with discounts and grandfathered pricing;
durable webhook/job history and retry operations; cohort retention and feature
analytics; verified domain SSL/ownership monitoring; successful backup restore
proof; granular platform-admin permission tiers; and complete authenticated
production end-to-end validation. Account/plan settings and data controls need
separate verification before treating every broad launch requirement as done.
