import z from 'zod';
import {
  iconSchema,
  modelSchema,
  modelItemSchema,
  modelItemsSchema,
  viewsSchema,
  viewSchema,
  viewItemSchema,
  connectorSchema,
  iconsSchema,
  colorsSchema,
  anchorSchema,
  textBoxSchema,
  rectangleSchema,
  connectorStyleOptions,
  arrowOptions
} from 'src/schemas';
import { StoreApi } from 'zustand';

export { connectorStyleOptions, arrowOptions } from 'src/schemas';
export type Model = z.infer<typeof modelSchema>;
export type ModelItems = z.infer<typeof modelItemsSchema>;
export type Icon = z.infer<typeof iconSchema>;
export type Icons = z.infer<typeof iconsSchema>;
export type Colors = z.infer<typeof colorsSchema>;
export type ModelItem = z.infer<typeof modelItemSchema>;
export type Views = z.infer<typeof viewsSchema>;
export type View = z.infer<typeof viewSchema>;
export type ViewItem = z.infer<typeof viewItemSchema>;
export type ConnectorStyle = keyof typeof connectorStyleOptions;
export type ArrowStyle = keyof typeof arrowOptions;
export type ConnectorAnchor = z.infer<typeof anchorSchema>;
export type Connector = z.infer<typeof connectorSchema>;
export type TextBox = z.infer<typeof textBoxSchema>;
export type Rectangle = z.infer<typeof rectangleSchema>;

export type ModelStore = Model & {
  documentName?: string;
  actions: {
    get: StoreApi<ModelStore>['getState'];
    set: StoreApi<ModelStore>['setState'];
    setTitle: (title: string) => void;
    setDocumentName: (name: string) => void;
    addView: (name?: string) => string;
    deleteView: (viewId: string) => boolean;
    updateView: (viewId: string, updates: Partial<View>) => void;
    reorderViews: (views: View[]) => void;
  };
};
