/** Helpers for typed entity references ("country:IN"). Shared by the app and the Node data scripts. */
import type { EntityType } from '@/types/schemas';

export function makeRef(type: EntityType, id: string): string {
  return `${type}:${id}`;
}

export function parseRef(ref: string): { type: EntityType; id: string } {
  const i = ref.indexOf(':');
  return { type: ref.slice(0, i) as EntityType, id: ref.slice(i + 1) };
}

/** Site path of a record's page, or null when that record type has no page yet. */
export function entityPath(ref: string): string | null {
  const { type, id } = parseRef(ref);
  switch (type) {
    case 'country':
      return `/countries/${id}`;
    case 'organization':
      return `/directory/organizations/${id}`;
    case 'authority':
      return `/directory/authorities/${id}`;
    default:
      return null;
  }
}

export const ENTITY_LABELS: Record<EntityType, { singular: string; plural: string }> = {
  country: { singular: 'Country', plural: 'Countries' },
  organization: { singular: 'Organization', plural: 'International organizations' },
  authority: { singular: 'Authority', plural: 'Authorities' },
  document: { singular: 'Document', plural: 'Documents' },
  port: { singular: 'Port', plural: 'Ports' },
  product: { singular: 'Product', plural: 'Products' },
  'hs-code': { singular: 'HS code', plural: 'HS codes' },
  agreement: { singular: 'Trade agreement', plural: 'Trade agreements' },
  'shipping-line': { singular: 'Shipping line', plural: 'Shipping lines' },
  page: { singular: 'Page', plural: 'Pages and tools' },
};

export const RELATION_LABELS: Record<string, { forward: string; reverse: string }> = {
  jurisdiction: { forward: 'Has jurisdiction in', reverse: 'Authorities in this jurisdiction' },
  'headquartered-in': { forward: 'Headquartered in', reverse: 'Organizations headquartered here' },
  'parent-body': { forward: 'Reports to', reverse: 'Bodies under this authority' },
  'operated-by': { forward: 'Operated by', reverse: 'Operates' },
  'hosted-by': { forward: 'Hosted by', reverse: 'Hosts' },
  'joint-agency-of': { forward: 'Joint agency of', reverse: 'Joint agencies' },
  'works-with': { forward: 'International counterpart', reverse: 'National bodies working with this organization' },
  administers: { forward: 'Administers', reverse: 'Administered by' },
  'depends-on': { forward: 'Depends on', reverse: 'Required for' },
  'issued-by': { forward: 'Issued by', reverse: 'Issues' },
  'prepared-by': { forward: 'Prepared by', reverse: 'Prepares' },
  'located-in': { forward: 'Located in', reverse: 'Located here' },
};
