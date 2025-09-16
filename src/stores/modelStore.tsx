import React, { createContext, useRef, useContext } from 'react';
import { createStore, useStore } from 'zustand';
import { ModelStore, View } from 'src/types';
import { INITIAL_DATA, VIEW_DEFAULTS } from 'src/config';
import { nanoid } from 'nanoid';

const initialState = () => {
  return createStore<ModelStore>((set, get) => {
    return {
      ...INITIAL_DATA,
      actions: {
        get,
        set,
        setTitle: (title: string) => {
          set({ title });
        },
        addView: (name?: string) => {
          const currentViews = get().views;
          const newView: View = {
            ...VIEW_DEFAULTS,
            id: nanoid(),
            name: name || `View ${currentViews.length + 1}`,
            lastUpdated: new Date().toISOString()
          };
          set({ views: [...currentViews, newView] });
          return newView.id;
        },
        deleteView: (viewId: string) => {
          const currentViews = get().views;
          if (currentViews.length <= 1) {
            return false;
          }
          set({ views: currentViews.filter(v => v.id !== viewId) });
          return true;
        },
        updateView: (viewId: string, updates: Partial<View>) => {
          const currentViews = get().views;
          set({
            views: currentViews.map(v =>
              v.id === viewId ? { ...v, ...updates } : v
            )
          });
        },
        reorderViews: (views: View[]) => {
          set({ views });
        }
      }
    };
  });
};

const ModelContext = createContext<ReturnType<typeof initialState> | null>(
  null
);

interface ProviderProps {
  children: React.ReactNode;
}

// TODO: Typings below are pretty gnarly due to the way Zustand works.
// see https://github.com/pmndrs/zustand/discussions/1180#discussioncomment-3439061
export const ModelProvider = ({ children }: ProviderProps) => {
  const storeRef = useRef<ReturnType<typeof initialState>>();

  if (!storeRef.current) {
    storeRef.current = initialState();
  }

  return (
    <ModelContext.Provider value={storeRef.current}>
      {children}
    </ModelContext.Provider>
  );
};

export function useModelStore<T>(
  selector: (state: ModelStore) => T,
  equalityFn?: (left: T, right: T) => boolean
) {
  const store = useContext(ModelContext);

  if (store === null) {
    throw new Error('Missing provider in the tree');
  }

  const value = useStore(store, selector, equalityFn);

  return value;
}
