/**
 * Platform registry: the six divisions, the specialist centres and every module in them,
 * with an honest availability status. Navigation, landing pages, the search index, the
 * sitemap and the Data Reliability Centre are all driven from this one file.
 *
 * Node-safe (no React imports): the build scripts read it too.
 */

export type ModuleStatus =
  /** Built, working and tested. */
  | 'live'
  /** Core is working; scope is still growing. */
  | 'foundation'
  /** Achievable in the browser; scheduled for the stated phase. */
  | 'planned'
  /** Cannot work on a static site: needs a secure integration layer or backend. */
  | 'requires-backend';

export interface PlatformModule {
  id: string;
  title: string;
  summary: string;
  status: ModuleStatus;
  /** Implementation phase (see ARCHITECTURE.md). */
  phase: number;
  /** Set only when the module has a working route. */
  path?: string;
  note?: string;
}

export interface Division {
  id: string;
  title: string;
  kicker: string;
  path: string;
  icon: 'globe' | 'graduation' | 'handshake' | 'briefcase' | 'landmark' | 'calendar' | 'layers';
  purpose: string;
  description: string;
  modules: PlatformModule[];
}

export const DIVISIONS: Division[] = [
  {
    id: 'intelligence',
    title: 'Intelligence',
    kicker: 'eport Intelligence',
    path: '/intelligence',
    icon: 'globe',
    purpose: 'Trade, maritime and market information',
    description:
      'Global information about trade flows, countries, ports, vessels, shipping and policy — every figure shown with its source, period, unit and update date.',
    modules: [
      { id: 'countries', title: 'Country Explorer', summary: 'Every country and territory with ISO identifiers, reference facts, sourced trade indicators and linked authorities.', status: 'live', phase: 1, path: '/countries' },
      { id: 'trade-dashboard', title: 'Global Trade Intelligence Dashboard', summary: 'World and country trade indicators with charts, filters and source attribution.', status: 'foundation', phase: 4, path: '/intelligence', note: 'World and country indicators from the World Bank are live. Partner, commodity and regional comparisons arrive in Phase 4.' },
      { id: 'trade-explorer', title: 'Country-to-Country Trade Explorer', summary: 'Select two countries to see their trade relationship, agreements, ports, authorities and documentation resources together.', status: 'planned', phase: 4, note: 'Bilateral statistics need a licensed source usable from the browser.' },
      { id: 'maritime', title: 'Global Maritime Intelligence', summary: 'Vessel types, identification, specifications and reported movement where a provider permits it.', status: 'planned', phase: 4 },
      { id: 'maritime-map', title: 'Interactive Maritime Map', summary: 'Ports, routes and logistics hubs on a layered map, with real provider coverage stated.', status: 'planned', phase: 4, note: 'A country map is live on the home page. Port and vessel layers follow their datasets.' },
      { id: 'ports', title: 'Global Port Directory', summary: 'Ports with UN/LOCODE, authority, official website and documented capabilities.', status: 'planned', phase: 4 },
      { id: 'shipping-lines', title: 'Shipping Lines & Logistics', summary: 'Profiles of carriers and logistics organizations with official tracking links.', status: 'planned', phase: 4 },
      { id: 'tracking', title: 'Cargo & Shipment Tracking', summary: 'One place to find the right official carrier tracking page for a container, B/L or air waybill.', status: 'planned', phase: 4, note: 'Routing to official carrier tracking pages is achievable in the browser.' },
      { id: 'tracking-live', title: 'Unified live tracking results', summary: 'Tracking events shown inside eport across carriers.', status: 'requires-backend', phase: 4, note: 'Coming Soon — requires a secure integration layer. Carrier and aggregator APIs need protected credentials.' },
      { id: 'news', title: 'Trade News & Industry Intelligence', summary: 'Headlines from official publishers by topic, refreshed daily, plus a live headline search. Every item links to the original article.', status: 'foundation', phase: 1, path: '/intelligence/news', note: 'Five official publishers. Country tagging and more publishers come later.' },
    ],
  },
  {
    id: 'academy',
    title: 'Academy',
    kicker: 'eport Academy',
    path: '/academy',
    icon: 'graduation',
    purpose: 'Export-import learning and documentation',
    description:
      'Structured learning pathways for exporting and importing, a trade documentation library, and reference centres for Incoterms®, trade finance and product compliance.',
    modules: [
      { id: 'export-academy', title: 'Export Academy', summary: 'A 20-topic pathway from choosing a product to reconciling payment.', status: 'planned', phase: 2 },
      { id: 'import-academy', title: 'Import Academy', summary: 'A parallel pathway from supplier selection to post-import records.', status: 'planned', phase: 2 },
      { id: 'documentation', title: 'Trade Documentation Centre', summary: 'What each trade document is, who prepares and issues it, and when it actually applies.', status: 'planned', phase: 2 },
      { id: 'document-relationships', title: 'Document Relationship Intelligence', summary: 'Which documents depend on which, who prepares and issues them, and what to prepare first.', status: 'planned', phase: 2, note: 'The document schema already carries depends-on, prepared-by and issued-by relations.' },
      { id: 'incoterms', title: 'Incoterms® Learning Centre', summary: 'The 11 Incoterms® 2020 rules: obligations, cost, risk transfer and suitable use.', status: 'planned', phase: 2 },
      { id: 'trade-finance', title: 'Trade Finance Academy', summary: 'Payment methods and financing instruments, with their risks and parties.', status: 'planned', phase: 2 },
      { id: 'compliance', title: 'Product Compliance Academy', summary: 'How compliance depends on product, use, origin and destination, by sector.', status: 'planned', phase: 2 },
      { id: 'videos', title: 'Official Explainer Videos', summary: 'Videos from the WTO, WCO, ITC, IMO and ICC channels, verified against YouTube. Nothing loads until you press play.', status: 'foundation', phase: 1, path: '/academy/videos', note: 'General explainers from official channels. Country-specific video guides are not published.' },
      { id: 'document-generator', title: 'Document Template Generator', summary: 'Browser-based commercial templates with calculations, preview, PDF and local drafts.', status: 'planned', phase: 3 },
    ],
  },
  {
    id: 'connect',
    title: 'Connect',
    kicker: 'eport Connect',
    path: '/connect',
    icon: 'handshake',
    purpose: 'Business and opportunity discovery',
    description:
      'Structured discovery of buyers, suppliers and products, with a transparent verification status on every listing and an enquiry builder that runs in your browser.',
    modules: [
      { id: 'buyers', title: 'Global Buyer Directory', summary: 'Source-referenced buyer listings with explicit verification status.', status: 'planned', phase: 5 },
      { id: 'suppliers', title: 'Global Seller & Supplier Directory', summary: 'Supplier listings with documented certifications and export markets.', status: 'planned', phase: 5 },
      { id: 'products', title: 'Product Discovery', summary: 'Search products by name, category, HS code and country.', status: 'planned', phase: 5 },
      { id: 'rfq', title: 'Request for Quotation Centre', summary: 'Prepare a structured enquiry, then download, copy or open it in your own email application.', status: 'planned', phase: 5 },
      { id: 'marketplace', title: 'Accounts, messaging and secure RFQs', summary: 'Verified company profiles, private messaging and platform-mediated enquiries.', status: 'requires-backend', phase: 6, note: 'Coming Soon — these need a backend with authentication and moderation.' },
    ],
  },
  {
    id: 'trade-desk',
    title: 'Trade Desk',
    kicker: 'eport Trade Desk',
    path: '/trade-desk',
    icon: 'briefcase',
    purpose: 'Practical planning tools',
    description:
      'Guided planning tools for export and import projects. Everything you create stays in your browser — there are no accounts and nothing is uploaded.',
    modules: [
      { id: 'navigator', title: 'Smart Trade Navigator', summary: 'Describe a shipment and get a preliminary, source-linked action plan with mandatory, conditional, optional and unknown items.', status: 'planned', phase: 3 },
      { id: 'readiness', title: 'Trade Readiness Score', summary: 'A preliminary readiness assessment from what you have supplied, what is verified and what is still missing. Never an official approval.', status: 'planned', phase: 3 },
      { id: 'risk', title: 'Trade Risk Assessment', summary: 'Surface documentation, payment, compliance, shipping and counterparty risks before you commit.', status: 'planned', phase: 3 },
      { id: 'export-planner', title: 'Export Project Planner', summary: 'A step-by-step export workflow from product selection to payment realisation.', status: 'planned', phase: 3 },
      { id: 'import-planner', title: 'Import Project Planner', summary: 'A step-by-step import workflow from supplier research to records.', status: 'planned', phase: 3 },
      { id: 'checklists', title: 'Interactive Checklists', summary: 'Tasks, notes, due dates and progress, saved locally and exportable.', status: 'planned', phase: 3 },
      { id: 'cost-explorer', title: 'Trade Cost Explorer', summary: 'Landed-cost and export-cost estimates with every assumption shown.', status: 'planned', phase: 3 },
      { id: 'reports', title: 'Personal Trade Research Reports', summary: 'Downloadable reports built in your browser from your country, product, documentation and cost research.', status: 'planned', phase: 3 },
      { id: 'my-desk', title: 'My Trade Desk', summary: 'A browser-local workspace for projects, drafts and saved resources, with backup and restore.', status: 'planned', phase: 3 },
      { id: 'sync', title: 'Cross-device synchronisation', summary: 'The same workspace on several devices.', status: 'requires-backend', phase: 6, note: 'Coming Soon — needs server-side accounts. Local backup and restore files will cover moving data between devices.' },
    ],
  },
  {
    id: 'directory',
    title: 'Directory',
    kicker: 'eport Directory',
    path: '/directory',
    icon: 'landmark',
    purpose: 'Authorities, organizations and professionals',
    description:
      'A searchable directory that keeps official authorities, international organizations and commercial service providers clearly apart, each linked to its official website.',
    modules: [
      { id: 'organizations', title: 'International Organizations', summary: 'Intergovernmental, UN-system, treaty and private bodies that shape trade rules.', status: 'live', phase: 1, path: '/directory/organizations' },
      { id: 'authorities', title: 'Government & Official Authorities', summary: 'Trade, customs, tax, standards and sector regulators by country.', status: 'foundation', phase: 2, path: '/directory/authorities', note: 'India national authorities are seeded. Other jurisdictions follow.' },
      { id: 'single-window', title: 'National Single Window Directory', summary: 'Official single-window portals by country.', status: 'planned', phase: 2 },
      { id: 'professionals', title: 'Professional Directory', summary: 'Customs brokers, forwarders, inspection agencies, laboratories and advisers.', status: 'planned', phase: 5 },
    ],
  },
  {
    id: 'opportunities',
    title: 'Opportunities',
    kicker: 'eport Opportunities',
    path: '/opportunities',
    icon: 'calendar',
    purpose: 'Events, tenders and market openings',
    description:
      'Trade fairs, buyer-seller meetings, tenders and incentives — listed only with an organizer, an official link and a verification status.',
    modules: [
      { id: 'events', title: 'Trade Fairs & Exhibitions', summary: 'International fairs, exhibitions and conferences with official links.', status: 'planned', phase: 5 },
      { id: 'tenders', title: 'Tenders & Procurement', summary: 'Links to official procurement portals and published opportunities.', status: 'planned', phase: 5 },
      { id: 'incentives', title: 'Export Incentives', summary: 'Official incentive schemes by country, with source and validity.', status: 'planned', phase: 5 },
      { id: 'market-research', title: 'Market Research & Reports', summary: 'Published market studies and industry reports from official bodies.', status: 'planned', phase: 5 },
    ],
  },
];

/** Independently navigable specialist centres and cross-platform capabilities. */
export const CENTRES: PlatformModule[] = [
  { id: 'reliability', title: 'Data Reliability Centre', summary: 'See exactly which datasets, countries, APIs and authorities are verified, partial, seeded or unavailable.', status: 'live', phase: 1, path: '/data-reliability' },
  { id: 'knowledge-graph', title: 'Global Trade Knowledge Graph', summary: 'Records are linked — countries, authorities and organizations today; documents, ports, HS codes and agreements as they are published.', status: 'foundation', phase: 1, path: '/methodology', note: 'Shown as “Connected records” on every country, authority and organization page.' },
  { id: 'hs-explorer', title: 'HS Code Explorer', summary: 'International 6-digit HS classification, kept separate from national tariff lines.', status: 'planned', phase: 3 },
  { id: 'tariff-explorer', title: 'Tariff & Duty Explorer', summary: 'Tariffs by origin, destination, HS code and agreement, with source and validity.', status: 'planned', phase: 4 },
  { id: 'inspection', title: 'Inspection & Certification Centre', summary: 'Inspection, conformity assessment, testing and certificates explained.', status: 'planned', phase: 2 },
  { id: 'packaging', title: 'Packaging & Shipping Centre', summary: 'Export packaging, container loading, ISPM 15, dangerous goods and cold chain.', status: 'planned', phase: 2 },
  { id: 'risk-centre', title: 'Trade Risk & Security Centre', summary: 'Fraud, fake documents, sanctions, misclassification and dispute risks.', status: 'planned', phase: 2 },
  { id: 'green', title: 'Green Trade Centre', summary: 'Shipping emissions, environmental compliance and carbon-related trade measures.', status: 'planned', phase: 2 },
  { id: 'alerts', title: 'Trade Alerts', summary: 'Curated, sourced notices of policy, tariff and port changes.', status: 'planned', phase: 5, note: 'Curated static alerts only. Continuous monitoring would need server-side processing.' },
];

export const STATUS_LABEL: Record<ModuleStatus, string> = {
  live: 'Available',
  foundation: 'Available — expanding',
  planned: 'In development',
  'requires-backend': 'Coming Soon',
};

export function findDivision(id: string): Division | undefined {
  return DIVISIONS.find((d) => d.id === id);
}

export function allModules(): Array<PlatformModule & { division: string }> {
  return [
    ...DIVISIONS.flatMap((d) => d.modules.map((m) => ({ ...m, division: d.title }))),
    ...CENTRES.map((m) => ({ ...m, division: 'Specialist centres' })),
  ];
}
