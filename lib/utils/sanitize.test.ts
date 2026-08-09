import { describe, expect, it } from 'vitest';
import { formatAnnouncementHtml } from './sanitize';

describe('formatAnnouncementHtml', () => {
  it('turns pasted meeting minutes into structured headings, paragraphs, and lists', () => {
    const html = formatAnnouncementHtml(
      'Minutes of Meeting Date: 9 August 2026 Agenda & Key Discussion Points 1. Member Registration Action Points: * Contact batchmates * Complete registration Timeline: This week'
    );
    expect(html).toContain('<h2>');
    expect(html).toContain('<h3>Agenda &amp; Key Discussion Points</h3>');
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>Contact batchmates</li>');
  });

  it('escapes unsafe markup in plain-text announcements', () => {
    const html = formatAnnouncementHtml('General update <script>alert(1)</script>');
    expect(html).not.toContain('<script>');
  });
});
