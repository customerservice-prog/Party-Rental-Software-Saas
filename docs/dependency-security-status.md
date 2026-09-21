# Dependency security follow-up — September 21, 2026

The initial audit of the deployed Next 14.2.35 dependency graph reported eight
vulnerable package entries (seven high and one critical), including two runtime
entries: Next and its nested PostCSS. This is package advisory coverage, not
proof of exploitation or eight independently reachable application flaws.
Audit evidence: GitHub Actions run 35606953222, dependency-audit-evidence.

## Immediate mitigation and targeted updates

- Disable server image optimization globally and remove wildcard remotePatterns.
  Original images remain direct URLs. CI explicitly requires /_next/image to
  return 404 and the public homepage to return 200 without optimized image URLs.
- Align eslint-config-next with the deployed Next 14.2.35 release line.
- Override vulnerable nested PostCSS, glob and minimatch dependencies with
  patched versions in the same major release lines, then run the full build and
  authenticated desktop/mobile suite.
- Preserve complete and runtime-only audit JSON in every validation artifact.

The optimizer mitigation addresses exposure to GHSA-2xp9-vwfh-vxw4 (untrusted
AVIF optimization), but is NOT a framework upgrade or a clean audit assertion.
It also sacrifices server-side image resizing until a patched optimizer is
restored. Actual test/audit outcomes must be read from the exact commit's run.

## Required framework upgrade remains open

Next 14.2.35 remains in affected version ranges for additional framework
advisories. The reviewed AVIF advisory lists 15.5.24 and 16.3.3 as patched releases.
An upgrade must also migrate and test async request APIs, tenant routing, sign-in,
Server Actions, caching, checkout, public storefronts and provider webhooks.
Do not mark the platform security-complete or re-enable optimization merely
because the admin pages render or the isolated build succeeds. No production
credentials, customer billing or messages are used by the tests.
