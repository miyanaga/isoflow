import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  TextField,
  Box,
  Typography,
  CircularProgress,
  Alert,
  InputAdornment
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { documentApi, DocumentInfo } from 'src/services/documentApi';
import { useModelStore } from 'src/stores/modelStore';
import { useInitialDataManager } from 'src/hooks/useInitialDataManager';

interface DocumentListDialogProps {
  open: boolean;
  onClose: () => void;
}

export const DocumentListDialog: React.FC<DocumentListDialogProps> = ({
  open,
  onClose
}) => {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);

  const modelActions = useModelStore((state) => state.actions);
  const { load } = useInitialDataManager();

  const fetchDocuments = useCallback(async (query?: string) => {
    setLoading(true);
    setError(null);
    try {
      const docs = await documentApi.index(query);
      setDocuments(docs);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchDocuments(searchQuery);
    }
  }, [open, searchQuery, fetchDocuments]);

  const handleSearch = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  }, []);

  const handleOpen = useCallback(async (name: string) => {
    setLoading(true);
    setError(null);
    try {
      const model = await documentApi.load(name);
      load(model);
      modelActions.setDocumentName(name);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to open document');
    } finally {
      setLoading(false);
    }
  }, [load, modelActions, onClose]);

  const handleDelete = useCallback(async (name: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await documentApi.delete(name);
      await fetchDocuments(searchQuery);
    } catch (err: any) {
      setError(err.message || 'Failed to delete document');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, fetchDocuments]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return Math.round(bytes / (1024 * 1024)) + ' MB';
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '400px' }
      }}
    >
      <DialogTitle>Open Document</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            placeholder="Search documents..."
            value={searchQuery}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              )
            }}
            size="small"
          />
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && documents.length === 0 && (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
            No documents found
          </Typography>
        )}

        {!loading && documents.length > 0 && (
          <List>
            {documents.map((doc) => (
              <ListItem
                key={doc.name}
                button
                onClick={() => handleOpen(doc.name)}
                selected={selectedDoc === doc.name}
                onMouseEnter={() => setSelectedDoc(doc.name)}
                onMouseLeave={() => setSelectedDoc(null)}
                sx={{
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  }
                }}
              >
                <ListItemText
                  primary={doc.name}
                  secondary={
                    <React.Fragment>
                      {formatDate(doc.updatedAt)} • {formatSize(doc.size)}
                    </React.Fragment>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    aria-label="delete"
                    onClick={(e) => handleDelete(doc.name, e)}
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
};