import { Clapperboard } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { routeMeta } from '@/app/route-meta';
import { PageHeader, seoCrumbs } from '@/components/common/PageHeader';
import { cn } from '@/components/common/primitives';
import { Badge } from '@/components/common/StatusBadge';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback/states';
import { useDataset } from '@/hooks/useAsync';
import { useSeo } from '@/hooks/useSeo';
import { useI18n } from '@/i18n';
import { VIDEO_TOPICS, type VideoTopic } from '@/types/schemas';
import { formatDate } from '@/utils/format';
import { VIDEO_TOPIC_LABEL } from '@/utils/labels';
import { VideoCard } from './VideoCard';

const CRUMBS = [{ label: 'Academy', path: '/academy' }, { label: 'Videos' }];

export default function VideosPage() {
  const meta = routeMeta('/academy/videos');
  useSeo({ title: meta.title, description: meta.description, path: '/academy/videos', breadcrumbs: seoCrumbs(CRUMBS, '/academy/videos') });
  const { locale } = useI18n();
  const videos = useDataset('videos');
  const [topic, setTopic] = useState<VideoTopic | ''>('');

  const list = videos.data?.videos ?? [];
  const counts = useMemo(() => new Map(VIDEO_TOPICS.map((t) => [t, list.filter((v) => v.topics.includes(t)).length])), [list]);
  const shown = list.filter((v) => !topic || v.topics.includes(topic));
  const chip = (active: boolean) => cn('min-h-9 rounded-full border px-3.5 text-sm font-medium transition-colors', active ? 'border-ocean bg-ocean text-white' : 'border-line bg-surface text-ink hover:border-link hover:text-link');

  return (
    <>
      <PageHeader
        crumbs={CRUMBS}
        kicker="eport Academy"
        title="Official explainer videos"
        description="Videos from the WTO, World Customs Organization, International Trade Centre, IMO and ICC — chosen because they come from the organizations’ own channels. They are general explainers, not guidance for a particular shipment."
      >
        {videos.data && <Badge tone="neutral">Channels re-verified {formatDate(videos.data.verifiedOn, locale)}</Badge>}
      </PageHeader>

      <div className="container-page py-12">
        {videos.status === 'error' && <ErrorState error={videos.error} onRetry={videos.reload} />}
        {videos.status === 'loading' && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-72 rounded-2xl" />
            ))}
          </div>
        )}
        {videos.status === 'ready' && (
          <>
            <div role="group" aria-label="Filter videos by topic" className="flex flex-wrap gap-2">
              <button type="button" aria-pressed={!topic} onClick={() => setTopic('')} className={chip(!topic)}>
                All topics <span className="tabular opacity-90">{list.length}</span>
              </button>
              {VIDEO_TOPICS.filter((t) => (counts.get(t) ?? 0) > 0).map((t) => (
                <button key={t} type="button" aria-pressed={topic === t} onClick={() => setTopic(t)} className={chip(topic === t)}>
                  {VIDEO_TOPIC_LABEL[t]} <span className="tabular opacity-90">{counts.get(t)}</span>
                </button>
              ))}
            </div>
            <p role="status" className="tabular mt-4 text-sm text-muted">
              {shown.length} of {list.length} videos
            </p>
            {shown.length === 0 ? (
              <EmptyState className="mt-4" icon={Clapperboard} title="No videos for this topic" description="Clear the filter to see all videos." />
            ) : (
              <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {shown.map((v) => (
                  <li key={v.id}>
                    <VideoCard video={v} />
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-10 rounded-xl border border-line bg-soft p-5 text-sm leading-relaxed text-muted">
              <p>
                <strong className="font-semibold text-heading">Privacy.</strong> Nothing is requested from YouTube until you press play, and then the video loads in YouTube’s privacy-enhanced mode. Playing a video lets
                YouTube see your IP address and set its own technical data. See the{' '}
                <Link to="/privacy" className="link">
                  privacy page
                </Link>
                .
              </p>
              <p className="mt-2">
                <strong className="font-semibold text-heading">How videos are chosen.</strong> Only videos uploaded by the organization itself, or by its own academy or national committee (the channel is shown on every card), are listed. Each
                is checked against YouTube’s oEmbed service for existence, embeddability and uploader. eport does not host or edit videos, and a video is not an endorsement of eport by its publisher.
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
