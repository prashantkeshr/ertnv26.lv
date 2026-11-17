/**
 * Global Trade Knowledge Graph — query side.
 *
 * Edges are declared once on the record that owns them and compiled into
 * graph/index.json at build time. Here we answer "what is connected to this record?"
 * in both directions, grouped by the kind of relationship.
 */
import type { GraphFile, GraphNode } from '@/types/schemas';
import { RELATION_LABELS } from '@/utils/entities';

export interface RelatedItem {
  ref: string;
  node: GraphNode;
  note?: string;
}

export interface RelatedGroup {
  key: string;
  label: string;
  items: RelatedItem[];
}

export function relatedTo(graph: GraphFile, ref: string): RelatedGroup[] {
  const groups = new Map<string, RelatedGroup>();
  const add = (key: string, label: string, otherRef: string, note?: string) => {
    const node = graph.nodes[otherRef];
    if (!node) return;
    const group = groups.get(key) ?? { key, label, items: [] };
    if (!group.items.some((i) => i.ref === otherRef)) group.items.push({ ref: otherRef, node, note });
    groups.set(key, group);
  };

  for (const edge of graph.edges) {
    const labels = RELATION_LABELS[edge.type] ?? { forward: edge.type, reverse: edge.type };
    if (edge.from === ref) add(`out:${edge.type}`, labels.forward, edge.to, edge.note);
    else if (edge.to === ref) add(`in:${edge.type}`, labels.reverse, edge.from, edge.note);
  }

  const result = [...groups.values()];
  for (const g of result) g.items.sort((a, b) => a.node.label.localeCompare(b.node.label));
  // Outgoing relations (what this record points to) first, then incoming.
  return result.sort((a, b) => a.key.localeCompare(b.key) * -1);
}

export function countConnections(graph: GraphFile, ref: string): number {
  return graph.edges.reduce((n, e) => n + (e.from === ref || e.to === ref ? 1 : 0), 0);
}
