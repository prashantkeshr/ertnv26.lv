import type { DocumentsFile } from '@/types/schemas';

type Doc = DocumentsFile['documents'][number];

/** Level 1 = depends on nothing; otherwise one more than the deepest document it draws on. */
export function documentLevels(docs: Doc[]): Map<string, number> {
  const byId = new Map(docs.map((d) => [d.id, d]));
  const memo = new Map<string, number>();
  const level = (id: string, seen: Set<string>): number => {
    const known = memo.get(id);
    if (known) return known;
    if (seen.has(id)) return 1; // a cycle is rejected at build time; this only prevents a loop
    const deps = byId.get(id)?.dependsOn ?? [];
    const value = deps.length === 0 ? 1 : 1 + Math.max(...deps.map((d) => level(d, new Set([...seen, id]))));
    memo.set(id, value);
    return value;
  };
  for (const d of docs) level(d.id, new Set());
  return memo;
}
