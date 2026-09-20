# Marketing remodel — September 20, 2026

The homepage now leads with a captioned, one-minute animated product tour, followed by rental workflows, setup steps, shared-plan pricing, and trial FAQs. The tour is an HTML/CSS interface illustration with fictional data, not a recording or a connected tenant account. It supports chapters, pause, replay, seeking, and reduced-motion preferences. The dedicated demo page uses the same tour.

Signup now suggests the business address, formats server validation errors safely, recovers from network failures, and passes the new business slug into the sign-in form. No authentication or tenant permissions were relaxed. Malformed signup JSON returns a validation response without creating an account.

## Verified before deployment

- 49 regression tests passed, including signup error handling and malformed requests.
- Production build passed, including TypeScript checks and static page generation.
- Browser service failed to connect before opening a page. Visual layout, tour interaction, and authenticated signup-to-dashboard checks remain unverified in a real browser.

## Remaining launch gaps

1. Measure homepage visits, tour engagement, signup starts/completions, and first meaningful tenant activity. No measured funnel was available in this review; zero new tenants alone does not distinguish insufficient traffic from conversion or onboarding problems.
2. Collect genuine feedback and proof from the first pilot businesses. No testimonials or business results were invented for this page.
3. Platform subscriptions still need manual activation. The homepage and signup now disclose this. Automatic paid-plan checkout remains separate work.
4. Confirm that the contact page inbox, hello@partyrentalcrm.com, is monitored. Its source still contains a launch reminder; delivery to that inbox was not tested.
5. Complete desktop/mobile browser checks, a fresh tenant onboarding session, and administrator tenant-view checks when the browser service is available. Existing authorization regression tests do not substitute for that walkthrough.

No live tenant was created, customer message sent, or billing configuration changed during this marketing update.
