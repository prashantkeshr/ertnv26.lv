/**
 * Video card with a click-to-play facade. Nothing is requested from YouTube (no thumbnail, no
 * script, no cookies) until the visitor presses play; then the video loads in YouTube's
 * privacy-enhanced mode (youtube-nocookie.com). Only videos from official channels are listed.
 */
import { Play } from 'lucide-react';
import { useState } from 'react';
import { Monogram } from '@/components/common/Flag';
import { spotlightHandlers } from '@/components/common/motion';
import { Badge } from '@/components/common/StatusBadge';
import { useDataset } from '@/hooks/useAsync';
import type { Video, VideoTopic } from '@/types/schemas';
import { VIDEO_TOPIC_LABEL } from '@/utils/labels';

const ORG_ABBR: Record<string, string> = { wto: 'WTO', wco: 'WCO', itc: 'ITC', imo: 'IMO', icc: 'ICC' };

export function VideoCard({ video }: { video: Video }) {
  const [playing, setPlaying] = useState(false);
  const sources = useDataset('sources');
  const publisher = sources.data?.find((s) => s.id === video.sourceId)?.publisher ?? video.channel;
  return (
    <article {...spotlightHandlers()} className="spot group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="relative aspect-video bg-deep">
        {playing ? (
          <iframe
            className="absolute inset-0 size-full"
            src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0`}
            title={video.title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <button type="button" onClick={() => setPlaying(true)} className="hero-bg absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
            <div aria-hidden="true" className="hero-grid pointer-events-none absolute inset-0 opacity-60" />
            <span className="relative grid size-16 place-items-center rounded-full bg-white/95 text-navy shadow-[0_14px_34px_-10px_rgb(0_0_0/0.7)] transition-transform duration-300 group-hover:scale-110">
              <Play aria-hidden="true" className="ms-0.5 size-7 fill-current" />
            </span>
            {/* The accessible name starts with the action and includes the visible text (WCAG 2.5.3). */}
            <span className="sr-only">Play video: {video.title}. </span>
            <span className="relative text-xs font-medium text-white/75">Plays from YouTube when you press play</span>
          </button>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-3">
          <Monogram text={ORG_ABBR[video.sourceId] ?? video.channel} className="size-8 rounded-lg" />
          <p className="min-w-0 text-xs leading-tight text-muted">
            <span className="block truncate font-semibold text-ink">{publisher}</span>
            <span className="block truncate">Channel: {video.channel}</span>
          </p>
        </div>
        <h3 className="mt-3 text-base leading-snug font-bold">{video.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{video.note}</p>
        <ul className="mt-auto flex flex-wrap gap-1.5 pt-4">
          {video.topics.map((t: VideoTopic) => (
            <li key={t}>
              <Badge tone="neutral">{VIDEO_TOPIC_LABEL[t]}</Badge>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
