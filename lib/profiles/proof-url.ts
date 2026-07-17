export function getSchoolProofUrl(profile: {
  school_document_url?: string | null;
  website_url?: string | null;
}) {
  return profile.school_document_url ?? profile.website_url ?? null;
}
