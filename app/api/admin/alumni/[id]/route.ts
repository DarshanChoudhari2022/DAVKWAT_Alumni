import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { requireAdminApiAccess } from '@/lib/auth/admin-api';
import { writeAuditLog } from '@/lib/audit';
import { invalidateAfterAction } from '@/lib/cache/invalidate';
import { createAdminClient } from '@/lib/supabase/admin';
import { adminProfileUpdateSchema, deleteAlumniSchema } from '@/lib/validations/admin';

function normalizeOptionalString(value: unknown) {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function deleteAuthUserBestEffort(
  admin: ReturnType<typeof createAdminClient>,
  userId: string
) {
  const timeoutMs = 1500;
  const timeoutMessage = 'Supabase Auth deletion timed out after profile cleanup.';
  const result = await Promise.race([
    admin.auth.admin.deleteUser(userId),
    new Promise<{ error: { message: string } }>((resolve) =>
      setTimeout(() => resolve({ error: { message: timeoutMessage } }), timeoutMs)
    ),
  ]);

  if (!result.error) return null;
  if (result.error.message.toLowerCase().includes('user not found')) return null;

  console.warn('Best-effort auth user deletion did not complete', {
    userId,
    error: result.error.message,
  });
  return result.error.message;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { adminAccess, error: authError } = await requireAdminApiAccess();
  if (authError || !adminAccess) return authError;

  const supabase = adminAccess.database;
  const { id } = await params;
  const body = await req.json();
  const parsed = adminProfileUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid profile update.' },
      { status: 400 }
    );
  }

  const sanitizedUpdates: {
    full_name?: string;
    email?: string;
    display_name?: string | null;
    phone?: string | null;
    alternate_phone?: string | null;
    current_city?: string | null;
    current_state?: string | null;
    current_country?: string | null;
    occupation?: string | null;
    company?: string | null;
    job_title?: string | null;
    industry?: string | null;
    linkedin_url?: string | null;
    website_url?: string | null;
    bio?: string | null;
    achievements?: string | null;
    hide_email?: boolean;
    hide_phone?: boolean;
    updated_at: string;
  } = {
    updated_at: new Date().toISOString(),
  };

  if (parsed.data.full_name !== undefined) sanitizedUpdates.full_name = parsed.data.full_name.trim();
  if (parsed.data.email !== undefined) sanitizedUpdates.email = parsed.data.email.trim().toLowerCase();
  if (parsed.data.display_name !== undefined) sanitizedUpdates.display_name = normalizeOptionalString(parsed.data.display_name);
  if (parsed.data.phone !== undefined) sanitizedUpdates.phone = normalizeOptionalString(parsed.data.phone);
  if (parsed.data.alternate_phone !== undefined) sanitizedUpdates.alternate_phone = normalizeOptionalString(parsed.data.alternate_phone);
  if (parsed.data.current_city !== undefined) sanitizedUpdates.current_city = normalizeOptionalString(parsed.data.current_city);
  if (parsed.data.current_state !== undefined) sanitizedUpdates.current_state = normalizeOptionalString(parsed.data.current_state);
  if (parsed.data.current_country !== undefined) sanitizedUpdates.current_country = normalizeOptionalString(parsed.data.current_country);
  if (parsed.data.occupation !== undefined) sanitizedUpdates.occupation = normalizeOptionalString(parsed.data.occupation);
  if (parsed.data.company !== undefined) sanitizedUpdates.company = normalizeOptionalString(parsed.data.company);
  if (parsed.data.job_title !== undefined) sanitizedUpdates.job_title = normalizeOptionalString(parsed.data.job_title);
  if (parsed.data.industry !== undefined) sanitizedUpdates.industry = normalizeOptionalString(parsed.data.industry);
  if (parsed.data.linkedin_url !== undefined) sanitizedUpdates.linkedin_url = normalizeOptionalString(parsed.data.linkedin_url);
  if (parsed.data.website_url !== undefined) sanitizedUpdates.website_url = normalizeOptionalString(parsed.data.website_url);
  if (parsed.data.bio !== undefined) sanitizedUpdates.bio = normalizeOptionalString(parsed.data.bio);
  if (parsed.data.achievements !== undefined) sanitizedUpdates.achievements = normalizeOptionalString(parsed.data.achievements);
  if (parsed.data.hide_email !== undefined) sanitizedUpdates.hide_email = parsed.data.hide_email;
  if (parsed.data.hide_phone !== undefined) sanitizedUpdates.hide_phone = parsed.data.hide_phone;

  const { error: updateError } = await supabase
    .from('profiles')
    .update(sanitizedUpdates)
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await writeAuditLog({
    actor_id: adminAccess.actorProfileId,
    action: 'admin_update_profile',
    target_type: 'profile',
    target_id: id,
    metadata: { updated_fields: Object.keys(sanitizedUpdates) },
  });

  // Profile edits can change membership-backing fields (e.g. is_paid_member),
  // so invalidate the dashboard + payments stat caches (design Section 4).
  invalidateAfterAction('alumni_edit');

  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { adminAccess, error: authError } = await requireAdminApiAccess();
  if (authError || !adminAccess) return authError;

  if (adminAccess.role !== 'super_admin') {
    return NextResponse.json(
      { error: 'Only super admins can permanently delete alumni records.' },
      { status: 403 }
    );
  }

  const { id } = await params;
  if (adminAccess.actorProfileId === id) {
    return NextResponse.json(
      { error: 'You cannot delete your own admin profile.' },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = deleteAlumniSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Type Delete to confirm permanent deletion.' },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('id', id)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: 'Alumni profile not found.' }, { status: 404 });
  }

  if (profile.role === 'super_admin') {
    return NextResponse.json(
      { error: 'Super admin profiles cannot be deleted from this screen.' },
      { status: 403 }
    );
  }

  const dependentDeletes = [
    admin.from('payments').delete().eq('alumni_id', id),
    admin.from('event_rsvps').delete().eq('alumni_id', id),
    admin.from('forum_replies').delete().eq('author_id', id),
    admin.from('forum_threads').delete().eq('author_id', id),
    admin.from('audit_log').update({ actor_id: null }).eq('actor_id', id),
    admin.from('profiles').update({ approved_by: null }).eq('approved_by', id),
  ] as const;

  const dependentResults = await Promise.all(dependentDeletes);
  const dependentError = dependentResults.find((result) => result.error)?.error;
  if (dependentError) {
    return NextResponse.json({ error: dependentError.message }, { status: 500 });
  }

  const { error: deleteError } = await admin.from('profiles').delete().eq('id', id);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  after(async () => {
    const authDeleteWarning = await deleteAuthUserBestEffort(admin, id);
    await writeAuditLog({
      actor_id: adminAccess.actorProfileId,
      action: 'admin_delete_alumni',
      target_type: 'profile',
      target_id: id,
      metadata: {
        deleted_email: profile.email,
        deleted_name: profile.full_name,
        deleted_role: profile.role,
        auth_delete_warning: authDeleteWarning,
      },
    });
  });

  invalidateAfterAction('alumni_edit');

  return NextResponse.json({ success: true });
}
