import type { ApiProvider, AuthorityCategory, OrgType } from '@/types/schemas';

export const ORG_TYPE_LABEL: Record<OrgType, string> = {
  intergovernmental: 'Intergovernmental organization',
  'un-system': 'United Nations system',
  'treaty-body': 'Intergovernmental treaty body',
  'private-business-organization': 'Private business organization',
  'non-governmental-standards-body': 'Non-governmental standards body',
  'industry-association': 'Industry association',
};

/** True when the body is created by governments or treaty; false for private and non-governmental bodies. */
export const ORG_IS_OFFICIAL: Record<OrgType, boolean> = {
  intergovernmental: true,
  'un-system': true,
  'treaty-body': true,
  'private-business-organization': false,
  'non-governmental-standards-body': false,
  'industry-association': false,
};

export const AUTHORITY_CATEGORY_LABEL: Record<AuthorityCategory, string> = {
  'trade-ministry': 'Trade ministry',
  'trade-regulator': 'Foreign trade regulator',
  customs: 'Customs authority',
  tax: 'Tax administration',
  'single-window': 'Customs e-filing and single window',
  'export-promotion': 'Export promotion authority',
  'trade-portal': 'Official trade information portal',
  'food-safety': 'Food safety regulator',
  'plant-health': 'Plant health authority',
  'pharmaceutical-regulator': 'Drugs and medical devices regulator',
  standards: 'National standards body',
  inspection: 'Export inspection body',
  'foreign-exchange': 'Central bank and foreign-exchange regulator',
  'export-credit': 'Export credit insurer',
  maritime: 'Maritime administration',
};

export const INTEGRATION_LABEL: Record<ApiProvider['integrationStatus'], string> = {
  integrated: 'Live in the browser',
  'build-time-snapshot': 'Published as dated snapshot',
  'approved-planned': 'Approved — not yet used',
  'coming-soon-secure-layer': 'Coming Soon — requires a secure integration layer',
  'external-link-only': 'External link only',
};

import type { NewsCategory } from '@/types/schemas';

export const NEWS_CATEGORY_LABEL: Record<NewsCategory, string> = {
  'international-trade': 'International trade',
  'maritime-shipping': 'Maritime shipping',
  ports: 'Ports',
  logistics: 'Logistics',
  policy: 'Trade policy',
  customs: 'Customs',
  tariffs: 'Tariffs',
  agreements: 'Agreements',
  'supply-chains': 'Supply chains',
  technology: 'Technology',
  sustainability: 'Sustainability',
  'trade-finance': 'Trade finance',
};
