import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  TextField,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Stack
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { apiRequest } from 'src/utils/api';
import { useModelStore } from 'src/stores/modelStore';
import { useIconSync } from 'src/hooks/useIconSync';
import { api } from 'src/utils';

interface Props {
  onClose: () => void;
}

interface IconInfo {
  name: string;
  updatedAt: Date;
  size: number;
}

export const IconManagementDialog = ({ onClose }: Props) => {
  const [iconList, setIconList] = useState<IconInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [editingIcon, setEditingIcon] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [processingIcons, setProcessingIcons] = useState<Set<string>>(new Set());
  const [customIcons, setCustomIcons] = useState<Record<string, string>>({});
  const { triggerSync } = useIconSync();

  const loadIcons = useCallback(async () => {
    try {
      setLoading(true);
      // Load icon list from server
      const data = await apiRequest<IconInfo[]>('/icons/index');
      setIconList(data);

      // Also load the full SVG data for display
      if (data.length > 0) {
        const response = await api.icons.sync(null);
        const svgMap: Record<string, string> = {};
        if (response.data) {
          response.data.forEach((icon: any) => {
            svgMap[icon.name] = icon.svg;
          });
        }
        setCustomIcons(svgMap);
      }

      setError('');
    } catch (err: any) {
      setError('Failed to load icons');
      console.error('Error loading icons:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIcons();
  }, [loadIcons]);

  const handleDelete = async (iconName: string) => {
    if (!confirm(`Are you sure you want to delete the icon "${iconName}"?`)) {
      return;
    }

    setProcessingIcons(prev => new Set(prev).add(iconName));

    try {
      await apiRequest(`/icons/delete`, {
        method: 'DELETE',
        params: { name: iconName }
      });

      // Remove from local state
      setIconList(prev => prev.filter(icon => icon.name !== iconName));
      setCustomIcons(prev => {
        const newIcons = { ...prev };
        delete newIcons[iconName];
        return newIcons;
      });

      // Trigger icon sync to update the store
      await triggerSync();

    } catch (err: any) {
      setError(`Failed to delete icon: ${err.message}`);
      console.error('Error deleting icon:', err);
    } finally {
      setProcessingIcons(prev => {
        const newSet = new Set(prev);
        newSet.delete(iconName);
        return newSet;
      });
    }
  };

  const handleStartEdit = (iconName: string) => {
    setEditingIcon(iconName);
    setEditingName(iconName);
  };

  const handleCancelEdit = () => {
    setEditingIcon(null);
    setEditingName('');
  };

  const handleSaveEdit = async () => {
    if (!editingIcon || !editingName || editingName === editingIcon) {
      handleCancelEdit();
      return;
    }

    setProcessingIcons(prev => new Set(prev).add(editingIcon));

    try {
      await apiRequest('/icons/rename', {
        method: 'PUT',
        body: JSON.stringify({
          oldName: editingIcon,
          newName: editingName
        })
      });

      // Update local state
      setIconList(prev => prev.map(icon =>
        icon.name === editingIcon
          ? { ...icon, name: editingName }
          : icon
      ));

      // Update SVG map
      setCustomIcons(prev => {
        if (editingIcon && prev[editingIcon]) {
          const newIcons = { ...prev };
          newIcons[editingName] = prev[editingIcon];
          if (editingName !== editingIcon) {
            delete newIcons[editingIcon];
          }
          return newIcons;
        }
        return prev;
      });

      // Trigger icon sync to update the store
      await triggerSync();

      handleCancelEdit();
    } catch (err: any) {
      setError(`Failed to rename icon: ${err.message}`);
      console.error('Error renaming icon:', err);
    } finally {
      setProcessingIcons(prev => {
        const newSet = new Set(prev);
        newSet.delete(editingIcon);
        return newSet;
      });
    }
  };

  const getIconSvg = (iconName: string): string | undefined => {
    return customIcons[iconName];
  };

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Manage Custom Icons</Typography>
          <Button onClick={onClose} variant="text">
            Close
          </Button>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : iconList.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">
                No custom icons found
              </Typography>
            </Box>
          ) : (
            <List>
              {iconList.map((icon) => {
                const isProcessing = processingIcons.has(icon.name);
                const isEditing = editingIcon === icon.name;
                const iconSvg = getIconSvg(icon.name);

                return (
                  <ListItem
                    key={icon.name}
                    sx={{
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      opacity: isProcessing ? 0.5 : 1,
                      pointerEvents: isProcessing ? 'none' : 'auto'
                    }}
                  >
                    <Box sx={{ mr: 2, width: 40, height: 40 }}>
                      {iconSvg ? (
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          dangerouslySetInnerHTML={{ __html: iconSvg }}
                        />
                      ) : (
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            bgcolor: 'grey.200',
                            borderRadius: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            ?
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    {isEditing ? (
                      <TextField
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveEdit();
                          } else if (e.key === 'Escape') {
                            handleCancelEdit();
                          }
                        }}
                        autoFocus
                        size="small"
                        sx={{ flex: 1, mr: 2 }}
                      />
                    ) : (
                      <ListItemText
                        primary={icon.name}
                        secondary={`${(icon.size / 1024).toFixed(1)} KB`}
                        sx={{ cursor: 'pointer' }}
                        onClick={() => handleStartEdit(icon.name)}
                      />
                    )}

                    <ListItemSecondaryAction>
                      {isEditing ? (
                        <>
                          <IconButton
                            edge="end"
                            onClick={handleSaveEdit}
                            disabled={!editingName || editingName === editingIcon}
                            color="primary"
                            sx={{ mr: 1 }}
                          >
                            <CheckIcon />
                          </IconButton>
                          <IconButton
                            edge="end"
                            onClick={handleCancelEdit}
                          >
                            <CloseIcon />
                          </IconButton>
                        </>
                      ) : (
                        <>
                          <IconButton
                            edge="end"
                            onClick={() => handleStartEdit(icon.name)}
                            disabled={isProcessing}
                            sx={{ mr: 1 }}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            edge="end"
                            onClick={() => handleDelete(icon.name)}
                            disabled={isProcessing}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </>
                      )}
                    </ListItemSecondaryAction>
                  </ListItem>
                );
              })}
            </List>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};