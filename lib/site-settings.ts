import type { Database, Json } from '@/lib/supabase/database.types';
import { createStaticClient } from '@/lib/supabase/static';

type SiteSettingRow = Database['public']['Tables']['site_settings']['Row'];

export interface SiteSettings {
  trustName: string;
  contactEmail: string;
  contactPhone: string;
  aboutShort: string;
  socialLinks: {
    facebook: string;
    twitter: string;
    linkedin: string;
    instagram: string;
  };
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  trustName: 'DAV Khagaul Alumni Welfare Trust',
  contactEmail: 'contact@davkawt.org',
  contactPhone: '',
  aboutShort:
    'DAV Khagaul Alumni Welfare Trust connects generations of alumni through trusted networking, events, mentorship, and member services.',
  socialLinks: {
    facebook: '',
    twitter: '',
    linkedin: '',
    instagram: '',
  },
};

function readString(value: Json | null | undefined, fallback: string) {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

function readSocialLinks(value: Json | null | undefined) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return DEFAULT_SITE_SETTINGS.socialLinks;
  }

  return {
    facebook:
      typeof value.facebook === 'string' ? value.facebook : DEFAULT_SITE_SETTINGS.socialLinks.facebook,
    twitter:
      typeof value.twitter === 'string' ? value.twitter : DEFAULT_SITE_SETTINGS.socialLinks.twitter,
    linkedin:
      typeof value.linkedin === 'string' ? value.linkedin : DEFAULT_SITE_SETTINGS.socialLinks.linkedin,
    instagram:
      typeof value.instagram === 'string' ? value.instagram : DEFAULT_SITE_SETTINGS.socialLinks.instagram,
  };
}

export function mapSiteSettings(rows: SiteSettingRow[] | null | undefined): SiteSettings {
  const byKey = new Map((rows ?? []).map((row) => [row.key, row.value] as const));

  return {
    trustName: readString(byKey.get('trust_name'), DEFAULT_SITE_SETTINGS.trustName),
    contactEmail: readString(byKey.get('contact_email'), DEFAULT_SITE_SETTINGS.contactEmail),
    contactPhone: readString(byKey.get('contact_phone'), DEFAULT_SITE_SETTINGS.contactPhone),
    aboutShort: readString(byKey.get('about_short'), DEFAULT_SITE_SETTINGS.aboutShort),
    socialLinks: readSocialLinks(byKey.get('social_links')),
  };
}

export async function getPublicSiteSettings() {
  const supabase = createStaticClient();
  if (!supabase) {
    return DEFAULT_SITE_SETTINGS;
  }

  const { data } = await supabase.from('site_settings').select('key, value');
  return mapSiteSettings(data);
}
