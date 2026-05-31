# DAVKAWT Alumni Portal Admin User Manual

## Purpose
This manual helps DAVKAWT administrators operate the alumni portal after launch.

## Admin Access
1. Sign in at `/admin-login` with an account that has `admin` or `super_admin` role.
2. Open `/admin` after login.
3. If access is denied, confirm the user profile has `approval_status = approved` and role `admin` or `super_admin`.

## Dashboard
The admin dashboard provides high-level operational metrics:
- Total alumni
- Pending approvals
- Paid members
- Revenue
- Registration trends
- Batch distribution
- Payment distribution
- Recent activity

## Approvals
Use `/admin/approvals` to review new alumni registrations.

### Approve an alumnus
1. Review the submitted profile details.
2. Click Approve.
3. The system updates the profile to approved alumni status.
4. The user receives an approval email.
5. The action is recorded in the audit log.

### Reject an alumnus
1. Click Reject.
2. Enter a clear rejection reason.
3. Confirm rejection.
4. The user receives a rejection email with the reason.
5. The action is recorded in the audit log.

## Alumni Management
Use `/admin/alumni` to search, filter, and manage alumni records.

Available actions:
- View alumni profile
- Change role
- Activate or deactivate account
- Export filtered alumni data

Use deactivation instead of deleting records so historical payments, RSVPs, and audit records remain intact.

## Announcements
Use `/admin/announcements` to manage trust communications.

Available actions:
- Create announcement
- Edit announcement
- Publish or unpublish
- Pin important announcements
- Schedule announcements
- Delete announcements when necessary

Announcement content should be reviewed before publishing because it is visible to verified alumni and published content can appear on the public landing page.

## Events
Use `/admin/events` to manage alumni events.

Available actions:
- Create event
- Edit event
- Publish or unpublish
- Review RSVPs
- Export RSVP list
- Send reminders to RSVPed members

For online or hybrid events, verify that the online link is correct before publishing.

## Forum Moderation
Use `/admin/forum` to manage community discussions.

Available actions:
- Create categories
- Pin important threads
- Lock threads
- Moderate inappropriate content

Forum content should follow DAVKAWT community standards and should be moderated promptly.

## Payments
Use `/admin/payments` to review membership payment records.

Payment records include:
- Transaction ID
- Alumni name
- Amount
- Status
- Gateway response details
- Payment date

Until the payment gateway goes live, pending records may represent manual membership requests submitted by alumni for admin follow-up.

Refunds should be handled according to the trust's finance policy and verified against Easebuzz records.

## Reports and Exports
Use `/admin/reports` for operational reporting.

Available exports:
- Alumni records
- Payment records
- Event RSVP records

Always verify filters before exporting. Exported files may contain personal data and must be handled securely.

## Settings
Use `/admin/settings` for configuration.

Available settings:
- Membership plan management
- Site settings
- Email template preview
- Admin user management for `super_admin` users

Only trusted users should receive `admin` or `super_admin` roles.

## Membership Plans
When creating or editing membership plans:
1. Use clear plan names.
2. Confirm amount and duration.
3. Keep inactive plans disabled instead of deleting them if historical payments reference them.

## Email Notifications
The portal sends transactional emails for:
- Registration received
- Approval
- Rejection
- Payment receipt
- Event reminder
- Membership renewal reminder

Verify Resend domain configuration before production launch.

## Payment Operations
Easebuzz must remain in test mode until launch approval.

Before switching to production:
1. Verify successful test payment.
2. Verify failed payment handling.
3. Verify webhook signature validation.
4. Verify profile membership status update.
5. Verify payment receipt email.
6. Confirm production Easebuzz key and salt are configured securely.

## Security Checklist for Admins
- Do not share admin credentials.
- Use strong passwords.
- Review role changes carefully.
- Export data only when needed.
- Store exports securely.
- Never share service role keys or payment secrets.
- Report suspicious activity immediately.

## Launch Checklist
Before launch, confirm:
- Supabase migrations are applied.
- Seed data is inserted.
- Production environment variables are configured.
- Resend sending domain is verified.
- Easebuzz production account is approved.
- Sentry monitoring is enabled.
- Vercel deployment is successful.
- Admin account is created and tested.
- Registration, approval, login, payment, and export flows are tested end-to-end.
