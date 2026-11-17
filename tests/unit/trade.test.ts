import { describe, expect, it } from 'vitest';
import { balanceFor, flowTotal, pairReport, rankOf, reportGap, sectorRows, topPartners, valueWith } from '@/features/trade/tradeMath';
import { parsePartners, parseSectors, witsUrl } from '@/services/api/providers/wits';
import type { TradePartnersFile } from '@/types/schemas';

const file = (reporter: string, over: Partial<TradePartnersFile> = {}): TradePartnersFile =>
  ({
    reporter,
    year: 2023,
    totals: { exports: 1000, imports: 800 },
    exports: [['AAA', 400], ['BBB', 100]],
    imports: [['BBB', 300], ['AAA', 50]],
    sectors: { exports: [['84-85_MachElec', 300], ['27-27_Fuels', 100]], imports: [['27-27_Fuels', 500]] },
    ...over,
  }) as unknown as TradePartnersFile;

describe('trade maths', () => {
  const a = file('AAA');
  const b = file('BBB', { exports: [['AAA', 120]], imports: [['AAA', 90]] });

  it('computes shares against the reporter’s own world total', () => {
    expect(topPartners(a, 'exports', 1)).toEqual([{ code: 'AAA', value: 400, share: 0.4 }]);
  });

  it('falls back to the sum of partners when no world total is published', () => {
    expect(flowTotal(file('X', { totals: {} as never }), 'exports')).toBe(500);
  });

  it('distinguishes "not listed" (null) from zero', () => {
    expect(valueWith(a, 'exports', 'ZZZ')).toBeNull();
    expect(valueWith(a, 'exports', 'BBB')).toBe(100);
    expect(rankOf(a, 'imports', 'AAA')).toBe(2);
    expect(rankOf(a, 'imports', 'ZZZ')).toBeNull();
  });

  it('turns sectors into shares that sum to one', () => {
    const rows = sectorRows(a, 'exports');
    expect(rows[0]).toMatchObject({ label: 'Machinery and electrical', share: 0.75 });
    expect(rows.reduce((s, r) => s + r.share, 0)).toBeCloseTo(1);
  });

  it('pairs each side’s own report with the partner’s mirror report', () => {
    const r = pairReport(a, b);
    expect(r.aToB).toEqual({ exportsReportedByA: 100, importsReportedByB: 90 });
    expect(r.bToA).toEqual({ exportsReportedByB: 120, importsReportedByA: 300 });
  });

  it('balances only from the two export reports, never from a mirror estimate', () => {
    expect(balanceFor(pairReport(a, b))).toBe(-20);
    expect(balanceFor(pairReport(a, file('BBB', { exports: [] })))).toBeNull();
  });

  it('measures the gap between two reports as a share of the larger', () => {
    expect(reportGap(100, 50)).toBe(0.5);
    expect(reportGap(0, 0)).toBe(0);
    expect(reportGap(null, 5)).toBeNull();
  });
});

describe('WITS parser', () => {
  const sdmx = (dimension: string, rows: Array<[string, number | null]>) => ({
    structure: { dimensions: { series: [{ id: 'REPORTER', values: [{ id: 'AAA', name: 'A' }] }, { id: dimension, values: rows.map(([id]) => ({ id, name: id })) }] } },
    dataSets: [{ series: Object.fromEntries(rows.map(([, v], i) => [`0:${i}`, { observations: { '0': [v] } }])) }],
  });

  it('builds a lowercase reporter URL for the requested flow and kind', () => {
    const url = witsUrl('IND', 2023, 'exports', 'partners');
    expect(url).toContain('/reporter/ind/year/2023/partner/all/product/Total/indicator/XPRT-TRD-VL');
    expect(witsUrl('IND', 2023, 'imports', 'sectors')).toContain('/partner/wld/product/all/indicator/MPRT-TRD-VL');
  });

  it('keeps only single countries, drops zero and null values, and reports the world total', () => {
    const out = parsePartners(sdmx('PARTNER', [['WLD', 1000], ['BBB', 300], ['CCC', 600], ['EUN', 400], ['DDD', 0], ['EEE', null]]), new Set(['BBB', 'CCC', 'DDD', 'EEE']));
    expect(out.world).toBe(1000);
    expect(out.partners).toEqual([['CCC', 600], ['BBB', 300]]);
  });

  it('keeps only the 16 HS-section groups', () => {
    const out = parseSectors(sdmx('PRODUCTCODE', [['Total', 900], ['27-27_Fuels', 500], ['84-85_MachElec', 300]]));
    expect(out).toEqual([['27-27_Fuels', 500], ['84-85_MachElec', 300]]);
  });

  it('returns nothing, rather than throwing, for a malformed response', () => {
    expect(parsePartners({ nope: true }, new Set())).toEqual({ world: null, partners: [] });
    expect(parseSectors(null)).toEqual([]);
  });
});
