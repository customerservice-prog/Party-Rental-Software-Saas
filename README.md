# Party Rental Software SaaS

A multi-tenant, white-label event & party rental management platform. Businesses (bounce house rental companies, tent/table/chair rental shops, wedding rental companies, etc.) sign up as tenants and get their own branded storefront plus a shared back-office control panel to manage inventory, bookings, customers, delivery routing, and payments.

## Vision

Take the proven playbook of a single successful rental business (Friendly Party Rental) and turn it into a platform that thousands of independent rental business owners can run their own operations on - similar in spirit to Event Rental Systems (ERS), but built fresh with multi-tenancy as a first-class concept from day one instead of bolted on later.

## Core Concepts

- **Tenant / Organization**: Each rental business that signs up. Owns its own inventory, customers, orders, staff users, branding, and storefront domain/subdomain.
- - **Tenant Isolation**: Every piece of business data (inventory items, categories, customers, orders, drivers, coupons, etc.) is scoped to a single tenant. No tenant can ever see another tenant's data.
  - - **Storefront**: The public-facing booking site for a tenant's customers (e.g. `theirbusiness.ourplatform.com` or a custom domain), used to browse rentals and book online.
    - - **Control Panel**: The back-office dashboard tenant staff use to manage bookings, inventory, routing, payments, and reports.
      - - **Platform Admin**: Our own internal super-admin view across all tenants (billing, support, plan management).
       
        - ## Planned Tech Stack
       
        - - Next.js + TypeScript (App Router)
          - - PostgreSQL + Prisma ORM (tenant-scoped schema)
            - - Tailwind CSS
              - - Stripe (tenant subscription billing + Stripe Connect for tenant customer payments)
                - - Subdomain-based tenant routing via middleware

                ## Roadmap (high level)

                1. Multi-tenant data model (Organization + tenant-scoped core models)
                2. 2. Tenant-aware auth & role-based access (Owner, Staff, Driver roles per tenant)
                   3. 3. Tenant onboarding flow (signup, subdomain claim, branding setup)
                      4. 4. Core rental features per tenant: inventory, categories, online booking, orders
                         5. 5. Delivery/route management
                            6. 6. Billing: tenant subscription plans + in-app customer payments
                               7. 7. Reporting & analytics per tenant
                                  8. 8. Platform admin dashboard (cross-tenant visibility, support tools)
                                    
                                     9. This repository is under active early-stage development.
                                     10. 
