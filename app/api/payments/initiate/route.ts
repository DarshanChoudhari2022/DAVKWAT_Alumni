import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { startMembershipCheckout } from '@/lib/payments/checkout';
import { MEMBERSHIP_PRICES, type PaidMembershipType } from '@/lib/payments/plans';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });
    let body: { planId?: string; membershipType?: string };
    try { body = await req.json(); }
    catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
    const admin = createAdminClient();
    const { data: profile, error: profileError } = await admin.from('profiles')
      .select('id, full_name, email, phone, approval_status, is_active, profile_type, membership_type, is_paid_member')
      .eq('id', user.id).maybeSingle();
    if (profileError) throw new Error('Profile lookup failed');
    if (!profile || profile.is_active === false || profile.approval_status === 'rejected') {
      return NextResponse.json({ error: 'Your account is not eligible for payment.' }, { status: 403 });
    }
    if (profile.profile_type === 'faculty') {
      return NextResponse.json({ error: 'Faculty membership is complimentary.' }, { status: 400 });
    }
    if (profile.is_paid_member && profile.membership_type === 'lifetime') {
      return NextResponse.json({ error: 'You already have lifetime membership.' }, { status: 400 });
    }
    let membershipType = body.membershipType;
    if (body.planId) {
      const { data: plan, error: planError } = await admin.from('membership_plans')
        .select('membership_type').eq('id', body.planId).eq('is_active', true).maybeSingle();
      if (planError) throw new Error('Plan lookup failed');
      membershipType = plan?.membership_type;
    }
    if (!membershipType || !Object.hasOwn(MEMBERSHIP_PRICES, membershipType)) {
      return NextResponse.json({ error: 'Choose annual or lifetime membership.' }, { status: 400 });
    }
    if (!profile.phone) return NextResponse.json({ error: 'Add your mobile number to your profile first.' }, { status: 400 });
    const result = await startMembershipCheckout({
      userId: user.id, fullName: profile.full_name, email: profile.email, phone: profile.phone,
      membershipType: membershipType as PaidMembershipType,
      source: profile.approval_status === 'approved' ? 'membership' : 'registration',
    });
    return NextResponse.json({ redirectUrl: result.paymentUrl, txnid: result.txnid });
  } catch {
    return NextResponse.json({ error: 'Checkout could not be started. Please try again or contact the Trust.' }, { status: 503 });
  }
}
