# Platform admin verification — September 20, 2026

Latest impersonation baseline: `c1269abbab510dbe8e41dc84476f3959c1e19b2e` on main,
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

## Tenant impersonation

- Organizations directory and organization detail now provide **View as tenant**;
  the support workspace provides **View as tenant owner** and **View as this user**.
- A signed, 20-minute session selects an active owner or staff member from that
  tenant. The dashboard uses their name and role, and APIs enforce their actual
  permissions, including owner-only restrictions and temporary-password gates.
- Authentication remains the platform administrator. Existing tenant mutation
  audit writes retain the administrator's ID; session start/end record the
  impersonated user's ID. Opening a view does not send automatic customer messages.
- The visible banner names the user and tenant, counts down, explains that edits
  affect live data, and exits to the tenant support workspace. Entry and exit use
  full navigation to clear previous dashboard content from the client cache.
- Disabled/deleted/moved users and revoked session versions terminate access.
  Suspended organizations cannot use tenant APIs. Forced-password and suspension
  blockers are explained in support view without bypassing them. Password changes
  cannot accidentally change the administrator's credential from a tenant view.
- This mirrors the application's tenant account context, not the customer's
  browser device, local storage, unsaved forms, or browser-specific failures.

## Reproducible validation

Run `node --test tests/platform-admin.test.cjs`, `npx tsc --noEmit`, and
`npm run build`. The regression suite invokes the real route handlers and
session callbacks against isolated data adapters; it does not modify production
accounts, publish announcements, initiate charges, or send customer messages.

At this review, all 42 regression tests, TypeScript checks, and the complete
Next.js production build passed. All 16 static admin page URLs redirected an
unauthenticated production request to `/platform-login`. Four admin read API
URLs also rejected or redirected unauthenticated requests.

## Verification limits and rollout behavior

Authenticated desktop/mobile browser interaction was not verified: the cloud
browser connection timed out before returning any tabs or opening the site.
The retry also failed with a browser recovery error and then a 20-second tab
refresh timeout, before any authenticated page could be opened.
Anonymous redirects demonstrate access protection, not functional validation
of the signed-in page. The tests use isolated adapters, not the production
PostgreSQL database or live payment/message providers.

Existing support-view cookies without a selected user and session version are
rejected by this release. Open a fresh support session from the tenant support workspace.
Regular administrator sign-ins are unaffected. Password changes now require
signing in again, as all previous sessions are revoked.

Still requiring authenticated browser QA: navigation and rendering of every
admin screen on desktop/mobile; reversible test-tenant provisioning, notes,
archive/reactivation, flags/settings round-trips, catalog import/export, and
sign-in/MFA workflows. Do not treat the earlier handoff's feature list as proof
that these end-to-end workflows have passed.
