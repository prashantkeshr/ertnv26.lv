/** Official country pages whose address is built from a country code. Existence is checked by scripts/fetch-portals.ts. */
export const PORTAL_URLS = {
  /** World Bank WITS country profile (trade summary, tariffs, partners). */
  wits: (iso3: string) => `https://wits.worldbank.org/CountryProfile/en/Country/${iso3}/Year/LTST/Summary`,
  /** WTO trade profile PDF (ISO 3166-1 alpha-2). */
  wtoProfile: (iso2: string) => `https://www.wto.org/english/res_e/statis_e/daily_update_e/trade_profiles/${iso2}_e.pdf`,
} as const;

/** Worldwide directories that are not tied to one country. */
export const GLOBAL_FINDERS = [
  { label: 'WCO members and their customs administrations', url: 'https://www.wcoomd.org/en/about-us/wco-members/membership.aspx', by: 'World Customs Organization' },
  { label: 'ITC Trade Map — trade statistics for any country', url: 'https://www.trademap.org/', by: 'International Trade Centre' },
] as const;
