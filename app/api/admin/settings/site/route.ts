import { NextResponse } from 'next/server';
import { requireAdminApiAccess } from '@/lib/auth/admin-api';
import { writeAuditLog } from '@/lib/audit';
import { mapSiteSettings } from '@/lib/site-settings';
import { siteSettingsValuesSchema } from '@/lib/validations/admin';

export async function GET() {
  const { adminAccess, error } = await requireAdminApiAccess();
  if (error || !adminAccess) return error;

  const { data, error: fetchError } = await adminAccess.database
    .from('site_settings')
    .select('key, value');

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  return NextResponse.json({ settings: mapSiteSettings(data) });
}

export async function PUT(request: Request) {
  const { adminAccess, error } = await requireAdminApiAccess();
  if (error || !adminAccess) return error;

  const body = await request.json();
  const parsed = siteSettingsValuesSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid site settings payload.' },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const rows = [
    { key: 'trust_name', value: parsed.data.trust_name, updated_by: adminAccess.actorProfileId, updated_at: now },
    {
      key: 'contact_email',
      value: parsed.data.contact_email,
      updated_by: adminAccess.actorProfileId,
      updated_at: now,
    },
    {
      key: 'contact_phone',
      value: parsed.data.contact_phone?.trim() ?? '',
      updated_by: adminAccess.actorProfileId,
      updated_at: now,
    },
    {
      key: 'about_short',
      value: parsed.data.about_short,
      updated_by: adminAccess.actorProfileId,
      updated_at: now,
    },
    {
      key: 'social_links',
      value: parsed.data.social_links,
      updated_by: adminAccess.actorProfileId,
      updated_at: now,
    },
  ];

  const { error: upsertError } = await adminAccess.database
    .from('site_settings')
    .upsert(rows, { onConflict: 'key' });

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  await writeAuditLog({
    actor_id: adminAccess.actorProfileId,
    action: 'site_settings_updated',
    target_type: 'settings',
    metadata: {
      updated_keys: rows.map((row) => row.key),
    },
  });

  return NextResponse.json({ success: true });
}
