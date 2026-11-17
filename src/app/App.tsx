import { lazy, useState } from 'react';
import { createBrowserRouter, RouterProvider, type RouteObject } from 'react-router';
import { ToastProvider } from '@/components/feedback/Toast';
import { I18nProvider } from '@/i18n';
import { RootLayout } from '@/layouts/RootLayout';
import { DIVISIONS } from './modules';

// Every page is its own chunk: the home page never pays for the map, charts or directories of other routes.
const HomePage = lazy(() => import('@/features/home/HomePage'));
const DivisionPage = lazy(() => import('@/features/divisions/DivisionPage'));
const CountriesPage = lazy(() => import('@/features/countries/CountriesPage'));
const CountryPage = lazy(() => import('@/features/countries/CountryPage'));
const DirectoryListPage = lazy(() => import('@/features/directory/DirectoryListPage'));
const EntityPage = lazy(() => import('@/features/directory/EntityPage'));
const SearchPage = lazy(() => import('@/features/search/SearchPage'));
const DataReliabilityPage = lazy(() => import('@/features/reliability/DataReliabilityPage'));
const VideosPage = lazy(() => import('@/features/videos/VideosPage'));
const NewsPage = lazy(() => import('@/features/news/NewsPage'));
const ContactPage = lazy(() => import('@/features/contact/ContactPage'));
const InfoPage = lazy(() => import('@/features/info/InfoPage'));
const NotFoundPage = lazy(() => import('@/features/info/NotFoundPage'));

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      ...DIVISIONS.map((d) => ({ path: d.path, element: <DivisionPage divisionId={d.id} /> })),
      { path: '/countries', element: <CountriesPage /> },
      { path: '/countries/:code', element: <CountryPage /> },
      { path: '/directory/organizations', element: <DirectoryListPage kind="organization" /> },
      { path: '/directory/organizations/:id', element: <EntityPage kind="organization" /> },
      { path: '/directory/authorities', element: <DirectoryListPage kind="authority" /> },
      { path: '/directory/authorities/:id', element: <EntityPage kind="authority" /> },
      { path: '/search', element: <SearchPage /> },
      { path: '/data-reliability', element: <DataReliabilityPage /> },
      { path: '/academy/videos', element: <VideosPage /> },
      { path: '/intelligence/news', element: <NewsPage /> },
      { path: '/contact', element: <ContactPage /> },
      { path: '/methodology', element: <InfoPage page="methodology" /> },
      { path: '/about', element: <InfoPage page="about" /> },
      { path: '/privacy', element: <InfoPage page="privacy" /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export function App() {
  const [router] = useState(() => createBrowserRouter(routes, { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' }));
  return (
    <I18nProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </I18nProvider>
  );
}
