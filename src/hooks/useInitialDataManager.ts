import { useCallback, useState, useRef } from 'react';
import { InitialData, IconCollectionState } from 'src/types';
import { INITIAL_DATA, INITIAL_SCENE_STATE } from 'src/config';
import {
  getFitToViewParams,
  CoordsUtils,
  categoriseIcons,
  generateId,
  getItemByIdOrThrow
} from 'src/utils';
import * as reducers from 'src/stores/reducers';
import { useModelStore } from 'src/stores/modelStore';
import { useView } from 'src/hooks/useView';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { modelSchema } from 'src/schemas/model';

export const useInitialDataManager = () => {
  const [isReady, setIsReady] = useState(false);
  const prevInitialData = useRef<InitialData>();
  const model = useModelStore((state) => {
    return state;
  });
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const rendererEl = useUiStateStore((state) => {
    return state.rendererEl;
  });
  const { changeView } = useView();

  const load = useCallback(
    (_initialData: InitialData) => {
      if (!_initialData || prevInitialData.current === _initialData) return;

      setIsReady(false);

      const validationResult = modelSchema.safeParse(_initialData);

      if (!validationResult.success) {
        // TODO: let's get better at reporting error messages here (starting with how we present them to users)
        // - not in console but in a modal
        console.log(validationResult.error.errors);
        window.alert('There is an error in your model.');
        return;
      }

      const initialData = _initialData;

      // 必須カラーの定義（テキスト用）
      const requiredColors = [
        { id: 'color_black', value: '#000000' },
        { id: 'color8', value: '#9e9e9e' }
      ];

      // 必須カラーが存在しない場合は追加
      const currentColorIds = new Set(initialData.colors.map((c) => c.id));
      requiredColors.forEach((requiredColor) => {
        if (!currentColorIds.has(requiredColor.id)) {
          initialData.colors.push(requiredColor);
          currentColorIds.add(requiredColor.id);
        }
      });

      // データ互換性のためのマイグレーション：古いカラーIDを処理
      // color_black, color_white などの古いIDを現在のcolorsの最初の要素にマッピング
      const legacyColorIds = ['color_white'];

      // 古いカラーIDが使用されているかチェックし、存在しない場合は警告を出す
      const shouldMigrate = legacyColorIds.some((legacyId) => {
        return !currentColorIds.has(legacyId);
      });

      if (shouldMigrate && initialData.colors.length > 0) {
        const defaultColorId = initialData.colors[0].id;

        // TextBoxesの古いカラーIDを更新
        initialData.views.forEach((view) => {
          view.textBoxes?.forEach((textBox) => {
            if (textBox.color && !currentColorIds.has(textBox.color)) {
              console.warn(
                `Migrating textBox color "${textBox.color}" to "${defaultColorId}"`
              );
              textBox.color = defaultColorId;
            }
          });

          // Connectorsの古いカラーIDを更新
          view.connectors?.forEach((connector) => {
            if (connector.color && !currentColorIds.has(connector.color)) {
              console.warn(
                `Migrating connector color "${connector.color}" to "${defaultColorId}"`
              );
              connector.color = defaultColorId;
            }
          });

          // Rectanglesの古いカラーIDを更新
          view.rectangles?.forEach((rectangle) => {
            if (rectangle.color && !currentColorIds.has(rectangle.color)) {
              console.warn(
                `Migrating rectangle color "${rectangle.color}" to "${defaultColorId}"`
              );
              rectangle.color = defaultColorId;
            }
          });
        });
      }

      if (initialData.views.length === 0) {
        const updates = reducers.view({
          action: 'CREATE_VIEW',
          payload: {},
          ctx: {
            state: { model: initialData, scene: INITIAL_SCENE_STATE },
            viewId: generateId()
          }
        });

        Object.assign(initialData, updates.model);
      }

      prevInitialData.current = initialData;
      model.actions.set(initialData);

      const view = getItemByIdOrThrow(
        initialData.views,
        initialData.view ?? initialData.views[0].id
      );

      changeView(view.value.id, initialData);

      if (initialData.fitToView) {
        const rendererSize = rendererEl?.getBoundingClientRect();

        const { zoom, scroll } = getFitToViewParams(view.value, {
          width: rendererSize?.width ?? 0,
          height: rendererSize?.height ?? 0
        });

        uiStateActions.setScroll({
          position: scroll,
          offset: CoordsUtils.zero()
        });

        uiStateActions.setZoom(zoom);
      }

      const categoriesState: IconCollectionState[] = categoriseIcons(
        initialData.icons
      ).map((collection) => {
        return {
          id: collection.name,
          isExpanded: false
        };
      });

      uiStateActions.setIconCategoriesState(categoriesState);

      setIsReady(true);
    },
    [changeView, model.actions, rendererEl, uiStateActions]
  );

  const clear = useCallback(() => {
    load({ ...INITIAL_DATA, icons: model.icons });
    uiStateActions.resetUiState();
  }, [load, model.icons, uiStateActions]);

  return {
    load,
    clear,
    isReady
  };
};
