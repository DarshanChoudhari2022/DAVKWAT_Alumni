import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

    // Verify admin role from DB
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!adminProfile || !['admin', 'super_admin'].includes(adminProfile.role)) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const { alumniId, reason } = (await req.json()) as { alumniId: string; reason: string };
    if (!alumniId) return NextResponse.json({ error: 'Alumni ID is required.' }, { status: 400 });
    if (!reason?.trim()) return NextResponse.json({ error: 'Rejection reason is required.' }, { status: 400 });

    const { error } = await supabase
      .from('profiles')
      .update({
        approval_status: 'rejected',
        rejection_reason: reason.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', alumniId)
      .eq('approval_status', 'pending');

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Audit log
    await supabase.from('audit_log').insert({
      actor_id: user.id,
      action: 'alumni_rejected',
      target_type: 'profile',
      target_id: alumniId,
      metadata: { reason: reason.trim() },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Reject error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
