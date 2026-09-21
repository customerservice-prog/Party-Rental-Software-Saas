# Party Rental CRM

Read version-matched Next.js documentation in `node_modules/next/dist/docs/` before changing request APIs, routing, caching or configuration. The reviewed upgrade is Next.js 16.3.5 / React 19.3.0; it uses Webpack to preserve the existing build behavior. Image optimization remains explicitly disabled.

Tenant scope must come from authenticated session or sanitized host routing. Preserve support-session expiry, actual tenant-user permissions, administrator audit attribution and all existing credential protections. Never use production tenant records or provider credentials as test fixtures.

Run the complete CI regression/typecheck/build/browser suite against disposable localhost PostgreSQL. A successful build is not evidence of real payment delivery or verified backups. Never fabricate operational metrics or populate public inventory with guessed stock.
