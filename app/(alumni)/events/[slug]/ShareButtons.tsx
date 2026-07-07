'use client';

import { useState, useEffect } from 'react';
import { Share2, Link as LinkIcon, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ShareButtonsProps {
  eventTitle: string;
  eventUrl: string;
}

export function ShareButtons({ eventTitle, eventUrl }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState(eventUrl);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShareUrl(window.location.href);
    }
  }, []);

  const shareText = `Hey, check out this upcoming alumni event: "${eventTitle}". View details and register here: ${shareUrl}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopyLink}
        className="flex items-center gap-1.5"
      >
        {copied ? (
          <>
            <Check className="h-4 w-4 text-emerald-500" />
            <span>Copied!</span>
          </>
        ) : (
          <>
            <LinkIcon className="h-4 w-4" />
            <span>Copy Link</span>
          </>
        )}
      </Button>

      <Button
        variant="outline"
        size="sm"
        asChild
        className="flex items-center gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800"
      >
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
          <Share2 className="h-4 w-4" />
          <span>Share on WhatsApp</span>
        </a>
      </Button>
    </div>
  );
}
