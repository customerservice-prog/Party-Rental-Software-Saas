# Session registry, tenant lifecycle and scheduled booking worker

Review candidate only until its exact CI, production deployment and worker
configuration are verified. No production erasure or customer send is part of QA.

## New controls
- /admin/sessions: registered browsers, individual revocation with password and
  enabled MFA confirmation. Only hashed session keys persist server-side.
- /dashboard/sessions: a tenant user's own sessions; no support impersonation or
  cross-user revocation. New logins enter the registry. Pre-registry cookies keep
  account-version revocation and an absolute legacy expiry rather than silently
  acquiring unlimited rolling life.
- /admin/data/erasure: archive first, request a 30-day review, cancel or place a
  hold, download a complete business-data export, then explicitly confirm the
  database-only erasure. Live subscriptions, unresolved orders, active worker
  leases, missing exports, unknown tenant tables and cross-tenant references
  (including non-ORM package links) block it. No build, worker or GET deletes a
  tenant. Retention and external-provider/media obligations require separate
  review; exports omit authentication secrets and are not full backups.
- /dashboard/automations/schedule: explicit owner opt-in for bookings created
  after the latest enable time; email/SMS channels, local sending hours, rolling
  24-hour cap and recipient cooldown. Support impersonation cannot enable it.
- /admin/automation-worker: actual worker history, unknown-send review counts
  and an authenticated emergency pause/resume switch.

## Delivery semantics
The shared engine records a unique delivery claim before calling a provider.
Only a provider receipt records acceptance and sets an order's sent marker.
Timeouts and interrupted requests become unknown and are not automatically
retried. A provider may have accepted them: inspect its logs before any manual
resend. This intentionally prefers avoiding duplicate customer messages over
blind retry. Provider acceptance does not establish inbox delivery.

Old queued or processed messages are not replayed. At most six attempts occur
per tenant pass; a default 25-attempt rolling daily cap and 24-hour per-recipient
channel cooldown apply. Unconfigured providers do not stamp success. Candidate
scanning rotates a bounded cursor so blocked old bookings cannot indefinitely
starve later bookings. Existing activity-triggered configured delivery channels
remain separate from the new scheduled opt-in/channel switches. This is booking
communication, not platform marketing or an anti-spam guarantee.

## Deployment
App predeploy remains `node scripts/prepare-production.cjs`, which adds only
new lifecycle metadata and preserves existing records. A separate Railway
cron service uses this repository with `node scripts/automation-worker.cjs`,
`npm ci` build, `*/5 * * * *` UTC schedule, no HTTP healthcheck, no predeploy, and
restart NEVER. Only DATABASE_URL is required; use the private Postgres service
reference, not copied credentials. A worker closes connections and exits after
one bounded pass. Do not opt in tenants or add provider credentials on rollout.

## Verification
The lifecycle tests require localhost PostgreSQL under CI, with an additional
fixture-test switch for guarded deletion on a newly-created synthetic account.
Fake transport functions prevent real email/SMS calls. Browser tests use isolated
accounts. Repeated preparations and the separate restore drill compare complete
records across 18 populated tables, including all new lifecycle metadata.

One-time source-integration scripts and their write-enabled workflow are removed
from the release. All resulting application changes require exact-head tests.
Production backup scheduling and actual provider delivery remain separate checks
and are not established by fixture results.
