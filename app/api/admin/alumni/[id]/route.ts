import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAccess } from '@/lib/auth/admin-api';
import { writeAuditLog } from '@/lib/audit';
import { adminProfileUpdateSchema } from '@/lib/validations/admin';

function normalizeOptionalString(value: unknown) {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
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

  return NextResponse.json({ success: true });
}
