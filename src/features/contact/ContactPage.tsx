import { routeMeta } from '@/app/route-meta';
import { seoCrumbs } from '@/components/common/PageHeader';
import { useSeo } from '@/hooks/useSeo';
import { ContactSection } from './ContactSection';

export default function ContactPage() {
  const meta = routeMeta('/contact');
  useSeo({ title: meta.title, description: meta.description, path: '/contact', breadcrumbs: seoCrumbs([{ label: 'Contact' }], '/contact') });
  return <ContactSection headingLevel="h1" />;
}
