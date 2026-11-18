import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { documentLevels } from '@/features/academy/documentLevels';
import { DocumentsFile, GlobalGuide, GlossaryFile, IncotermsFile } from '@/types/schemas';

const load = <T>(path: string, schema: { parse: (x: unknown) => T }): T => schema.parse(JSON.parse(readFileSync(`public/data/${path}`, 'utf8')));

describe('Incoterms data', () => {
  const inco = load('learning/incoterms.json', IncotermsFile);
  const rule = (code: string) => inco.rules.find((r) => r.code === code)!;

  it('has the eleven 2020 rules', () => {
    expect(inco.rules.map((r) => r.code).sort()).toEqual(['CFR', 'CIF', 'CIP', 'CPT', 'DAP', 'DDP', 'DPU', 'EXW', 'FAS', 'FCA', 'FOB'].sort());
  });

  it('keeps the facts that hold for every rule', () => {
    expect(rule('EXW').exportClearance).toBe('buyer');
    expect(inco.rules.filter((r) => r.exportClearance === 'buyer')).toHaveLength(1);
    expect(inco.rules.filter((r) => r.importClearance === 'seller').map((r) => r.code)).toEqual(['DDP']);
    expect(inco.rules.filter((r) => r.insurance === 'seller').map((r) => r.code).sort()).toEqual(['CIF', 'CIP']);
    expect(inco.rules.filter((r) => r.modes === 'sea').map((r) => r.code).sort()).toEqual(['CFR', 'CIF', 'FAS', 'FOB']);
  });

  it('puts risk and cost where C and D rules differ', () => {
    for (const code of ['CPT', 'CIP', 'CFR', 'CIF']) expect(rule(code).costsAt).toBeGreaterThan(rule(code).riskAt);
    for (const code of ['FCA', 'FAS', 'FOB']) expect(rule(code).costsAt).toBe(rule(code).riskAt);
  });
});

describe('documents', () => {
  const docs = load('learning/documents.json', DocumentsFile);

  it('orders documents so that each one comes after everything it draws on', () => {
    const levels = documentLevels(docs.documents);
    for (const d of docs.documents) for (const dep of d.dependsOn) expect(levels.get(d.id)!).toBeGreaterThan(levels.get(dep)!);
    expect(levels.get('commercial-invoice')).toBe(1);
    expect(levels.get('import-declaration')!).toBeGreaterThan(levels.get('bill-of-lading')!);
  });

  it('terminates on a malformed cycle instead of looping', () => {
    const cyc = [
      { ...docs.documents[0]!, id: 'a', dependsOn: ['b'] },
      { ...docs.documents[0]!, id: 'b', dependsOn: ['a'] },
    ];
    expect(documentLevels(cyc).size).toBe(2);
  });
});

describe('glossary and global guide', () => {
  it('only cross-references terms that exist', () => {
    const g = load('learning/glossary.json', GlossaryFile);
    const ids = new Set(g.terms.map((t) => t.id));
    for (const t of g.terms) for (const ref of t.seeAlso) expect(ids.has(ref)).toBe(true);
    expect(ids.size).toBe(g.terms.length);
  });

  it('states no country-specific rule and is not marked verified', () => {
    const g = load('guides/global.json', GlobalGuide);
    expect(g.status).not.toBe('officially-verified');
    expect(g.stages.length).toBeGreaterThanOrEqual(10);
    for (const s of g.stages) expect(s.lookFor.length).toBeGreaterThanOrEqual(2);
  });
});
