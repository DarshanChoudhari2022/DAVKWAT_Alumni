# DAVKAWT Alumni Portal — Homepage Copy Deck (Final)

**Official portal of the DAV Khagaul Alumni Welfare Trust — Khagaul, Bihar, India.**

This is the consolidated, production-ready content deck for the homepage. It merges the
core structure with the **paid membership** model. Copy is written for a multi-generational
audience (a retired teacher and a young engineer should both read it comfortably).

## How to use this document
- Text in `[BRACKETS]` is a placeholder — replace with real data or remove. Never ship invented values.
- Placeholders map to real plan fields in `app/(admin)/admin/settings/MembershipPlanForm.tsx`:
  - `[PLAN_NAME]` → plan `name`
  - `[REAL_AMOUNT]` → plan `amount` (₹)
  - `[PERIOD]` → derived from `membership_type` (annual / lifetime) and `duration_months`
- Brand accent navy: `#0F2557`. Warm off-white background, one restrained accent.
- **Do not** publish any section that would require fake numbers, names, events, or testimonials.

---

## NON-NEGOTIABLES BEFORE LAUNCH (paid model)
1. Remove all contradictory / invented data from the live site (the "1+" vs "10,240" alumni
   count, fake RSVPs, invented classmate names, the self-attributed testimonial).
2. State the membership fee, what it covers, and the period plainly. No hidden charges.
3. Surface the Refund Policy and secure-payment cues near every payment CTA.
4. Lead with belonging and giving back; reveal the contribution amount once interest exists.

---

# SECTION INDEX

1. Header / Navigation
2. Hero
3. Official & verified (trust band)
4. Why register
5. Membership that gives back (Fee + welfare)
6. How membership works
7. Events & announcements (live feeds)
8. Directory preview (privacy-first)
9. Alumni voices (real only — hidden until available)
10. Privacy & your data
11. Final CTA
12. Footer

---

# 1 — Header / Navigation

```
Brand: DAV Khagaul Alumni Welfare Trust
Nav: About the Trust · Events · Announcements · Directory
CTA (secondary): Member sign in
CTA (primary): Register as alumnus
```

---

# 2 — Hero

```
Eyebrow: The official alumni portal of the DAV Khagaul Alumni Welfare Trust

Headline: Reconnect with your DAV Khagaul family.

Subtext: One trusted place to find your batchmates, receive official Trust
updates, attend reunions, and support the school that shaped you — through a
single, verified alumni membership.

CTA (primary): Register as alumnus
CTA (secondary): Member sign in

Assurance line: Open to former students and teachers of DAV Khagaul.
Every registration is reviewed by the Trust before your account is activated.
```

Optional real-metric line (use ONLY if you have real verified figures; otherwise omit):
```
Trusted by over [REAL_COUNT] verified alumni across [REAL_BATCH_COUNT] batches.
```

> Keep the price OUT of the hero. Lead with belonging; reveal the contribution in Section 5.

---

# 3 — Official & verified (trust band)

```
Section heading: An official portal, built on trust

Intro: This portal is created and managed by the DAV Khagaul Alumni Welfare
Trust. It exists to keep our alumni community connected — safely, privately,
and for the long term.

Point 1
Title: Managed by the Trust
Text: Run directly by the DAV Khagaul Alumni Welfare Trust, a registered
educational trust in Bihar, India — not a third-party service.

Point 2
Title: Verified before activation
Text: Every registration is reviewed by the Trust committee against school
records before the account goes live, so the network stays alumni-only.

Point 3
Title: Your data, treated with care
Text: Your details are kept private and are never sold or shown publicly. You
choose what fellow alumni can see.

Link: View membership guidelines →
```

---

# 4 — Why register

```
Section heading: Why join the alumni network

Intro: Registering takes a few minutes and keeps you connected to the people
and updates that matter — for years to come.

Benefit 1
Title: Find your batch again
Text: Search by batch year, course, city, and profession to reconnect with
classmates and teachers you may have lost touch with.

Benefit 2
Title: Never miss a reunion
Text: Get invitations to reunions, silver jubilees, and city chapter meets as
soon as the Trust announces them.

Benefit 3
Title: Official updates, direct to you
Text: Receive Trust circulars, welfare initiatives, and community news from
the source — not through forwarded messages.

Benefit 4
Title: Mentorship and careers
Text: Offer guidance to juniors, or find seniors and peers in your field who
are glad to help the next generation of DAV Khagaul.

Benefit 5
Title: Lifelong, verified connections
Text: Your membership keeps you part of a maintained, committee-verified
network — so classmates can still find you years from now, across any city or
country.

Benefit 6
Title: Your contribution gives back
Text: Part of your membership directly supports welfare initiatives for
current students and alumni — so reconnecting also means giving back to
DAV Khagaul.
```

---

# 5 — Membership that gives back (Fee + welfare)

```
Section heading: Membership that gives back

Intro: Membership of the DAV Khagaul alumni network is supported by a modest
contribution. It keeps the portal running securely — and a part of it goes
directly toward welfare initiatives for current students and alumni in need.

— Fee —
Plan name: [PLAN_NAME]
Amount: ₹[REAL_AMOUNT] / [PERIOD]
Note: One simple contribution. No hidden charges.

(Add additional plans only if they are real — e.g., an annual option alongside
a lifetime option. Do not invent tiers.)

— What your contribution supports —
Point 1: Secure upkeep of the verified alumni portal and directory.
Point 2: Organising reunions, chapter meets, and mentorship circles.
Point 3: Welfare initiatives for students and alumni, run by the Trust.
Point 4: Keeping the network genuine, private, and well-maintained over time.

Assurance line: Payments are processed securely. Refunds are handled as per
our Refund Policy.

CTA (primary): Register as alumnus
Link (secondary): View what's included →
```

Optional transparency line (use ONLY if true and approved by the Trust):
```
[REAL_PERCENT or REAL_AMOUNT] of every membership goes toward Trust welfare
initiatives.
```

---

# 6 — How membership works

```
Section heading: How membership works

Intro: A simple, vetted process that keeps the network genuine and
alumni-only.

Step 1
Title: Complete your registration
Text: Share your batch year, course, and contact details. It takes only a few
minutes.

Step 2
Title: Trust committee review
Text: The Trust verifies your details against school records to keep the
network alumni-only. This may take a little time.

Step 3
Title: Activate your membership
Text: Once approved, complete your membership contribution through our secure
payment partner and sign in to access the full network.

Helper: Payments are secure and covered by our Refund Policy.

CTA (primary): Register as alumnus
Helper line: Already a member? Member sign in
```

> Sequencing note: review BEFORE payment is the more trustworthy order — people pay only
> once they know they qualify. If your system charges first, change Step 2/3 wording to say
> so plainly. Either way, be honest about the order.

---

# 7 — Events & announcements (live feeds)

```
Section heading: Latest from the Trust

Intro: Upcoming events and official announcements, published directly by the
DAV Khagaul Alumni Welfare Trust.

Column A
Title: Upcoming events
Link: View all events →
[Live event feed]
Empty state: No upcoming events yet. Reunions, chapter meets, and mentorship
circles will appear here as soon as the Trust schedules them. Register to be
notified first.

Column B
Title: Announcements
Link: View all announcements →
[Live announcement feed]
Empty state: No announcements published yet. Official circulars and community
updates from the DAV Khagaul Alumni Welfare Trust will appear here.
```

> Never place staged activity (fake RSVPs, fake reply counts) anywhere on the page while
> these feeds can be empty. The contradiction is the fastest way to lose trust.

---

# 8 — Directory preview (privacy-first)

```
Section heading: A verified directory of DAV Khagaul alumni

Intro: Once your membership is approved, you can search a directory of fellow
verified alumni — and decide exactly what others can see about you.

Point 1: Search by batch year, course, city, country, and profession.
Point 2: See only committee-approved alumni — no public listings, no
outsiders.
Point 3: Control whether your email and phone are visible, hidden, or shared
only with your batch.
Point 4: Build and join city chapters to meet alumni near you.

Note: The directory is visible only to verified members after sign-in. It is
never public.

CTA (secondary): Register to access the directory
```

> Visual placeholder: use generic batch-year tiles or anonymized avatars. Do NOT populate
> with named individuals unless they are real, verified members who consented to appear.

---

# 9 — Alumni voices (real only — keep hidden until available)

```
Section heading: In our alumni's words

Quote 1: "[Add a real quote here.]"
— [REAL_ALUMNUS_NAME], Batch [YEAR]

Quote 2: "[Add a real quote here.]"
— [REAL_ALUMNUS_NAME], Batch [YEAR]

Quote 3: "[Add a real quote here.]"
— [REAL_ALUMNUS_NAME], Batch [YEAR]
```

> Leave this section OUT of the live page until at least one genuine, consented quote exists.
> An absent section beats an invented one.

---

# 10 — Privacy & your data

```
Section heading: Your privacy comes first

Text: We know your contact details are personal. This portal is designed so
you stay in control — your information is used only to keep you connected to
the DAV Khagaul alumni community.

Point 1: You decide what's visible. Choose what fellow alumni can see, and
update it anytime.
Point 2: Never sold, never public. Your data is not sold, advertised, or
shown to anyone outside the verified network.
Point 3: Alumni-only access. Only members approved by the Trust can view the
directory.

Link: Read our Privacy Policy →
```

---

# 11 — Final CTA

```
Headline: Your batch is waiting.

Text: Join the official DAV Khagaul alumni network and stay connected to the
people, memories, and milestones that shaped you.

CTA (primary): Register as alumnus
CTA (secondary): Member sign in
```

---

# 12 — Footer

```
Brand: DAV Khagaul Alumni Welfare Trust

Description: Connecting generations of DAV Khagaul alumni from Khagaul, Bihar —
fostering community, mentorship, reunions, and lasting friendships.

Contact: davkawt.admin@gmail.com

Column — Portal:
- About the Trust
- Register as alumnus
- Member sign in
- Events
- Announcements

Column — Contact:
- [Add Trust office address — PLACEHOLDER]
- davkawt.admin@gmail.com
- [Social links — add from Admin Settings when available]

Column — Legal:
- Privacy Policy
- Terms of Service
- Refund Policy

Bottom line: © [YEAR] DAV Khagaul Alumni Welfare Trust. All rights reserved.
Registered Educational Trust — Bihar, India.
```

---

# MICROCOPY & UX DETAILS

## CTA / Button labels (use consistently sitewide)
- `Register as alumnus` — primary action everywhere
- `Member sign in` — returning, approved members
- `Learn how membership works` — anchors to Section 6
- `View membership guidelines` — eligibility + review process
- `View what's included` — anchors to Section 5
- `View all events`
- `View all announcements`
- `View directory` (signed-in) / `Register to access the directory` (visitors)
- `View Refund Policy` — near checkout and footer
- `Complete membership` — checkout button (clearer than "Pay now"; A/B vs "Pay securely")
- `About the Trust`
- `Read our Privacy Policy`

## Registration form intro (register page)
```
Register as a DAV Khagaul alumnus
This form is for former students and teachers of DAV Khagaul. Share a few
details so the Trust can verify your connection to the school. It takes only a
few minutes, and your information stays private.
```

## Verification info line (after submit)
```
Thank you — your registration has been received.
The Trust committee will review your details against school records before
activating your account. You'll be notified by email once it's approved. This
review helps us keep the network genuine and alumni-only.
```

## Payment & checkout microcopy
```
Checkout intro:
Complete your DAV Khagaul alumni membership
Your contribution keeps the network running and supports Trust welfare
initiatives. You're almost there.

Secure payment line:
Payments are processed securely through [PAYMENT_PARTNER].
We do not store your card or bank details.

Amount confirmation:
Membership: [PLAN_NAME] — ₹[REAL_AMOUNT] / [PERIOD]

Refund reassurance:
Changed your mind? Refunds are handled as per our Refund Policy.

Post-payment success:
Welcome to the DAV Khagaul alumni network.
Your membership is active. You can now sign in to explore the directory, join
your batch, and view official Trust updates. A receipt has been sent to your
email.

Payment pending / failed:
Your payment didn't go through.
No amount has been deducted. You can try again, or contact us at
davkawt.admin@gmail.com for help.
```

## Empty states
```
Events: No upcoming events yet. Reunions, chapter meets, and mentorship
circles will appear here as soon as the Trust schedules them. Register to be
notified first.

Announcements: No announcements published yet. Official circulars and
community updates from the DAV Khagaul Alumni Welfare Trust will appear here.
```

## Micro-reassurances (use sparingly, near CTAs)
- Under hero CTA: `Reviewed by the Trust committee before activation.`
- Near payment CTA: `Secure payment · No card details stored · Refund Policy applies.`
- Near email/subscribe: `We never share or sell your email. Unsubscribe anytime.`

---

# VISUAL / UX NOTES BY SECTION

1. **Header.** Slim, calm, fixed. Wordmark left, short nav, one filled "Register as alumnus"
   button; "Member sign in" as a quiet link. No emojis.
2. **Hero.** Two columns on desktop: copy + two CTAs + verification line on the left; a real,
   warm image (campus, school gate, consented reunion photo) on the right — never a fabricated
   dashboard. Off-white background, deep navy (#0F2557) text, one restrained accent. No metrics
   unless real.
3. **Official & verified.** A distinct horizontal band in a slightly deeper tone. Three columns,
   small line icons (shield, check, lock). The gravitas anchor — quiet and uncrowded.
4. **Why register.** Clean 2–3 column benefit grid, simple icons, human headings, generous
   spacing, large readable type. Readability over decoration.
5. **Membership that gives back.** A single calm Fee card centered — NOT a 3-tier SaaS wall.
   The "what your contribution supports" list deserves equal visual weight to the amount. Welfare
   framing stays visible. Secure-payment + refund cues sit close by.
6. **How membership works.** Horizontal 3-step row (stacked on mobile), numbered markers, a
   connecting line. Understated; reassurance over flash. One centered primary CTA.
7. **Events & announcements.** Two equal columns on live data. Identical visual weight whether
   full or empty, so an empty feed never looks broken. Soft, friendly empty states.
8. **Directory preview.** Show the concept of search (subtle search bar, filter chips) plus
   privacy toggles, using anonymized avatars or batch-year tiles — never named people. Make the
   "verified members only, never public" note prominent.
9. **Alumni voices.** When real: simple quote cards, generous whitespace, name + batch in accent
   color, optional consented photo. Hidden entirely until real.
10. **Privacy & your data.** Focused, text-led band: short paragraph + three bullets with small
    lock/eye/check icons. Calm, plain, sincere. This converts cautious senior alumni.
11. **Final CTA.** Centered, spacious, one warm line, one filled button. Subtle accent tint
    background to close gently.
12. **Footer.** Multi-column, institutional. Trust description left, link columns right,
    registered-trust line and copyright in muted text. The digital equivalent of an official
    letterhead.
