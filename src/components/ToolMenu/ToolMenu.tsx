import React, { useCallback, useEffect } from 'react';
import { Stack } from '@mui/material';
import {
  PanToolOutlined as PanToolIcon,
  NearMeOutlined as NearMeIcon,
  AddOutlined as AddIcon,
  EastOutlined as ConnectorIcon,
  CropSquareOutlined as CropSquareIcon,
  Title as TitleIcon
} from '@mui/icons-material';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { IconButton } from 'src/components/IconButton/IconButton';
import { UiElement } from 'src/components/UiElement/UiElement';
import { useScene } from 'src/hooks/useScene';
import { TEXTBOX_DEFAULTS } from 'src/config';
import { generateId } from 'src/utils';

export const ToolMenu = () => {
  const { createTextBox } = useScene();
  const mode = useUiStateStore((state) => {
    return state.mode;
  });
  const uiStateStoreActions = useUiStateStore((state) => {
    return state.actions;
  });
  const mousePosition = useUiStateStore((state) => {
    return state.mouse.position.tile;
  });

  const createTextBoxProxy = useCallback(() => {
    const textBoxId = generateId();

    createTextBox({
      ...TEXTBOX_DEFAULTS,
      id: textBoxId,
      tile: mousePosition
    });

    uiStateStoreActions.setMode({
      type: 'TEXTBOX',
      showCursor: false,
      id: textBoxId
    });
  }, [uiStateStoreActions, createTextBox, mousePosition]);

  // Add keyboard shortcuts for Cmd+1 through Cmd+6
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;

      switch (e.key) {
        case '1':
          e.preventDefault();
          uiStateStoreActions.setMode({
            type: 'CURSOR',
            showCursor: true,
            mousedownItem: null
          });
          break;
        case '2':
          e.preventDefault();
          uiStateStoreActions.setMode({
            type: 'PAN',
            showCursor: false
          });
          uiStateStoreActions.setItemControls(null);
          break;
        case '3':
          e.preventDefault();
          uiStateStoreActions.setItemControls({
            type: 'ADD_ITEM'
          });
          uiStateStoreActions.setMode({
            type: 'PLACE_ICON',
            showCursor: true,
            id: null
          });
          break;
        case '4':
          e.preventDefault();
          uiStateStoreActions.setMode({
            type: 'RECTANGLE.DRAW',
            showCursor: true,
            id: null
          });
          break;
        case '5':
          e.preventDefault();
          uiStateStoreActions.setMode({
            type: 'CONNECTOR',
            id: null,
            showCursor: true
          });
          break;
        case '6':
          e.preventDefault();
          createTextBoxProxy();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [uiStateStoreActions, createTextBoxProxy]);

  return (
    <UiElement>
      <Stack direction="row">
        <IconButton
          name="Select"
          Icon={<NearMeIcon />}
          shortcut="⌘1"
          onClick={() => {
            uiStateStoreActions.setMode({
              type: 'CURSOR',
              showCursor: true,
              mousedownItem: null
            });
          }}
          isActive={mode.type === 'CURSOR' || mode.type === 'DRAG_ITEMS'}
        />
        <IconButton
          name="Pan"
          Icon={<PanToolIcon />}
          shortcut="⌘2"
          onClick={() => {
            uiStateStoreActions.setMode({
              type: 'PAN',
              showCursor: false
            });

            uiStateStoreActions.setItemControls(null);
          }}
          isActive={mode.type === 'PAN'}
        />
        <IconButton
          name="Add item"
          Icon={<AddIcon />}
          shortcut="⌘3"
          onClick={() => {
            uiStateStoreActions.setItemControls({
              type: 'ADD_ITEM'
            });
            uiStateStoreActions.setMode({
              type: 'PLACE_ICON',
              showCursor: true,
              id: null
            });
          }}
          isActive={mode.type === 'PLACE_ICON'}
        />
        <IconButton
          name="Rectangle"
          Icon={<CropSquareIcon />}
          shortcut="⌘4"
          onClick={() => {
            uiStateStoreActions.setMode({
              type: 'RECTANGLE.DRAW',
              showCursor: true,
              id: null
            });
          }}
          isActive={mode.type === 'RECTANGLE.DRAW'}
        />
        <IconButton
          name="Connector"
          Icon={<ConnectorIcon />}
          shortcut="⌘5"
          onClick={() => {
            uiStateStoreActions.setMode({
              type: 'CONNECTOR',
              id: null,
              showCursor: true
            });
          }}
          isActive={mode.type === 'CONNECTOR'}
        />
        <IconButton
          name="Text"
          Icon={<TitleIcon />}
          shortcut="⌘6"
          onClick={createTextBoxProxy}
          isActive={mode.type === 'TEXTBOX'}
        />
      </Stack>
    </UiElement>
  );
};
