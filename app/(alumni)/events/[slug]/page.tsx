/* eslint-disable @next/next/no-img-element */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, MapPin, Users, Lock, Crown, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { formatDateTime, formatINR } from '@/lib/utils/format';
import { RsvpForm } from './RsvpForm';
import { ShareButtons } from './ShareButtons';
import { APP_URL } from '@/lib/resend/client';
import { buildManualPaymentWhatsappUrl, MANUAL_MEMBERSHIP_PAYMENT } from '@/lib/payments/manual-upi';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('events')
    .select('title, description')
    .eq('slug', slug)
    .single();
  return { title: data?.title ?? 'Event', description: data?.description ?? undefined };
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  approval_status: string;
  is_paid_member: boolean;
  profile_type: string;
  batch_year: number;
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  // Route is public, so check session directly
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? null;

  // Retrieve user's profile and membership status if logged in
  let profile: UserProfile | null = null;
  if (userId) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, role, approval_status, is_paid_member, profile_type, batch_year')
      .eq('id', userId)
      .maybeSingle();
    profile = data;
  }

  const { data: event } = await supabase
    .from('events')
    .select(
      'id, title, slug, description, event_type, venue, online_link, banner_image_url, starts_at, ends_at, registration_deadline, max_attendees, is_published'
    )
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (!event) notFound();

  // If user is logged in, check if they RSVP'd
  let myRsvp = null;
  if (userId) {
    const { data } = await supabase
      .from('event_rsvps')
      .select('id')
      .eq('event_id', event.id)
      .eq('alumni_id', userId)
      .maybeSingle();
    myRsvp = data;
  }

  const { count: goingCount } = await supabase
    .from('event_rsvps')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', event.id);

  const isPast = new Date(event.starts_at).getTime() < Date.now();
  const isRegistrationClosed =
    isPast ||
    (event.registration_deadline != null &&
      new Date(event.registration_deadline).getTime() < Date.now());
  const spotsLeft =
    event.max_attendees != null && goingCount != null
      ? Math.max(0, event.max_attendees - goingCount)
      : null;

  const eventUrl = `${APP_URL}/events/${event.slug}`;

  // Membership status determination
  const isPending = profile && profile.approval_status === 'pending';
  const isApproved = profile && profile.approval_status === 'approved';
  const isPaidOrFaculty = profile && (profile.is_paid_member || profile.profile_type === 'faculty');
  const needsPayment = isApproved && !isPaidOrFaculty;

  // Build WhatsApp text for pending approval speed-up
  const whatsappApprovalMsg = profile
    ? `Hello Admin, my name is ${profile.full_name} (Batch of ${profile.batch_year}). I have registered on the DAVKAWT portal. Please review my profile so I can RSVP for the event: ${event.title}.`
    : '';
  const whatsappApprovalUrl = `https://wa.me/${MANUAL_MEMBERSHIP_PAYMENT.whatsappNumber}?text=${encodeURIComponent(whatsappApprovalMsg)}`;

  // Build WhatsApp text for manual payment proof
  const whatsappPaymentUrl = profile
    ? buildManualPaymentWhatsappUrl({
        fullName: profile.full_name,
        batchYear: String(profile.batch_year),
        phone: profile.phone ?? undefined,
      })
    : '';

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/events"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-[#0F2557]"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" /> Back to events
      </Link>

      <header className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={isPast ? 'default' : 'warning'}>{formatDateTime(event.starts_at)}</Badge>
          <Badge variant="default" className="capitalize">
            {event.event_type}
          </Badge>
          {isPast && <Badge variant="default">Past event</Badge>}
        </div>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {event.title}
        </h1>
        <dl className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <Calendar aria-hidden className="h-4 w-4 text-slate-400" />
            <span>
              {formatDateTime(event.starts_at)}
              {event.ends_at ? ` - ${formatDateTime(event.ends_at)}` : ''}
            </span>
          </div>
          {event.venue && (
            <div className="flex items-center gap-2">
              <MapPin aria-hidden className="h-4 w-4 text-slate-400" />
              <span>{event.venue}</span>
            </div>
          )}
          {event.max_attendees != null && (
            <div className="flex items-center gap-2">
              <Users aria-hidden className="h-4 w-4 text-slate-400" />
              <span>
                {goingCount ?? 0} going - {spotsLeft ?? 0} spots left
              </span>
            </div>
          )}
        </dl>
      </header>

      <Card className="mt-6 p-6 sm:p-8">
        {event.banner_image_url && (
          <img
            src={event.banner_image_url}
            alt={event.title}
            className="mb-6 h-auto w-full rounded-2xl border border-slate-200 object-cover"
          />
        )}
        {event.description && (
          <div className="whitespace-pre-line text-base leading-relaxed text-slate-700">
            {event.description}
          </div>
        )}
        {event.event_type !== 'in_person' && event.online_link && (
          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium">Join link</p>
            <a
              href={event.online_link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block break-all text-sm text-[#0F2557] underline"
            >
              {event.online_link}
            </a>
          </div>
        )}
      </Card>

      {!isPast && (
        <Card className="mt-6 p-6 sm:p-8 border-slate-200">
          {/* STATE 1: Fully Active Member / Faculty -> Render RSVP Form */}
          {userId && isApproved && isPaidOrFaculty && (
            <div>
              <h2 className="font-display text-xl font-semibold">RSVP</h2>
              {event.registration_deadline && (
                <p className="mt-1 text-sm text-slate-500">
                  Registration closes on {formatDateTime(event.registration_deadline)}.
                </p>
              )}
              <RsvpForm
                eventId={event.id}
                slug={event.slug}
                hasRsvp={!!myRsvp}
                spotsLeft={spotsLeft}
                isRegistrationClosed={isRegistrationClosed}
              />
            </div>
          )}

          {/* STATE 2: Not Logged In */}
          {!userId && (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Lock className="mt-1 h-5 w-5 text-amber-500 shrink-0" />
                <div>
                  <h3 className="font-display text-lg font-semibold">Join the Association to RSVP</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    This event is exclusive to members of the DAV Khagaul Alumni Association. Join to connect, networking, and participate.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-sm space-y-2">
                <div className="font-semibold text-slate-700">Membership Plans:</div>
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span>Annual Membership</span>
                  <span className="font-semibold text-[#0F2557]">{formatINR(500)} / year</span>
                </div>
                <div className="flex justify-between">
                  <span>Lifetime Membership</span>
                  <span className="font-semibold text-[#0F2557]">{formatINR(5000)} (One-time)</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button asChild className="w-full sm:w-auto bg-[#0F2557] hover:bg-[#1a3a7a]" size="lg">
                  <Link href="/register">Register as a Member</Link>
                </Button>
                <Button asChild variant="outline" className="w-full sm:w-auto" size="lg">
                  <Link href={`/login?redirect=/events/${event.slug}`}>Sign In</Link>
                </Button>
              </div>

              <div className="text-xs text-slate-500 pt-2 flex items-center gap-1">
                <span>Have questions?</span>
                <a
                  href={`https://wa.me/${MANUAL_MEMBERSHIP_PAYMENT.whatsappNumber}?text=Hi,%20I%20am%20interested%20in%20joining%20DAVKAWT%20and%20registering%20for%20the%20event:%20${encodeURIComponent(event.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0F2557] underline hover:text-[#1a3a7a]"
                >
                  Contact Admin on WhatsApp
                </a>
              </div>
            </div>
          )}

          {/* STATE 3: Incomplete Profile */}
          {userId && !profile && (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-1 h-5 w-5 text-amber-500 shrink-0" />
                <div>
                  <h3 className="font-display text-lg font-semibold">Complete Your Registration</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Please complete your alumni registration details to register for events.
                  </p>
                </div>
              </div>
              <Button asChild className="w-full sm:w-auto bg-[#0F2557] hover:bg-[#1a3a7a]" size="lg">
                <Link href="/register/complete">Complete Registration</Link>
              </Button>
            </div>
          )}

          {/* STATE 4: Pending Approval */}
          {userId && isPending && (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-1 h-5 w-5 text-blue-500 shrink-0" />
                <div>
                  <h3 className="font-display text-lg font-semibold text-blue-900">Registration Pending Approval</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Your profile is currently under review by the administration. Once approved, you can complete payment and RSVP.
                  </p>
                </div>
              </div>
              <div className="pt-2">
                <Button asChild variant="outline" className="w-full sm:w-auto border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100" size="lg">
                  <a href={whatsappApprovalUrl} target="_blank" rel="noopener noreferrer">
                    Message Admin on WhatsApp to speed up approval
                  </a>
                </Button>
              </div>
            </div>
          )}

          {/* STATE 5: Approved but Unpaid */}
          {userId && needsPayment && (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Crown className="mt-1 h-5 w-5 text-amber-500 shrink-0" />
                <div>
                  <h3 className="font-display text-lg font-semibold">Activate Membership to Register</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Your profile is approved! Choose a membership plan to activate your account and RSVP for events.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 pt-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3 flex flex-col justify-between">
                  <div>
                    <h4 className="font-semibold text-sm text-slate-700">Option 1: Pay Online</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Pay instantly using online cards, netbanking or UPI via Easebuzz payment gateway.
                    </p>
                  </div>
                  <Button asChild className="w-full mt-2 bg-[#0F2557] hover:bg-[#1a3a7a]" size="sm">
                    <Link href="/membership">Activate Online</Link>
                  </Button>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3 flex flex-col justify-between">
                  <div>
                    <h4 className="font-semibold text-sm text-slate-700">Option 2: Manual UPI Transfer</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Transfer <span className="font-semibold">{formatINR(500)}</span> (Annual) or <span className="font-semibold">{formatINR(5000)}</span> (Lifetime) to:
                    </p>
                    <code className="block bg-slate-100 px-2 py-1 rounded text-xs mt-1.5 font-mono text-center font-semibold text-[#0F2557] break-all">
                      {MANUAL_MEMBERSHIP_PAYMENT.upiId}
                    </code>
                    <p className="text-[10px] text-slate-400 mt-1 text-center">
                      Payee: {MANUAL_MEMBERSHIP_PAYMENT.payeeName}
                    </p>
                  </div>
                  <Button asChild variant="outline" className="w-full mt-2 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" size="sm">
                    <a href={whatsappPaymentUrl} target="_blank" rel="noopener noreferrer">
                      WhatsApp Payment Proof
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Share Section */}
      <div className="mt-8 border-t border-slate-100 pt-6">
        <h3 className="font-display text-sm font-semibold text-slate-700 mb-3">Share Event with Alumni</h3>
        <ShareButtons eventTitle={event.title} eventUrl={eventUrl} />
      </div>
    </article>
  );
}
