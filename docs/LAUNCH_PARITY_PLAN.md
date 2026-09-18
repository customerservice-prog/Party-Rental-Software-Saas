# PartyRentalCRM launch parity plan

Goal: make PartyRentalCRM a complete operating system for real party-rental companies, not a collection of dashboard pages.

## Production-safe implementation order

### P0 — booking and inventory correctness
- Order-level warehouse fulfillment: expected, loaded/out, returned, damaged, missing quantities.
- Serialized asset scan events tied to an order, staff member and timestamp.
- Availability must exclude maintenance/out-of-service/missing assets and respect event duration/buffers.
- Packages/bundles must derive availability from component inventory.
- Conflict explanations must tell staff exactly which item/date/order creates a shortage.
- Atomic booking protection against simultaneous overbooking.

### P0 — money correctness
- Unified order ledger for deposit, partial payment, balance, manual cash/check, refund, partial refund, damage charge and store credit/rain check.
- Payment actions must be idempotent and auditable.
- Deposit/security-deposit rules and automatic balance reminders/collection where configured.
- Tax/fee/discount snapshots on orders so historical totals do not change when settings change.

### P0 — fulfillment
- Packing/load checklist generated from each order.
- Delivery and pickup driver/crew assignment.
- Stop status: scheduled, loading, en route, arrived, completed, exception.
- Proof of delivery: name/signature/photo/note/time.
- Return reconciliation closes the fulfillment loop and restores only good inventory to availability.

### P1 — routing and field operations
- Drag/drop run building, stop ordering, estimated setup/service duration and vehicle assignment.
- Route optimization provider abstraction; never hard-code a single provider into order logic.
- Driver mobile/PWA: Today's Route → Stop → Navigate → Items → Notes → Photos/signature → Complete.
- Offline-tolerant field updates with retry/idempotency.
- Customer ETA/on-the-way notification.

### P1 — CRM
- Multiple customer contacts, phones, emails and addresses.
- Company/organization customers, venues, tags, lead source and tax-exempt metadata.
- Customer timeline combining orders, payments, contracts, messages, credits and internal notes.
- Store credit/rain-check balance and redemption history.

### P1 — staff
- Staff shifts, crew assignments, clock in/out, time off and role permissions.
- Order/run labor assignments and estimated vs actual labor time.
- Audit all sensitive actions.

### P1 — communications
- Unified customer/order timeline for email/SMS delivery events.
- Templates with tenant branding and safe variables.
- Booking confirmation, quote follow-up, incomplete checkout, balance due, event reminder, driver en route, pickup reminder, thank-you/review workflows.
- Communication provider adapters so tenants are not locked to one SMS/email vendor.

### P1 — storefront / tenant website
- Availability-aware checkout, packages/add-ons, delivery pricing, minimum order, exact-time option, multi-day rentals and blackout dates.
- Custom domain, SEO metadata/schema, editable navigation/pages/hero/category content and mobile-first checkout.
- Customer portal: quote/order, contract, payment, balance, event details and receipts.

### P2 — intelligence and integrations
- Accounting export/integration layer.
- Calendar/webhook/API integrations.
- Operational assistant must be permission-aware and preview destructive/financial/customer-message actions before execution.
- Natural-language questions: weekend risks, unpaid/unsigned orders, shortages, unassigned routes, overdue returns and maintenance conflicts.

## Release gates
Every module must pass these gates before it is called complete:
1. organizationId tenant isolation on every query/mutation;
2. role/permission enforcement;
3. database-backed state (no decorative fake controls);
4. idempotent financial/fulfillment mutations;
5. audit trail for sensitive changes;
6. empty/loading/error/mobile states;
7. build/typecheck and production health verification;
8. migration is additive/backward compatible and backed up before destructive changes.

## Navigation rule
Keep primary nav small: Home, Calendar, Orders, Inventory, Customers, Operations. Warehouse, Deliveries/Routing, Dispatch, Returns/Damage, Tasks, Automations, Reports, Communications, Staff and Settings belong under Operations/More. Do not solve feature depth by bloating navigation.
