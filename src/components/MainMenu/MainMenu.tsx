import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Menu, Typography, Divider, Card } from '@mui/material';
import {
  Menu as MenuIcon,
  GitHub as GitHubIcon,
  QuestionAnswer as QuestionAnswerIcon,
  DataObject as ExportJsonIcon,
  ImageOutlined as ExportImageIcon,
  Publish as PublishIcon,
  FolderOpen as FolderOpenIcon,
  Save as SaveIcon,
  NoteAdd as NewDocIcon,
  ViewList as ViewListIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Upload as UploadIcon,
  Settings as SettingsIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { UiElement } from 'src/components/UiElement/UiElement';
import { IconButton } from 'src/components/IconButton/IconButton';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { exportAsJSON, modelFromModelStore, api } from 'src/utils';
import { useInitialDataManager } from 'src/hooks/useInitialDataManager';
import { useModelStore } from 'src/stores/modelStore';
import { MenuItem } from './MenuItem';
import { DocumentListDialog } from 'src/components/DocumentListDialog/DocumentListDialog';
import { documentApi } from 'src/services/documentApi';

export const MainMenu = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [publishAvailable, setPublishAvailable] = useState(false);
  const documentName = useModelStore((state) => state.documentName);
  const title = useModelStore((state) => state.title);
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
  const { load, clear } = initialDataManager;

  // Check if publish service is available
  useEffect(() => {
    api.publish.available()
      .then(result => setPublishAvailable(result.available))
      .catch(() => setPublishAvailable(false));
  }, []);

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

  const onNewDocument = useCallback(() => {
    const name = window.prompt('Enter document name:', 'New Document');
    if (!name) return;

    clear();
    modelActions.setDocumentName(name);
    modelActions.setTitle(name);
    uiStateActions.setIsMainMenuOpen(false);
  }, [modelActions, clear, uiStateActions]);

  const onSaveDocument = useCallback(async (skipPrompt?: boolean) => {
    let currentName = documentName;
    if (!currentName || currentName === 'Untitled') {
      currentName = title || 'Untitled';
    }

    // If skipPrompt is true and we have a valid document name, save directly
    let name = currentName;
    if (!skipPrompt || !documentName || documentName === 'Untitled') {
      const promptedName = window.prompt('Save document as:', currentName);
      if (!promptedName) return;
      name = promptedName;
    }

    try {
      const modelState = modelActions.get();
      const model = modelFromModelStore(modelState);
      await documentApi.save(name, model);
      modelActions.setDocumentName(name);
    } catch (err: any) {
      alert(`Failed to save: ${err.message}`);
    }
    uiStateActions.setIsMainMenuOpen(false);
  }, [documentName, title, modelActions, uiStateActions]);

  // Add keyboard shortcut for Cmd+S / Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd+S (Mac) or Ctrl+S (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        // Save directly if document name is set, otherwise prompt for name
        const hasValidName = !!(documentName && documentName !== 'Untitled');
        onSaveDocument(hasValidName);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [documentName, onSaveDocument]);

  const onOpenDocument = useCallback(() => {
    setDocumentDialogOpen(true);
    uiStateActions.setIsMainMenuOpen(false);
  }, [uiStateActions]);

  const onExportAsJSON = useCallback(async () => {
    const modelState = modelActions.get();
    const model = modelFromModelStore(modelState);
    exportAsJSON(model);
    uiStateActions.setIsMainMenuOpen(false);
  }, [modelActions, uiStateActions]);

  const onExportAsImage = useCallback(() => {
    uiStateActions.setIsMainMenuOpen(false);
    uiStateActions.setDialog('EXPORT_IMAGE');
  }, [uiStateActions]);

  const onPublishAsImage = useCallback(() => {
    uiStateActions.setIsMainMenuOpen(false);
    uiStateActions.setDialog('PUBLISH_IMAGE');
  }, [uiStateActions]);

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

  const onUploadIcon = useCallback(() => {
    uiStateActions.setIsMainMenuOpen(false);
    uiStateActions.setDialog('UPLOAD_ICON');
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
          <MenuItem onClick={onNewDocument} Icon={<NewDocIcon />}>
            New Document
          </MenuItem>

          <MenuItem onClick={() => onSaveDocument()} Icon={<SaveIcon />}>
            Save {documentName ? `(${documentName})` : ''}
          </MenuItem>

          <MenuItem onClick={onOpenDocument} Icon={<FolderOpenIcon />}>
            Open Document
          </MenuItem>

          <Divider />

          {mainMenuOptions.includes('ACTION.OPEN') && (
            <MenuItem onClick={onOpenModel} Icon={<FolderOpenIcon />}>
              Open from File
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

          {mainMenuOptions.includes('EXPORT.PNG') && publishAvailable && (
            <MenuItem onClick={onPublishAsImage} Icon={<PublishIcon />}>
              Publish as image
            </MenuItem>
          )}

          <Divider />

          <MenuItem onClick={onUploadIcon} Icon={<UploadIcon />}>
            Upload Icon
          </MenuItem>

          <MenuItem onClick={() => {
            uiStateActions.setDialog('FREEPIK_SEARCH');
            uiStateActions.setIsMainMenuOpen(false);
          }} Icon={<SearchIcon />}>
            Search Freepik
          </MenuItem>

          <MenuItem onClick={() => {
            uiStateActions.setDialog('ICON_MANAGEMENT');
            uiStateActions.setIsMainMenuOpen(false);
          }} Icon={<SettingsIcon />}>
            Manage Icons
          </MenuItem>


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
      <DocumentListDialog
        open={documentDialogOpen}
        onClose={() => setDocumentDialogOpen(false)}
      />
    </UiElement>
  );
};
