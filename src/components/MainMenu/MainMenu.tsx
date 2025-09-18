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
  Search as SearchIcon,
  ContentCopy as ContentCopyIcon
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

  const onNewDocument = useCallback(async () => {
    let name: string | null = null;
    let nameExists = true;

    // Keep asking until we get a unique name or user cancels
    while (nameExists) {
      name = window.prompt('Enter document name:', name || 'New Document');
      if (!name) return;

      try {
        const exists = await documentApi.exists(name);
        if (exists) {
          alert(`Document "${name}" already exists. Please choose a different name.`);
        } else {
          nameExists = false;
        }
      } catch (err) {
        console.error('Error checking document existence:', err);
        alert('Failed to check if document exists. Please try again.');
        return;
      }
    }

    if (name) {
      // Clear the current document
      clear();
      // Set the document name and title
      modelActions.setDocumentName(name);
      modelActions.setTitle(name);

      // Save the new document immediately
      try {
        const modelState = modelActions.get();
        const model = modelFromModelStore(modelState);
        await documentApi.save(name, model);
      } catch (err: any) {
        alert(`Failed to save document: ${err.message}`);
      }

      uiStateActions.setIsMainMenuOpen(false);
    }
  }, [modelActions, clear, uiStateActions]);

  const onSaveAsDocument = useCallback(async () => {
    let currentName = documentName || title || 'Untitled';
    let name: string | null = null;
    let nameExists = true;

    // Keep asking until we get a unique name or user cancels
    while (nameExists) {
      name = window.prompt('Save document as:', name || currentName);
      if (!name) return;

      // Don't check if it's the same as current document name
      if (name === documentName) {
        nameExists = false;
      } else {
        try {
          const exists = await documentApi.exists(name);
          if (exists) {
            alert(`Document "${name}" already exists. Please choose a different name.`);
          } else {
            nameExists = false;
          }
        } catch (err) {
          console.error('Error checking document existence:', err);
          alert('Failed to check if document exists. Please try again.');
          return;
        }
      }
    }

    if (name) {
      try {
        const modelState = modelActions.get();
        const model = modelFromModelStore(modelState);
        await documentApi.save(name, model);
        modelActions.setDocumentName(name);
        modelActions.setTitle(name);
      } catch (err: any) {
        alert(`Failed to save: ${err.message}`);
      }
    }
    uiStateActions.setIsMainMenuOpen(false);
  }, [documentName, title, modelActions, uiStateActions]);

  // Auto-save every 10 seconds if document has a name
  useEffect(() => {
    if (!documentName || documentName === 'Untitled') {
      return; // Don't auto-save unnamed documents
    }

    const autoSave = async () => {
      try {
        const modelState = modelActions.get();
        const model = modelFromModelStore(modelState);
        await documentApi.save(documentName, model);
        console.log(`Auto-saved document: ${documentName}`);
      } catch (err: any) {
        console.error('Auto-save failed:', err.message);
      }
    };

    const intervalId = setInterval(autoSave, 10000); // 10 seconds

    return () => clearInterval(intervalId);
  }, [documentName, modelActions]);

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;

      switch (e.key.toLowerCase()) {
        case 'n':
          e.preventDefault();
          onNewDocument();
          break;
        case 'f':
          e.preventDefault();
          uiStateActions.setDialog('FREEPIK_SEARCH');
          break;
        case 'u':
          e.preventDefault();
          uiStateActions.setDialog('UPLOAD_ICON');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNewDocument, uiStateActions]);

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

  const onDuplicateView = useCallback((viewId: string) => {
    const viewToDuplicate = views.find(v => v.id === viewId);
    if (!viewToDuplicate) return;

    const defaultName = `${viewToDuplicate.name} 2`;
    const name = window.prompt('Enter name for duplicated view:', defaultName);

    if (!name) return;

    // Check if name already exists
    if (views.some(v => v.name === name)) {
      alert('A view with this name already exists. Please choose a different name.');
      return;
    }

    const newViewId = modelActions.duplicateView(viewId, name);
    if (newViewId) {
      uiStateActions.setView(newViewId);
      uiStateActions.setIsMainMenuOpen(false);
    }
  }, [views, modelActions, uiStateActions]);

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
          <MenuItem onClick={onNewDocument} Icon={<NewDocIcon />} shortcut="⌘N">
            New Document
          </MenuItem>

          <MenuItem onClick={onSaveAsDocument} Icon={<SaveIcon />}>
            Save As...
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
            <MenuItem onClick={onExportAsImage} Icon={<ExportImageIcon />} shortcut="⌘E">
              Export as image
            </MenuItem>
          )}

          {mainMenuOptions.includes('EXPORT.PNG') && publishAvailable && (
            <MenuItem onClick={onPublishAsImage} Icon={<PublishIcon />} shortcut="⌘P">
              Publish as image
            </MenuItem>
          )}

          <Divider />

          <MenuItem onClick={onUploadIcon} Icon={<UploadIcon />} shortcut="⌘U">
            Upload Icon
          </MenuItem>

          <MenuItem onClick={() => {
            uiStateActions.setDialog('FREEPIK_SEARCH');
            uiStateActions.setIsMainMenuOpen(false);
          }} Icon={<SearchIcon />} shortcut="⌘F">
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
              <MenuItem onClick={() => onDuplicateView(currentViewId)} Icon={<ContentCopyIcon />}>
                Duplicate Current View
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
