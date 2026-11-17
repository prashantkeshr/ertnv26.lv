/**
 * Pure calculations over the WITS bilateral snapshot. Values in the files are US$ thousand,
 * as reported by the reporting country; helpers convert to US$ only for display.
 */
import { SECTOR_LABEL, type Flow } from '@/services/api/providers/wits';
import type { TradePartnersFile } from '@/types/schemas';

export const toUsd = (thousand: number) => thousand * 1000;

export interface PartnerRow {
  code: string;
  value: number;
  /** Share of the reporter's world total for this flow (0–1). */
  share: number;
}

/** The total used for shares: the reporter's own world total, else the sum of listed partners. */
export function flowTotal(file: TradePartnersFile, flow: Flow): number {
  return file.totals[flow] ?? file[flow].reduce((sum, [, v]) => sum + v, 0);
}

export function topPartners(file: TradePartnersFile, flow: Flow, count: number): PartnerRow[] {
  const total = flowTotal(file, flow);
  return file[flow].slice(0, count).map(([code, value]) => ({ code, value, share: total > 0 ? value / total : 0 }));
}

/** One partner's value in a flow, or null when the reporter lists none (not the same as zero). */
export function valueWith(file: TradePartnersFile, flow: Flow, partner: string): number | null {
  return file[flow].find(([code]) => code === partner)?.[1] ?? null;
}

/** 1-based rank of a partner among the reporter's partners for a flow. */
export function rankOf(file: TradePartnersFile, flow: Flow, partner: string): number | null {
  const i = file[flow].findIndex(([code]) => code === partner);
  return i < 0 ? null : i + 1;
}

export interface SectorRow {
  id: string;
  label: string;
  value: number;
  share: number;
}

export function sectorRows(file: TradePartnersFile, flow: Flow): SectorRow[] {
  const rows = file.sectors[flow];
  const total = rows.reduce((sum, [, v]) => sum + v, 0);
  return rows.map(([id, value]) => ({ id, label: SECTOR_LABEL[id] ?? id, value, share: total > 0 ? value / total : 0 }));
}

export interface PairReport {
  /** A's own report of exports to B, and B's own report of imports from A (the "mirror"). */
  aToB: { exportsReportedByA: number | null; importsReportedByB: number | null };
  bToA: { exportsReportedByB: number | null; importsReportedByA: number | null };
}

export function pairReport(a: TradePartnersFile, b: TradePartnersFile): PairReport {
  return {
    aToB: { exportsReportedByA: valueWith(a, 'exports', b.reporter), importsReportedByB: valueWith(b, 'imports', a.reporter) },
    bToA: { exportsReportedByB: valueWith(b, 'exports', a.reporter), importsReportedByA: valueWith(a, 'imports', b.reporter) },
  };
}

/**
 * Bilateral balance from A's point of view, using each side's own export report (so no figure is
 * mixed with a mirror estimate). Null when either side reports nothing.
 */
export function balanceFor(report: PairReport): number | null {
  const out = report.aToB.exportsReportedByA;
  const back = report.bToA.exportsReportedByB;
  return out === null || back === null ? null : out - back;
}

/** Gap between two reports of the same flow, as a share of the larger (0–1). */
export function reportGap(x: number | null, y: number | null): number | null {
  if (x === null || y === null) return null;
  const max = Math.max(x, y);
  return max === 0 ? 0 : Math.abs(x - y) / max;
}
