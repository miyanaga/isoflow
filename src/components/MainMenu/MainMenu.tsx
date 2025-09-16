import React, { useState, useCallback, useMemo } from 'react';
import { Menu, Typography, Divider, Card } from '@mui/material';
import {
  Menu as MenuIcon,
  GitHub as GitHubIcon,
  QuestionAnswer as QuestionAnswerIcon,
  DataObject as ExportJsonIcon,
  ImageOutlined as ExportImageIcon,
  FolderOpen as FolderOpenIcon,
  DeleteOutline as DeleteOutlineIcon,
  ViewList as ViewListIcon,
  Add as AddIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { UiElement } from 'src/components/UiElement/UiElement';
import { IconButton } from 'src/components/IconButton/IconButton';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { exportAsJSON, modelFromModelStore } from 'src/utils';
import { useInitialDataManager } from 'src/hooks/useInitialDataManager';
import { useModelStore } from 'src/stores/modelStore';
import { MenuItem } from './MenuItem';

export const MainMenu = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const model = useModelStore((state) => {
    return modelFromModelStore(state);
  });
  const views = useModelStore((state) => {
    return state.views;
  });
  const modelActions = useModelStore((state) => {
    return state.actions;
  });
  const currentViewId = useUiStateStore((state) => {
    return state.view;
  });
  const isMainMenuOpen = useUiStateStore((state) => {
    return state.isMainMenuOpen;
  });
  const mainMenuOptions = useUiStateStore((state) => {
    return state.mainMenuOptions;
  });
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const initialDataManager = useInitialDataManager();

  const onToggleMenu = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      setAnchorEl(event.currentTarget);
      uiStateActions.setIsMainMenuOpen(true);
    },
    [uiStateActions]
  );

  const gotoUrl = useCallback((url: string) => {
    window.open(url, '_blank');
  }, []);

  const { load } = initialDataManager;

  const onOpenModel = useCallback(async () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'application/json';

    fileInput.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];

      if (!file) {
        throw new Error('No file selected');
      }

      const fileReader = new FileReader();

      fileReader.onload = async (e) => {
        const modelData = JSON.parse(e.target?.result as string);
        load(modelData);
      };
      fileReader.readAsText(file);

      uiStateActions.resetUiState();
    };

    await fileInput.click();
    uiStateActions.setIsMainMenuOpen(false);
  }, [uiStateActions, load]);

  const onExportAsJSON = useCallback(async () => {
    exportAsJSON(model);
    uiStateActions.setIsMainMenuOpen(false);
  }, [model, uiStateActions]);

  const onExportAsImage = useCallback(() => {
    uiStateActions.setIsMainMenuOpen(false);
    uiStateActions.setDialog('EXPORT_IMAGE');
  }, [uiStateActions]);

  const { clear } = initialDataManager;

  const onClearCanvas = useCallback(() => {
    clear();
    uiStateActions.setIsMainMenuOpen(false);
  }, [uiStateActions, clear]);

  const onChangeView = useCallback((viewId: string) => {
    uiStateActions.setView(viewId);
    uiStateActions.setIsMainMenuOpen(false);
  }, [uiStateActions]);

  const onAddView = useCallback(() => {
    const newViewId = modelActions.addView();
    uiStateActions.setView(newViewId);
    uiStateActions.setIsMainMenuOpen(false);
  }, [modelActions, uiStateActions]);

  const onEditViews = useCallback(() => {
    uiStateActions.setIsMainMenuOpen(false);
    uiStateActions.setDialog('EDIT_VIEWS');
  }, [uiStateActions]);

  const sectionVisibility = useMemo(() => {
    return {
      actions: Boolean(
        mainMenuOptions.find((opt) => {
          return opt.includes('ACTION') || opt.includes('EXPORT');
        })
      ),
      links: Boolean(
        mainMenuOptions.find((opt) => {
          return opt.includes('LINK');
        })
      ),
      version: Boolean(mainMenuOptions.includes('VERSION')),
      views: views.length > 1
    };
  }, [mainMenuOptions, views.length]);

  if (mainMenuOptions.length === 0) {
    return null;
  }

  return (
    <UiElement>
      <IconButton Icon={<MenuIcon />} name="Main menu" onClick={onToggleMenu} />

      <Menu
        anchorEl={anchorEl}
        open={isMainMenuOpen}
        onClose={() => {
          uiStateActions.setIsMainMenuOpen(false);
        }}
        elevation={0}
        sx={{
          mt: 2
        }}
        MenuListProps={{
          sx: {
            minWidth: '250px',
            py: 0
          }
        }}
      >
        <Card sx={{ py: 1 }}>
          {mainMenuOptions.includes('ACTION.OPEN') && (
            <MenuItem onClick={onOpenModel} Icon={<FolderOpenIcon />}>
              Open
            </MenuItem>
          )}

          {mainMenuOptions.includes('EXPORT.JSON') && (
            <MenuItem onClick={onExportAsJSON} Icon={<ExportJsonIcon />}>
              Export as JSON
            </MenuItem>
          )}

          {mainMenuOptions.includes('EXPORT.PNG') && (
            <MenuItem onClick={onExportAsImage} Icon={<ExportImageIcon />}>
              Export as image
            </MenuItem>
          )}

          {mainMenuOptions.includes('ACTION.CLEAR_CANVAS') && (
            <MenuItem onClick={onClearCanvas} Icon={<DeleteOutlineIcon />}>
              Clear the canvas
            </MenuItem>
          )}

          {sectionVisibility.views && (
            <>
              <Divider />
              <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1 }}>
                Views
              </Typography>
              {views.map((view) => (
                <MenuItem
                  key={view.id}
                  onClick={() => onChangeView(view.id)}
                  Icon={<ViewListIcon />}
                  sx={{
                    backgroundColor: currentViewId === view.id ? 'action.selected' : 'transparent'
                  }}
                >
                  {view.name}
                </MenuItem>
              ))}
              <MenuItem onClick={onAddView} Icon={<AddIcon />}>
                Add New View
              </MenuItem>
              <MenuItem onClick={onEditViews} Icon={<EditIcon />}>
                Edit Views
              </MenuItem>
            </>
          )}

          {sectionVisibility.links && (
            <>
              <Divider />

              {mainMenuOptions.includes('LINK.GITHUB') && (
                <MenuItem
                  onClick={() => {
                    return gotoUrl(`${REPOSITORY_URL}`);
                  }}
                  Icon={<GitHubIcon />}
                >
                  GitHub
                </MenuItem>
              )}

              {mainMenuOptions.includes('LINK.DISCORD') && (
                <MenuItem
                  onClick={() => {
                    return gotoUrl('https://discord.gg/QYPkvZth7D');
                  }}
                  Icon={<QuestionAnswerIcon />}
                >
                  Discord
                </MenuItem>
              )}
            </>
          )}

          {sectionVisibility.version && (
            <>
              <Divider />

              {mainMenuOptions.includes('VERSION') && (
                <MenuItem>
                  <Typography variant="body2" color="text.secondary">
                    Isoflow v{PACKAGE_VERSION}
                  </Typography>
                </MenuItem>
              )}
            </>
          )}
        </Card>
      </Menu>
    </UiElement>
  );
};
