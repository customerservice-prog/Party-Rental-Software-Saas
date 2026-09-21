# Operations release checklist — September 21, 2026

## Implemented scope

Party Rental CRM only. Actual subscription-price and recurring-discount snapshots;
durable signed webhook receipts and current-state recovery; least-privilege
platform roles; retired development bypasses; safe DNS/TLS inspection; recorded
operation history; privacy-minimized tenant-feature-day observation; mature
signup-cohort return activity; a catalog-readiness workspace; and 15 matched,
locally hosted photos with source provenance for common chairs, tables, tents
and concessions. Template content remains editable. Tenant stock, prices and
storefront visibility are never populated from photo-source data.

Usage observation stores tenant ID, a fixed feature name and UTC day only.
Support activity is excluded. Older accounts and immature windows do not become
fabricated zero-retention cohorts. Displayed cohorts cover at most 365 days of
signups; current-day usage is partial. Subscription snapshots are a covered
contractual run-rate, not an invoice cash ledger or historical revenue report.

## Deployment command

Set only this app service's production pre-deploy command to:

    node scripts/prepare-production.cjs

The command initializes an empty database, runs the existing additive metadata
initializer and first-admin bootstrap, preserves already established credentials,
adds missing reviewed template media without overriding customizations, and
records the actual observation start once. It never pushes the Prisma schema
onto a nonempty database. Missing declared core columns require an explicit,
reviewed migration instead of an automatic reset. Future schema changes must
supply such migrations. Do not restore the former broad production `db push`
command as a shortcut.

## Evidence required before merge

- Full regression, TypeScript and production build on the exact final head.
- Existing signed-in desktop/mobile, visual and populated catalog workflows.
- Real disposable-PostgreSQL ledger tests for old/duplicate/concurrent events.
- Actual restricted-role logins and denied direct administrator API writes.
- Actual ordinary tenant login, one authorized feature-day, and deduplication.
- All reviewed image hashes and initialized template records verified.
- Global custom-template values and tenant inventory preserved by reinitialization.
- Two repeated production preparations preserve complete row fingerprints for
  the checked business, account, grant, billing, usage and job-history tables.
- A real fixture dump restored into a different disposable database with matching
  checked table counts. The dump is removed, not exposed as a production backup.
- Matching Railway commit and successful deployment; anonymous public rollout
  checks and original static asset availability.

## Verification limits

The Railway backup-metadata read timed out, so production backup schedules and
production restore evidence remain unverified. Fixture restore tests are not
substitutes for them. Provider delivery and real tenant billing/checkout round
trips are not tested with live customers. No synthetic tenants, card charges or
customer messages are created in production by this verification.

The 15 photographed templates are a curated starter set, not a claim that every
optional template concept is photographed. Unpictured concepts remain visible in
Catalog readiness and can be completed with exact matching artwork. Permanent
tenant-data deletion, a live session-by-session registry, and a separately
scheduled customer-message worker are not introduced by this release. Existing
archive/export, session revocation, settings/flags/announcements and dashboard-
triggered booking automation remain available with their stated limitations.

See the final PR and workflow result for actual outcomes. This checklist by
itself does not assert that a pending build or production operation succeeded.
