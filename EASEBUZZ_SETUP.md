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
