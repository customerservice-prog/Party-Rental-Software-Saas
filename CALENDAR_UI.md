# Tenant-Scoped Booking Calendar - Design

This document describes the design for the booking/scheduling calendar,
the first major UI surface planned for Phase 1 of the roadmap. It builds
directly on the Prisma models added for scheduling support (BusinessHours,
ClosedDate) and the existing Order/Customer/Driver models.

## Route

app/(dashboard)/scheduling/page.tsx, rendered per organization using the
same tenant-resolution pattern used elsewhere in the control panel (the
organization is resolved server-side from the session/host, then all
queries are scoped by organizationId).

## Layout

A month-view grid is the primary view, with a status filter bar above it
and a day-detail side panel that opens when a day is clicked.

## Data sources per day cell

Each day cell in the grid is rendered using three data sources, all scoped
by organizationId:

- ClosedDate and BusinessHours - determines whether the day is shown as
  closed (matching the "closed" labeling pattern seen in comparable rental
  platforms), including recurring weekly closures and one-off holidays.
- Order rows where eventDate falls on that day - grouped by deliveryType
  (delivery, pickup, overnight/multiday) to show small colored indicators.
- A count badge showing total bookings for the day.

## Status filter bar

Tabs above the grid mirror Order.status combined with deliveryType and
timestamps:

- Active - status is active
- Active - Deliver - status is active and deliveryType is delivery
- Active - Customer Pickup - status is active and deliveryType is pickup
- Sent Quotes - status is quote
- Canceled - status is canceled
- Orders Created - same active-order set, but grouped by createdAt
  instead of eventDate (for tracking recent booking activity rather than
  upcoming events)

## Day detail panel

Clicking a day opens a side panel listing that day's orders, each showing
the customer name, event time window, deliveryType, and a link to the
full order detail page. From here staff can also add a Task tied to that
order or customer.

## Tenant isolation

Every query in this feature (calendar data, filter counts, day detail
list) is scoped by organizationId at the query level, consistent with the
rest of the schema. No cross-tenant data is ever fetched in a single
request.

## Future extensions

- Driver-specific filtering (once route assignment UI is built in Phase 3)
- Drag-to-reschedule an order's eventDate directly on the grid
- Printable day/week view for warehouse staff preparing deliveries
