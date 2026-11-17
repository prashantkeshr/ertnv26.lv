import { ErrorState, Skeleton } from '@/components/feedback/states';
import { Reveal } from '@/components/common/motion';
import { useDataset } from '@/hooks/useAsync';
import type { VideoTopic } from '@/types/schemas';
import { VideoCard } from './VideoCard';

/** A short row of official explainer videos, optionally limited to some topics. */
export function VideoShelf({ topics, limit = 3 }: { topics?: VideoTopic[]; limit?: number }) {
  const videos = useDataset('videos');
  if (videos.status === 'error') return <ErrorState error={videos.error} onRetry={videos.reload} />;
  if (videos.status === 'loading')
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: limit }, (_, i) => (
          <Skeleton key={i} className="h-72 rounded-2xl" />
        ))}
      </div>
    );
  const matching = videos.data.videos.filter((v) => !topics || v.topics.some((t) => topics.includes(t)));
  // One video per channel first, so the shelf shows variety rather than three from the same publisher.
  const firstPerChannel = matching.filter((v, i, all) => all.findIndex((x) => x.channel === v.channel) === i);
  const shown = [...firstPerChannel, ...matching.filter((v) => !firstPerChannel.includes(v))].slice(0, limit);
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {shown.map((v, i) => (
        <li key={v.id}>
          <Reveal delay={i * 80} className="h-full">
            <VideoCard video={v} />
          </Reveal>
        </li>
      ))}
    </ul>
  );
}
