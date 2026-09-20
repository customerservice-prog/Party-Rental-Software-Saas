# Platform admin verification — September 20, 2026

Baseline reviewed: `63b1dc01a0065983ce9da57d9177532608a0c5c2` on main,
confirmed as the successful Railway production deployment.

## Corrections

- Security, Health, and Alerts share the actual sign-in lock thresholds, including burst locks; five failures no longer falsely show an account lock.
- Security Center login-lock clearing handles the actual UI payload rather than
  requiring an unrelated administrator target ID. Missing records return 404.
- Support responses contain selected user fields and integration booleans,
  excluding password hashes, MFA secrets, and provider credentials.
- Organization management responses exclude messaging-provider credentials.
- Tenant exports keep driver details but omit driver login PINs.
- Ownership transfer, account disabling, password changes, and admin MFA reset
  invalidate existing sessions. JWT refresh uses the current database role.
- Forced temporary-password replacement is checked by staff API authorization.
- Support sessions are signed, bound to the administrator, and checked for
  expiration on the server after 20 minutes. An expired session cannot fall
  back to the platform's internal organization or a host-selected tenant.
- Opening a support dashboard does not trigger customer messaging automations.
- Existing administrator credentials are preserved during deployment bootstrap;
  environment credentials initialize the first administrator only. Password
  changes made in the Security Center no longer get overwritten on deployment.
- Announcement audience filtering precedes the ten-message limit. Scheduling
  converts local input to UTC and back when editing, and rejects invalid dates
  and missing/invalid audiences.
- Plan overrides reject negative, fractional-limit, and non-finite input.
- Audit filters wrap at intermediate screen widths and display the correct
  500-record limit.

## Reproducible validation

Run `node --test tests/platform-admin.test.cjs`, `npx tsc --noEmit`, and
`npm run build`. The regression suite invokes the real route handlers and
session callbacks against isolated data adapters; it does not modify production
accounts, publish announcements, initiate charges, or send customer messages.

At this review, all 28 regression tests, TypeScript checks, and the complete
Next.js production build passed. All 16 static admin page URLs redirected an
unauthenticated production request to `/platform-login`. Four admin read API
URLs also rejected or redirected unauthenticated requests.

## Verification limits and rollout behavior

Authenticated desktop/mobile browser interaction was not verified: the cloud
browser connection timed out before returning any tabs or opening the site.
Anonymous redirects demonstrate access protection, not functional validation
of the signed-in page. The tests use isolated adapters, not the production
PostgreSQL database or live payment/message providers.

Existing support-view cookies use the previous unsigned format and are rejected
by this release. Open a fresh support session from the tenant support workspace.
Regular administrator sign-ins are unaffected. Password changes now require
signing in again, as all previous sessions are revoked.

Still requiring authenticated browser QA: navigation and rendering of every
admin screen on desktop/mobile; reversible test-tenant provisioning, notes,
archive/reactivation, flags/settings round-trips, catalog import/export, and
sign-in/MFA workflows. Do not treat the earlier handoff's feature list as proof
that these end-to-end workflows have passed.
