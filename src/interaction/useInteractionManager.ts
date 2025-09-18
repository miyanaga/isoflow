import { useCallback, useEffect, useRef } from 'react';
import { useModelStore } from 'src/stores/modelStore';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useSceneStore } from 'src/stores/sceneStore';
import { ModeActions, State, SlimMouseEvent } from 'src/types';
import { getMouse, getItemAtTile, generateId, CoordsUtils } from 'src/utils';
import { useResizeObserver } from 'src/hooks/useResizeObserver';
import { useScene } from 'src/hooks/useScene';
import { Cursor } from './modes/Cursor';
import { DragItems } from './modes/DragItems';
import { DrawRectangle } from './modes/Rectangle/DrawRectangle';
import { TransformRectangle } from './modes/Rectangle/TransformRectangle';
import { Connector } from './modes/Connector';
import { Pan } from './modes/Pan';
import { PlaceIcon } from './modes/PlaceIcon';
import { TextBox } from './modes/TextBox';

const modes: { [k in string]: ModeActions } = {
  CURSOR: Cursor,
  DRAG_ITEMS: DragItems,
  // TODO: Adopt this notation for all modes (i.e. {node.type}.{action})
  'RECTANGLE.DRAW': DrawRectangle,
  'RECTANGLE.TRANSFORM': TransformRectangle,
  CONNECTOR: Connector,
  PAN: Pan,
  PLACE_ICON: PlaceIcon,
  TEXTBOX: TextBox
};

const getModeFunction = (mode: ModeActions, e: SlimMouseEvent) => {
  switch (e.type) {
    case 'mousemove':
      return mode.mousemove;
    case 'mousedown':
      return mode.mousedown;
    case 'mouseup':
      return mode.mouseup;
    default:
      return null;
  }
};

export const useInteractionManager = () => {
  const rendererRef = useRef<HTMLElement>();
  const reducerTypeRef = useRef<string>();
  const uiState = useUiStateStore((state) => {
    return state;
  });
  const model = useModelStore((state) => {
    return state;
  });
  const scene = useScene();
  const { size: rendererSize } = useResizeObserver(uiState.rendererEl);

  const onMouseEvent = useCallback(
    (e: SlimMouseEvent) => {
      if (!rendererRef.current) return;

      const mode = modes[uiState.mode.type];
      const modeFunction = getModeFunction(mode, e);

      if (!modeFunction) return;

      const nextMouse = getMouse({
        interactiveElement: rendererRef.current,
        zoom: uiState.zoom,
        scroll: uiState.scroll,
        lastMouse: uiState.mouse,
        mouseEvent: e,
        rendererSize
      });

      uiState.actions.setMouse(nextMouse);

      const baseState: State = {
        model,
        scene,
        uiState,
        rendererRef: rendererRef.current,
        rendererSize,
        isRendererInteraction: rendererRef.current === e.target
      };

      if (reducerTypeRef.current !== uiState.mode.type) {
        const prevReducer = reducerTypeRef.current
          ? modes[reducerTypeRef.current]
          : null;

        if (prevReducer && prevReducer.exit) {
          prevReducer.exit(baseState);
        }

        if (mode.entry) {
          mode.entry(baseState);
        }
      }

      modeFunction(baseState);
      reducerTypeRef.current = uiState.mode.type;
    },
    [model, scene, uiState, rendererSize]
  );

  const onContextMenu = useCallback(
    (e: SlimMouseEvent) => {
      e.preventDefault();

      const itemAtTile = getItemAtTile({
        tile: uiState.mouse.position.tile,
        scene
      });

      if (itemAtTile?.type === 'RECTANGLE') {
        uiState.actions.setContextMenu({
          item: itemAtTile,
          tile: uiState.mouse.position.tile
        });
      } else if (uiState.contextMenu) {
        uiState.actions.setContextMenu(null);
      }
    },
    [uiState.mouse, scene, uiState.contextMenu, uiState.actions]
  );

  useEffect(() => {
    if (uiState.mode.type === 'INTERACTIONS_DISABLED') return;

    const el = window;

    const onTouchStart = (e: TouchEvent) => {
      onMouseEvent({
        ...e,
        clientX: Math.floor(e.touches[0].clientX),
        clientY: Math.floor(e.touches[0].clientY),
        type: 'mousedown'
      });
    };

    const onTouchMove = (e: TouchEvent) => {
      onMouseEvent({
        ...e,
        clientX: Math.floor(e.touches[0].clientX),
        clientY: Math.floor(e.touches[0].clientY),
        type: 'mousemove'
      });
    };

    const onTouchEnd = (e: TouchEvent) => {
      onMouseEvent({
        ...e,
        clientX: 0,
        clientY: 0,
        type: 'mouseup'
      });
    };

    const onScroll = (e: WheelEvent) => {
      if (e.deltaY > 0) {
        uiState.actions.decrementZoom();
      } else {
        uiState.actions.incrementZoom();
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      // Shiftキーが押された時、一時的にPanモードに切り替え（ダイアログが開いていない時のみ）
      if (e.shiftKey && !e.repeat && uiState.mode.type !== 'PAN' && !uiState.dialog) {
        e.preventDefault();
        uiState.actions.setTemporaryMode({
          type: 'PAN',
          showCursor: false
        });
      }

      // Delete/Backspaceキーで選択中のアイテムを削除（ダイアログが開いていない時のみ）
      if ((e.key === 'Delete' || e.key === 'Backspace') && !uiState.dialog) {
        // テキストボックス編集中は削除しない
        if (uiState.mode.type === 'TEXTBOX') return;

        const selectedItems = [];
        if (uiState.itemControls) {
          selectedItems.push(uiState.itemControls);
        }
        if (uiState.mode.type === 'DRAG_ITEMS' && uiState.mode.items) {
          selectedItems.push(...uiState.mode.items);
        }

        if (selectedItems.length > 0) {
          e.preventDefault();
          selectedItems.forEach(item => {
            if (item.type === 'ITEM') {
              scene.deleteViewItem(item.id);
            } else if (item.type === 'CONNECTOR') {
              scene.deleteConnector(item.id);
            } else if (item.type === 'RECTANGLE') {
              scene.deleteRectangle(item.id);
            } else if (item.type === 'TEXTBOX') {
              scene.deleteTextBox(item.id);
            }
          });
          // Clear selection after deletion
          uiState.actions.setItemControls(null);
        }
      }

      // Ctrl/Cmd+D で選択中のアイテムを複製（ダイアログが開いていない時のみ）
      if ((e.metaKey || e.ctrlKey) && e.key === 'd' && !uiState.dialog) {
        const selectedItems = [];
        if (uiState.itemControls && uiState.itemControls.type !== 'ADD_ITEM') {
          selectedItems.push(uiState.itemControls);
        }
        if (uiState.mode.type === 'DRAG_ITEMS' && uiState.mode.items) {
          selectedItems.push(...uiState.mode.items);
        }

        if (selectedItems.length > 0) {
          e.preventDefault();
          let newItem = null;

          const item = selectedItems[0]; // For now, duplicate only the first item
          if (item.type === 'ITEM') {
            const viewItem = scene.items.find(i => i.id === item.id);
            if (viewItem) {
              const newViewItem = {
                ...viewItem,
                id: generateId(),
                tile: CoordsUtils.add(viewItem.tile, { x: 1, y: 1 })
              };
              scene.createViewItem(newViewItem);
              newItem = { type: 'ITEM' as const, id: newViewItem.id };
            }
          } else if (item.type === 'CONNECTOR') {
            const connector = scene.connectors.find(c => c.id === item.id);
            if (connector) {
              const newConnector = {
                ...connector,
                id: generateId()
              };
              scene.createConnector(newConnector);
              newItem = { type: 'CONNECTOR' as const, id: newConnector.id };
            }
          } else if (item.type === 'RECTANGLE') {
            const rectangle = scene.rectangles.find(r => r.id === item.id);
            if (rectangle) {
              const newRectangle = {
                ...rectangle,
                id: generateId(),
                from: CoordsUtils.add(rectangle.from, { x: 1, y: 1 }),
                to: CoordsUtils.add(rectangle.to, { x: 1, y: 1 })
              };
              scene.createRectangle(newRectangle);
              newItem = { type: 'RECTANGLE' as const, id: newRectangle.id };
            }
          } else if (item.type === 'TEXTBOX') {
            const textBox = scene.textBoxes.find(t => t.id === item.id);
            if (textBox) {
              const newTextBox = {
                ...textBox,
                id: generateId(),
                tile: CoordsUtils.add(textBox.tile, { x: 1, y: 1 })
              };
              scene.createTextBox(newTextBox);
              newItem = { type: 'TEXTBOX' as const, id: newTextBox.id };
            }
          }

          // Select the newly duplicated item
          if (newItem) {
            uiState.actions.setItemControls(newItem);
          }
        }
      }

      // Ctrl/Cmd+T で選択中のアイテムを水平反転（ダイアログが開いていない時のみ）
      if ((e.metaKey || e.ctrlKey) && e.key === 't' && !uiState.dialog) {
        if (uiState.itemControls && uiState.itemControls.type === 'ITEM') {
          e.preventDefault();
          const itemId = uiState.itemControls.id;
          const viewItem = scene.items.find(i => i.id === itemId);
          if (viewItem) {
            scene.updateViewItem(viewItem.id, { flipHorizontal: !viewItem.flipHorizontal });
          }
        }
      }

      // Ctrl/Cmd+E でExport（ダイアログが開いていない時のみ）
      if ((e.metaKey || e.ctrlKey) && e.key === 'e' && !uiState.dialog) {
        e.preventDefault();
        uiState.actions.setDialog('EXPORT_IMAGE');
      }

      // Ctrl/Cmd+P でPublish（ダイアログが開いていない時のみ）
      if ((e.metaKey || e.ctrlKey) && e.key === 'p' && !uiState.dialog) {
        e.preventDefault();
        uiState.actions.setDialog('PUBLISH_IMAGE');
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      // Shiftキーが離された時、元のモードに戻る（ダイアログが開いていない時のみ）
      if (e.key === 'Shift' && !uiState.dialog) {
        e.preventDefault();
        uiState.actions.clearTemporaryMode();
      }
    };

    el.addEventListener('mousemove', onMouseEvent);
    el.addEventListener('mousedown', onMouseEvent);
    el.addEventListener('mouseup', onMouseEvent);
    el.addEventListener('contextmenu', onContextMenu);
    el.addEventListener('touchstart', onTouchStart);
    el.addEventListener('touchmove', onTouchMove);
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('keydown', onKeyDown);
    el.addEventListener('keyup', onKeyUp);
    uiState.rendererEl?.addEventListener('wheel', onScroll);

    return () => {
      el.removeEventListener('mousemove', onMouseEvent);
      el.removeEventListener('mousedown', onMouseEvent);
      el.removeEventListener('mouseup', onMouseEvent);
      el.removeEventListener('contextmenu', onContextMenu);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('keydown', onKeyDown);
      el.removeEventListener('keyup', onKeyUp);
      uiState.rendererEl?.removeEventListener('wheel', onScroll);
    };
  }, [
    uiState.editorMode,
    onMouseEvent,
    uiState.mode.type,
    onContextMenu,
    uiState.actions,
    uiState.rendererEl
  ]);

  const setInteractionsElement = useCallback((element: HTMLElement) => {
    rendererRef.current = element;
  }, []);

  return {
    setInteractionsElement
  };
};
