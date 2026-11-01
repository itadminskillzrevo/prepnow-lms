import React, { useMemo } from 'react';
import { PlayCircle } from 'lucide-react';

interface VideoPlayerProps {
  url: string;
  className?: string;
}

// Convert various video URLs/snippets to embeddable format
const getEmbedUrl = (input: string): { embedUrl: string; type: 'youtube' | 'vimeo' | 'iframe' | 'direct' | 'none' } => {
  if (!input || input.trim() === '') {
    return { embedUrl: '', type: 'none' };
  }

  const trimmedInput = input.trim();

  // Handle full iframe embed snippets (copy-paste from providers)
  const iframeSrcMatch = trimmedInput.match(/<iframe[^>]*\s+src=["']([^"']+)["'][^>]*>/i);
  let candidateUrl = iframeSrcMatch?.[1] ?? trimmedInput;

  // Decode common HTML entity from copied embed snippets
  candidateUrl = candidateUrl.replace(/&amp;/g, '&').trim();

  // Normalize protocol-less URLs
  if (candidateUrl.startsWith('//')) {
    candidateUrl = `https:${candidateUrl}`;
  }

  let parsedUrl: URL | null = null;
  try {
    parsedUrl = new URL(candidateUrl);
  } catch {
    // If protocol is missing, attempt https prefix once
    try {
      parsedUrl = new URL(`https://${candidateUrl}`);
      candidateUrl = parsedUrl.toString();
    } catch {
      parsedUrl = null;
    }
  }

  const youtubeHost = parsedUrl?.hostname.replace(/^www\./, '').toLowerCase();
  const youtubePath = parsedUrl?.pathname ?? '';

  // YouTube URL formats
  let youtubeId: string | null = null;
  if (youtubeHost === 'youtu.be') {
    youtubeId = youtubePath.split('/').filter(Boolean)[0] || null;
  } else if (youtubeHost && (youtubeHost.includes('youtube.com') || youtubeHost.includes('youtube-nocookie.com'))) {
    youtubeId =
      parsedUrl?.searchParams.get('v') ||
      parsedUrl?.searchParams.get('vi') ||
      youtubePath.match(/\/(embed|shorts|live|v)\/([a-zA-Z0-9_-]{11})/)?.[2] ||
      null;
  }

  if (youtubeId && /^[a-zA-Z0-9_-]{11}$/.test(youtubeId)) {
    return {
      embedUrl: `https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1`,
      type: 'youtube',
    };
  }

  // Vimeo URL formats
  const vimeoHost = parsedUrl?.hostname.replace(/^www\./, '').toLowerCase();
  const vimeoPath = parsedUrl?.pathname ?? '';
  if (vimeoHost && (vimeoHost === 'vimeo.com' || vimeoHost === 'player.vimeo.com')) {
    const vimeoId = vimeoPath.match(/\/video\/(\d+)/)?.[1] || vimeoPath.match(/\/(\d+)/)?.[1] || null;
    if (vimeoId) {
      return {
        embedUrl: `https://player.vimeo.com/video/${vimeoId}?badge=0&autopause=0&player_id=0`,
        type: 'vimeo',
      };
    }
  }

  // Detect direct file links (supports query params like ?token=...)
  const directPath = (parsedUrl?.pathname || candidateUrl).toLowerCase();
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.m4v'];
  if (videoExtensions.some((ext) => directPath.endsWith(ext))) {
    return { embedUrl: candidateUrl, type: 'direct' };
  }

  // Already an embed/player style URL or unknown provider that supports iframes
  return { embedUrl: candidateUrl, type: 'iframe' };
};

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, className = '' }) => {
  const { embedUrl, type } = useMemo(() => getEmbedUrl(url), [url]);

  if (type === 'none' || !embedUrl) {
    return (
      <div className={`aspect-video bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center ${className}`}>
        <PlayCircle className="h-20 w-20 text-primary/40" />
      </div>
    );
  }

  if (type === 'direct') {
    return (
      <div className={`aspect-video bg-secondary rounded-lg overflow-hidden ${className}`}>
        <video
          src={embedUrl}
          controls
          className="w-full h-full object-contain"
          controlsList="nodownload"
        >
          Your browser does not support the video tag.
        </video>
      </div>
    );
  }

  // For YouTube, Vimeo, and iframe embeds
  return (
    <div className={`aspect-video bg-secondary rounded-lg overflow-hidden ${className}`}>
      <iframe
        src={embedUrl}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        frameBorder={0}
        title="Video player"
      />
    </div>
  );
};

// Preview component for the editor
export const VideoPreview: React.FC<{ url: string }> = ({ url }) => {
  const { embedUrl, type } = useMemo(() => getEmbedUrl(url), [url]);

  if (type === 'none' || !embedUrl) {
    return null;
  }

  return (
    <div className="mt-4 rounded-lg overflow-hidden border border-border">
      <div className="bg-muted/50 px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
        <PlayCircle className="h-3 w-3" />
        Video Preview ({type.charAt(0).toUpperCase() + type.slice(1)})
      </div>
      <VideoPlayer url={url} className="rounded-none" />
    </div>
  );
};