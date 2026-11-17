/**
 * World Bank WITS — merchandise trade by partner and by sector (reporter-reported, US$ thousand).
 * Registry id: "wits". WITS sends no CORS headers, so eport reads it at build time
 * (scripts/fetch-wits.ts) and publishes dated static files. This module is the pure parser,
 * shared by that script and its unit tests.
 *
 * Data is mirrored from UN Comtrade as reported by each reporting country: an exporter's figure
 * for exports to B rarely equals B's reported imports from A (CIF/FOB valuation, timing, re-exports).
 */
import { z } from 'zod';

export const WITS_ID = 'wits';
export const WITS_BASE = 'https://wits.worldbank.org/API/V1/SDMX/V21/datasource/tradestats-trade';

export type Flow = 'exports' | 'imports';
export const FLOW_INDICATOR: Record<Flow, string> = { exports: 'XPRT-TRD-VL', imports: 'MPRT-TRD-VL' };

export function witsUrl(reporter: string, year: number, flow: Flow, kind: 'partners' | 'sectors'): string {
  const partner = kind === 'partners' ? 'all' : 'wld';
  const product = kind === 'partners' ? 'Total' : 'all';
  return `${WITS_BASE}/reporter/${reporter.toLowerCase()}/year/${year}/partner/${partner}/product/${product}/indicator/${FLOW_INDICATOR[flow]}?format=JSON`;
}

const Dimension = z.object({ id: z.string(), values: z.array(z.object({ id: z.string(), name: z.string() })) });
const Response = z.object({
  structure: z.object({ dimensions: z.object({ series: z.array(Dimension) }) }),
  dataSets: z.array(z.object({ series: z.record(z.string(), z.object({ observations: z.record(z.string(), z.array(z.union([z.number(), z.null()]))) })) })),
});

/** Every series in the response as {value (US$ thousand), dimension value id for the chosen dimension}. */
function seriesBy(json: unknown, dimensionId: 'PARTNER' | 'PRODUCTCODE'): Array<{ id: string; value: number }> {
  const parsed = Response.safeParse(json);
  if (!parsed.success) return [];
  const dims = parsed.data.structure.dimensions.series;
  const at = dims.findIndex((d) => d.id === dimensionId);
  if (at < 0) return [];
  const out: Array<{ id: string; value: number }> = [];
  for (const [key, series] of Object.entries(parsed.data.dataSets[0]?.series ?? {})) {
    const idx = Number(key.split(':')[at]);
    const id = dims[at]!.values[idx]?.id;
    const value = Object.values(series.observations)[0]?.[0];
    if (id && typeof value === 'number' && Number.isFinite(value) && value >= 0) out.push({ id, value });
  }
  return out;
}

/** Partner values (ISO3 → US$ thousand), the world total, and nothing that is not a single country. */
export function parsePartners(json: unknown, countryCodes: ReadonlySet<string>): { world: number | null; partners: Array<[string, number]> } {
  const rows = seriesBy(json, 'PARTNER');
  const world = rows.find((r) => r.id === 'WLD')?.value ?? null;
  const partners = rows
    .filter((r) => countryCodes.has(r.id) && r.value > 0)
    .sort((a, b) => b.value - a.value)
    .map((r): [string, number] => [r.id, r.value]);
  return { world, partners };
}

/** The 16 HS-section groups ("01-05_Animal" …), which partition all goods. */
export function parseSectors(json: unknown): Array<[string, number]> {
  return seriesBy(json, 'PRODUCTCODE')
    .filter((r) => /^\d{2}-\d{2}_/.test(r.id) && r.value > 0)
    .sort((a, b) => b.value - a.value)
    .map((r): [string, number] => [r.id, r.value]);
}

/** Display names for the sector groups (WITS ids → plain English). */
export const SECTOR_LABEL: Record<string, string> = {
  '01-05_Animal': 'Animal products',
  '06-15_Vegetable': 'Vegetable products',
  '16-24_FoodProd': 'Food products',
  '25-26_Minerals': 'Minerals',
  '27-27_Fuels': 'Fuels',
  '28-38_Chemicals': 'Chemicals',
  '39-40_PlastiRub': 'Plastics and rubber',
  '41-43_HidesSkin': 'Hides and skins',
  '44-49_Wood': 'Wood and paper',
  '50-63_TextCloth': 'Textiles and clothing',
  '64-67_Footwear': 'Footwear',
  '68-71_StoneGlas': 'Stone, glass, precious goods',
  '72-83_Metals': 'Metals',
  '84-85_MachElec': 'Machinery and electrical',
  '86-89_Transport': 'Transport equipment',
  '90-99_Miscellan': 'Miscellaneous',
};
