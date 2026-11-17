import { z } from 'zod';

/** TopoJSON as published by world-atlas. Loose objects keep the quantisation `transform` and other members intact. */
export const Topology = z.looseObject({
  type: z.literal('Topology'),
  objects: z.looseObject({ countries: z.looseObject({ type: z.string(), geometries: z.array(z.unknown()) }) }),
  arcs: z.array(z.unknown()),
  transform: z.object({ scale: z.tuple([z.number(), z.number()]), translate: z.tuple([z.number(), z.number()]) }),
});
export type TopologyData = z.infer<typeof Topology>;
