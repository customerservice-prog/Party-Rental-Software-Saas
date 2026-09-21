# Operations completion release

Scope: Party Rental CRM only. This release follows the deployed Next 16 migration.

## New operational controls

- Stripe subscription snapshots use actual linked price lines and quantities, not current marketing prices. Flat licensed monthly/yearly intervals are normalized, including interval counts. Supported expanded recurring percentage and fixed-amount discounts are included. One-time invoice discounts, tax, usage, credits, refunds, metered/tiered/transformed pricing, unexpanded or ambiguous discounts, paused collection and test/inactive subscriptions are not counted as recurring revenue. USD totals never add other currencies. Snapshots expire from aggregate coverage after 24 hours and unlinked/excluded accounts are disclosed. Historical recognized revenue is not claimed.
- Signed webhook receipts persist metadata, attempts, outcomes and safe errors. Duplicate deliveries cannot run concurrently. Recovery re-reads current Stripe subscription state rather than replaying older invoice status. Superseded subscriptions cannot replace a newer linkage. Test events cannot activate production tenant access. Provider errors return a retryable status rather than silently claiming completion. Receipt recovery does not charge a card or resend customer communications.
- Administrator grants enforce least-privilege access in pages and APIs. New accounts receive explicit grants; previously established administrators retain full access. Support sessions check the current grant. Role changes revoke the target's sessions, cannot change one's own grant, serialize conflicting changes and record before/after roles.
- Development schema sync, billing unblock, public throttle clearing and bootstrap routes are retired. Normal deployment scripts and secured admin workflows remain available. Global seed writes require catalog capability, not a tenant-owner login.
- Domain checks validate public hostname syntax, resolve and reject non-public addresses, pin a validated address and perform TLS certificate validation. No HTTP requests, redirects, cookies or credentials are sent to the target domain. Valid TLS does NOT prove domain ownership, correct CRM routing or successful checkout.
- Operations history distinguishes started/completed/partial/failed runs. Missing telemetry stays unverified. History begins with this release; prior deliveries and past customer conversions are not fabricated.

## Deployment requirement

Run `node scripts/ensure-operations-schema.cjs` before starting this release. It creates additive operational metadata tables without altering tenant inventory or credentials. Existing deployment schema/bootstrap commands must be preserved. Role enforcement deliberately fails closed when metadata cannot be read.

## Validation

`node --test tests/*.test.cjs`, TypeScript, production build, existing signed-in admin and catalog workflows, and new restricted-role browser checks run against disposable local PostgreSQL without live provider credentials. The database restore drill creates and restores a real fixture dump into a different local database, compares table counts and removes the dump. It is NOT a production backup or proof of a configured Railway backup schedule.

The one-time integration workflow is restricted to the named review branch and changes source only. Its generated commit requires inspection and a separate full validation run before merge. A generated source marker is not a passed-test claim.

## Not established by this release alone

Production scheduled-backup coverage, successful restoration of a real production backup, complete photographed template coverage, historical retention/cohort analytics, a fully observed production payment/message round trip, or a globally running message scheduler. No live customer accounts are used as test fixtures, and no customer payments or messages are initiated by verification.
