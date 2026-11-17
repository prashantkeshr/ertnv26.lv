/** Ownership and contact facts, stated once. Node-safe. */
export const COMPANY = {
  supportEmail: 'support@dhurta.org',
  parent: { name: 'Dhurta.org', url: 'https://dhurta.org' },
  manager: 'Dhurta Group',
} as const;

export const OWNERSHIP_TEXT = `eport is a subsidiary of ${COMPANY.parent.name} and is managed by ${COMPANY.manager}.`;
