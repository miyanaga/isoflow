import React, { useState, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  TextField,
  Box,
  Button,
  Stack,
  DialogActions,
  Typography,
  DialogContentText
} from '@mui/material';
import {
  Delete as DeleteIcon,
  DragIndicator as DragIndicatorIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import {
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useModelStore } from 'src/stores/modelStore';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { View } from 'src/types';

interface SortableViewItemProps {
  view: View;
  isCurrentView: boolean;
  onEdit: (viewId: string) => void;
  onDelete: (viewId: string) => void;
  editingId: string | null;
  editingName: string;
  onEditChange: (value: string) => void;
  onEditSave: (viewId: string) => void;
  onEditCancel: () => void;
}

const SortableViewItem = ({
  view,
  isCurrentView,
  onEdit,
  onDelete,
  editingId,
  editingName,
  onEditChange,
  onEditSave,
  onEditCancel
}: SortableViewItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: view.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <ListItem
      ref={setNodeRef}
      style={style}
      sx={{
        bgcolor: isCurrentView ? 'action.selected' : 'background.paper',
        borderRadius: 1,
        mb: 1
      }}
    >
      <Box
        {...attributes}
        {...listeners}
        sx={{
          cursor: 'move',
          mr: 2,
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <DragIndicatorIcon />
      </Box>
      {editingId === view.id ? (
        <>
          <TextField
            value={editingName}
            onChange={(e) => onEditChange(e.target.value)}
            size="small"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onEditSave(view.id);
              } else if (e.key === 'Escape') {
                onEditCancel();
              }
            }}
            sx={{ flexGrow: 1 }}
          />
          <IconButton onClick={() => onEditSave(view.id)} size="small">
            <CheckIcon />
          </IconButton>
          <IconButton onClick={onEditCancel} size="small">
            <CloseIcon />
          </IconButton>
        </>
      ) : (
        <>
          <ListItemText
            primary={view.name}
            secondary={isCurrentView ? 'Current view' : undefined}
          />
          <ListItemSecondaryAction>
            <IconButton onClick={() => onEdit(view.id)} size="small">
              <EditIcon />
            </IconButton>
            {!isCurrentView && (
              <IconButton
                onClick={() => onDelete(view.id)}
                size="small"
              >
                <DeleteIcon />
              </IconButton>
            )}
          </ListItemSecondaryAction>
        </>
      )}
    </ListItem>
  );
};

interface DeleteConfirmDialogProps {
  open: boolean;
  viewName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteConfirmDialog = ({
  open,
  viewName,
  onConfirm,
  onCancel
}: DeleteConfirmDialogProps) => {
  return (
    <Dialog open={open} onClose={onCancel}>
      <DialogTitle>Delete View</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Are you sure you want to delete "{viewName}"? This action cannot be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button onClick={onConfirm} color="error">
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
};

interface Props {
  onClose: () => void;
}

export const EditViewsDialog = ({ onClose }: Props) => {
  const views = useModelStore((state) => state.views);
  const modelActions = useModelStore((state) => state.actions);
  const currentViewId = useUiStateStore((state) => state.view);
  const uiStateActions = useUiStateStore((state) => state.actions);

  const [localViews, setLocalViews] = useState(views);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    viewId: string;
    viewName: string;
  }>({ open: false, viewId: '', viewName: '' });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setLocalViews((items) => {
        const oldIndex = items.findIndex((v) => v.id === active.id);
        const newIndex = items.findIndex((v) => v.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  const handleEdit = useCallback((viewId: string) => {
    const view = localViews.find((v) => v.id === viewId);
    if (view) {
      setEditingId(viewId);
      setEditingName(view.name);
    }
  }, [localViews]);

  const handleEditSave = useCallback((viewId: string) => {
    if (editingName.trim()) {
      setLocalViews((views) =>
        views.map((v) =>
          v.id === viewId ? { ...v, name: editingName.trim() } : v
        )
      );
      setEditingId(null);
      setEditingName('');
    }
  }, [editingName]);

  const handleEditCancel = useCallback(() => {
    setEditingId(null);
    setEditingName('');
  }, []);

  const handleDelete = useCallback((viewId: string) => {
    const view = localViews.find((v) => v.id === viewId);
    if (view && localViews.length > 1) {
      setDeleteConfirm({
        open: true,
        viewId,
        viewName: view.name
      });
    }
  }, [localViews]);

  const handleDeleteConfirm = useCallback(() => {
    const { viewId } = deleteConfirm;
    setLocalViews((views) => views.filter((v) => v.id !== viewId));

    // If deleting current view, switch to first available view
    if (viewId === currentViewId && localViews.length > 1) {
      const remainingViews = localViews.filter((v) => v.id !== viewId);
      if (remainingViews.length > 0) {
        uiStateActions.setView(remainingViews[0].id);
      }
    }

    setDeleteConfirm({ open: false, viewId: '', viewName: '' });
  }, [deleteConfirm, currentViewId, localViews, uiStateActions]);

  const handleSave = useCallback(() => {
    // Update all views at once
    modelActions.reorderViews(localViews);

    // Update individual view names
    localViews.forEach((view) => {
      const originalView = views.find((v) => v.id === view.id);
      if (originalView && originalView.name !== view.name) {
        modelActions.updateView(view.id, { name: view.name });
      }
    });

    // Delete views that were removed
    views.forEach((view) => {
      if (!localViews.find((v) => v.id === view.id)) {
        modelActions.deleteView(view.id);
      }
    });

    onClose();
  }, [localViews, views, modelActions, onClose]);

  const hasChanges = useMemo(() => {
    if (views.length !== localViews.length) return true;
    return views.some((view, index) => {
      const localView = localViews[index];
      return !localView || view.id !== localView.id || view.name !== localView.name;
    });
  }, [views, localViews]);

  return (
    <>
      <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Views</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Drag to reorder, click to edit names
          </Typography>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={localViews.map((v) => v.id)}
              strategy={verticalListSortingStrategy}
            >
              <List sx={{ p: 0 }}>
                {localViews.map((view) => (
                  <SortableViewItem
                    key={view.id}
                    view={view}
                    isCurrentView={view.id === currentViewId}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    editingId={editingId}
                    editingName={editingName}
                    onEditChange={setEditingName}
                    onEditSave={handleEditSave}
                    onEditCancel={handleEditCancel}
                  />
                ))}
              </List>
            </SortableContext>
          </DndContext>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!hasChanges}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
      <DeleteConfirmDialog
        open={deleteConfirm.open}
        viewName={deleteConfirm.viewName}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirm({ open: false, viewId: '', viewName: '' })}
      />
    </>
  );
};