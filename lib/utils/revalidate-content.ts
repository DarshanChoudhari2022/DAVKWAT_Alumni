import { revalidatePath } from 'next/cache';

export function revalidateAnnouncementContent(slug?: string | null) {
  revalidatePath('/');
  revalidatePath('/announcements');

  if (slug) {
    revalidatePath(`/announcements/${slug}`);
  }
}

export function revalidateEventContent(slug?: string | null) {
  revalidatePath('/');
  revalidatePath('/events');

  if (slug) {
    revalidatePath(`/events/${slug}`);
  }
}
