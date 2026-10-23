# Easebuzz checkout deployment

Registration offers Annual (INR 500 for 12 months) and Lifetime (INR 5,000, one-time).
The final step redirects to Easebuzz hosted checkout; QR codes and screenshot uploads are removed.
Payment verification grants membership independently of Trust approval. Faculty membership remains complimentary.

## 1. Apply the database migration

In the Supabase project used by the live site, open SQL Editor, create a query,
paste `supabase/migrations/0023_easebuzz_checkout.sql`, and run it.
This assumes the site's existing migrations have already been applied.
Alternatively, use the existing linked Supabase CLI workflow: `supabase db push`.

The migration adds a service-role-only atomic payment finalizer and sets existing
annual/lifetime plan prices to 500/5000. It preserves existing plan IDs and payment history.
Apply it before testing checkout: a successful callback cannot grant membership without it.

## 2. Add environment variables in Vercel

Open the Vercel dashboard, select the project linked to this repository, then
Settings -> Environment Variables. Add the following for Production (the deployment
environment serving davkawt.org); also select Preview if you want sandbox payments there.

| Name | Value |
| --- | --- |
| `EASEBUZZ_KEY` | The Easebuzz test merchant key provided by support |
| `EASEBUZZ_SALT` | The matching test salt provided by support (keep server-only) |
| `EASEBUZZ_ENV` | `test` |
| `NEXT_PUBLIC_APP_URL` | `https://davkawt.org` |

Keep the existing `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY` for the same database. Resend variables enable optional emails.
There is no Razorpay key and no `NEXT_PUBLIC_EASEBUZZ_*` variable required.
Never put the salt in a variable beginning with `NEXT_PUBLIC_` or commit real credentials.

The local `.env.local` is ignored by Git. The supplied test credentials have been added
locally, but the local Supabase credentials still need to be configured for a full flow.

## 3. Redeploy

After saving the variables, open Deployments, choose the latest deployment from main,
then Redeploy. Environment changes only apply to new deployments.
For previews, set `NEXT_PUBLIC_APP_URL` to that deployment's accessible HTTPS origin.

## 4. Gateway callbacks

- Success and failure return URL (sent automatically by the app):
  `https://davkawt.org/api/payments/verify`
- Server-to-server webhook URL (configure with Easebuzz if enabled on the account):
  `https://davkawt.org/api/payments/webhook`

These POST endpoints must be publicly accessible without deployment protection.
The browser return and webhook share signature verification and an atomic database
transaction, so repeated callbacks cannot grant duplicate membership or downgrade a successful payment.

## 5. Test

1. Register a new alumni account and complete the first four steps.
2. On Membership & Payment, choose Annual (500) or Lifetime (5,000).
3. Continue to Easebuzz. Use the test card details from the support email.
4. After payment, verify the email if requested, then sign in.
5. Confirm the payment is successful in Admin -> Payments; check that annual membership
   has a one-year expiry and lifetime membership has no expiry. Trust approval remains separate.
6. Test cancellation/failure, sign in, and retry from the registration payment page.
7. Confirm that refreshing/replaying a callback does not extend membership again.

To check only the supplied sandbox credentials locally (creates a checkout but makes no charge),
run in PowerShell:

```powershell
$env:EASEBUZZ_SANDBOX_SMOKE='1'
npm run test:run -- lib/easebuzz/sandbox-smoke.test.ts
Remove-Item Env:EASEBUZZ_SANDBOX_SMOKE
```

## Live payments later

Replace both test credentials with the live merchant credentials and set
`EASEBUZZ_ENV=production`, then redeploy. Leave `EASEBUZZ_ENV=test` for the current test credentials.

Use the live key and matching salt from the merchant credentials PDF in the Vercel
Production environment. Keep Preview/Development on their separate test credentials.
Do not commit the PDF, its password, or the decrypted credentials. The commercials
Excel contains gateway charges; these are not replacements for the membership prices.

## Admin payment flow

1. The member chooses INR 500 annual or INR 5,000 lifetime and pays on Easebuzz.
2. The verified browser callback or server webhook records the payment status and
   amount and activates membership atomically. Failed/pending payments do not activate it.
3. Admin -> Payments shows status, amount, payment mode, Easebuzz payment ID and bank
   reference. Gateway transactions show "Automatic via Easebuzz" instead of manual
   Yes/No/Pending buttons. The admin status endpoint rejects gateway overrides.
4. Only successful payments contribute to the revenue total. CSV exports include
   the paid amount and Easebuzz payment ID. Amounts are the membership payment amount;
   settlement amounts after gateway fees must be reconciled using Easebuzz reports.
5. The Trust still approves or rejects the alumni application independently.

Older manual payment records retain their review controls. No new database migration
is required for this admin display change beyond the existing 0023 migration.

References: [Easebuzz official hosted-checkout integration](https://github.com/easebuzz/paywitheasebuzz-php-lib)
and [Vercel environment variables](https://vercel.com/docs/environment-variables).

## Automatic recovery on Vercel Hobby

Before deploying recovery, run `supabase/migrations/0024_payment_recovery.sql` in
the live Supabase SQL Editor. It adds diagnostic columns/indexes only; it does
not delete payments, alter membership amounts, or grant memberships.

Set a random server-only `CRON_SECRET` in Vercel Production, then redeploy main.
Vercel supplies it as `Authorization: Bearer <secret>` to the daily job. Do not
place secrets in URLs. `vercel.json` runs `/api/cron/reconcile-payments` once daily
at approximately 02:00 UTC (07:30 IST; Hobby can delay execution within that hour).
No paid scheduler or external monitoring subscription is required.

Configure this **server webhook** with Easebuzz support/dashboard:
`https://www.davkawt.org/api/payments/webhook`. The browser success/failure return
is separate: `https://www.davkawt.org/api/payments/verify`. Use the final canonical
domain directly. Confirm webhook delivery and retries are enabled for your account;
the code cannot enable merchant dashboard settings by itself.

Immediate recovery runs while a signed-in member opens membership, registration
payment or pending approval: up to five checks at 30-second intervals. Admins can
click **Check with Easebuzz** on any unresolved gateway transaction. Checks have a
20-second cooldown. A pending prior payment blocks another checkout until resolved,
to reduce accidental repeat payments. Trust approval remains independent.

The daily job processes up to 20 unresolved payments, five at a time, oldest
verification first. This bound fits Hobby runtimes and avoids starvation, but a
larger backlog can take multiple days. **Vercel Free cannot guarantee recovery in
15 minutes when the browser is closed and webhook delivery fails.** After 15 minutes,
the admin page flags unresolved payments for attention; the flag does not imply
an automatic notification was sent.

Admin displays gateway status, failure reason, verification error and last check.
Each checked attempt is also recorded in `audit_log` as `easebuzz_verification`,
without credentials or callback signatures. Gateway timeouts stay unresolved;
only authenticated gateway failures are classified failed. Database failures are
retryable and logged; if the database is unavailable even for diagnostics, platform
logs remain the fallback. Success cannot be downgraded by a delayed failure callback.

Deployment checks: apply 0024, set CRON_SECRET, redeploy, verify the cron in Vercel,
enable the Easebuzz webhook, then exercise success, cancellation, duplicate callback,
missed browser return, gateway timeout and admin recovery using sandbox credentials
on Preview. Existing production payment history must not be deleted for testing.
