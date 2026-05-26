import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Mail, Phone, MapPin, Briefcase, Linkedin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/shared/Avatar';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Alumni Profile' };

export default async function AlumniProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .eq('approval_status', 'approved')
    .single();

  if (!profile) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/directory"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-[#0F2557]"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        Back to directory
      </Link>

      <Card className="mt-4 p-6 sm:p-8">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <Avatar src={profile.avatar_url} name={profile.full_name} size="xl" />
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              {profile.full_name}
            </h1>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge variant="primary">Batch {profile.batch_year}</Badge>
              <Badge variant="default">{profile.course}</Badge>
              {profile.is_paid_member && <Badge variant="success">Paid Member</Badge>}
            </div>
          </div>
        </div>

        {profile.bio && (
          <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-slate-700">
            {profile.bio}
          </p>
        )}

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          {profile.occupation && (
            <Item icon={Briefcase} label="Occupation">
              {profile.occupation}
              {profile.job_title && ` · ${profile.job_title}`}
              {profile.company && ` @ ${profile.company}`}
            </Item>
          )}
          {(profile.current_city || profile.current_state) && (
            <Item icon={MapPin} label="Location">
              {[profile.current_city, profile.current_state, profile.current_country]
                .filter(Boolean)
                .join(', ')}
            </Item>
          )}
          {!profile.hide_email && profile.email && (
            <Item icon={Mail} label="Email">
              <a href={`mailto:${profile.email}`} className="text-[#0F2557] hover:underline">
                {profile.email}
              </a>
            </Item>
          )}
          {!profile.hide_phone && profile.phone && (
            <Item icon={Phone} label="Phone">
              <a href={`tel:+91${profile.phone}`} className="text-[#0F2557] hover:underline">
                +91 {profile.phone}
              </a>
            </Item>
          )}
          {profile.linkedin_url && (
            <Item icon={Linkedin} label="LinkedIn">
              <a
                href={profile.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0F2557] hover:underline"
              >
                View profile
              </a>
            </Item>
          )}
        </dl>
      </Card>
    </div>
  );
}

function Item({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Briefcase;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <Icon aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
        <dd className="mt-0.5 text-sm text-slate-800">{children}</dd>
      </div>
    </div>
  );
}
