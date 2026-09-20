# Tenant workspace redesign — September 20, 2026

The tenant account now uses a shared workspace shell: a dark green desktop
sidebar with grouped tools, a compact header with order search, and a mobile
navigation drawer plus bottom shortcuts. Existing routes and owner-only menu
visibility are retained. The drawer uses a native modal dialog for focus trapping
and Escape-to-close behavior. The impersonation banner remains above the header.

The overview, order directory, order detail, customer directory, and inventory
screen have been rebuilt around common headings, panels, status badges, actions,
and empty states. Other tenant screens inherit the navigation, spacing, typography,
and form styling. This release is not a claim that every specialist screen has
been individually redesigned or visually verified.

## Behavior changes

- Overview prioritizes today's bookings, upcoming events, quote/pending follow-ups,
  and team tasks. The monthly calendar and popular items remain available below.
- Net payments use recorded payments less refunds over the last 30 days.
  Outstanding balances aggregate eligible active, confirmed, and completed orders;
  neither amount is calculated from a five-order sample anymore.
- Event-day boundaries use the tenant's local calendar date. Event date labels use
  UTC date components to preserve the date-only values entered in booking forms.
- Orders support full-name/email/order-number search, existing status filters,
  balance-due filtering, 25-row pagination, and corresponding CSV export filters.
- Customer directories have 25-row pagination, full-name/contact search, date
  filters, mobile cards, and matching CSV export filters.
- Inventory adds search, condition/visibility filters, summary counts, clearer
  photos and statuses, collapsible creation forms, and retryable load errors.
  Existing catalog, import/export, item editing, units, and add-on controls remain.
- Order details group items and payments alongside customer, delivery, and
  agreement information. Existing payment, portal, status, driver, fulfillment,
  and task components retain their APIs.

## Validation

`node --test tests/platform-admin.test.cjs`: 47 checks pass. New coverage exercises
local event dates, invalid date inputs, aggregate totals, tenant scoping,
search/pagination, and filtered exports. Existing admin/impersonation checks pass.
`npx tsc --noEmit` and the full `npm run build` production build pass.

Live authenticated visual verification remains blocked: the provided browser
service times out while listing tabs, before it can open this application.
Do not represent source/SSR tests or a successful deployment as visual QA.
