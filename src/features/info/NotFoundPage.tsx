import { Compass } from 'lucide-react';
import { useLocation } from 'react-router';
import { ButtonLink } from '@/components/common/primitives';
import { EmptyState } from '@/components/feedback/states';
import { useSeo } from '@/hooks/useSeo';

export default function NotFoundPage() {
  const { pathname } = useLocation();
  useSeo({ title: 'Page not found', description: 'This page does not exist on eport.', path: pathname, noindex: true });
  return (
    <div className="container-page py-20">
      <EmptyState
        icon={Compass}
        title="This page does not exist"
        description={
          <>
            Nothing is published at <code className="rounded bg-surface px-1.5 py-0.5 text-xs ring-1 ring-line">{pathname}</code>. The feature may still be in development — the Data Reliability Centre
            lists what is available.
          </>
        }
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <ButtonLink to="/">Go to the home page</ButtonLink>
            <ButtonLink to="/data-reliability" variant="secondary">
              See what is available
            </ButtonLink>
          </div>
        }
      />
    </div>
  );
}
