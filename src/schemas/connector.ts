import { z } from 'zod';
import { coords, id, constrainedStrings } from './common';

export const connectorStyleOptions = ['SOLID', 'DOTTED', 'DASHED'] as const;
export const arrowOptions = ['to', 'from', 'both', 'none'] as const;

export const anchorSchema = z.object({
  id,
  ref: z
    .object({
      item: id,
      anchor: id,
      tile: coords
    })
    .partial()
});

export const connectorSchema = z.object({
  id,
  description: constrainedStrings.description.optional(),
  color: id.optional(),
  width: z.number().optional(),
  style: z.enum(connectorStyleOptions).optional(),
  arrows: z.enum(arrowOptions).optional(),
  arrowOffset: z.number().optional(),
  anchors: z.array(anchorSchema),
  textSize: z.number().min(1).max(10).optional(),
  textFrame: z.boolean().optional(),
  textOffset: z.number().min(0).max(1).optional()
});
