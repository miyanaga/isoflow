import React, {
  useRef,
  useEffect,
  useMemo,
  useCallback,
  useState
} from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Box,
  Button,
  Stack,
  Alert,
  Checkbox,
  FormControlLabel,
  Typography,
  TextField,
  CircularProgress,
  Snackbar
} from '@mui/material';
import { useModelStore } from 'src/stores/modelStore';
import {
  exportAsImage,
  base64ToBlob,
  generateGenericFilename,
  modelFromModelStore,
  api
} from 'src/utils';
import { ModelStore, View } from 'src/types';
import { useDiagramUtils } from 'src/hooks/useDiagramUtils';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { Isoflow } from 'src/Isoflow';
import { Loader } from 'src/components/Loader/Loader';
import { customVars } from 'src/styles/theme';
import { ColorPicker } from 'src/components/ColorSelector/ColorPicker';

interface Props {
  quality?: number;
  onClose: () => void;
}

// Helper function to sanitize filename
const sanitizeFilename = (name: string): string => {
  return name
    .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove non-alphanumeric except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .toLowerCase()
    .trim();
};

// Generate default path
const generateDefaultPath = (title: string, viewName: string): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const timestamp = now.toISOString().replace(/[-:T.]/g, '').slice(0, 14);

  const sanitizedTitle = sanitizeFilename(title || 'untitled');
  const sanitizedView = sanitizeFilename(viewName || 'view');

  return `${year}/${month}/${sanitizedTitle}-${sanitizedView}-${timestamp}.png`;
};

export const PublishDialog = ({ onClose, quality = 3.0 }: Props) => {
  const containerRef = useRef<HTMLDivElement>();
  const debounceRef = useRef<NodeJS.Timeout>();
  const currentView = useUiStateStore((state) => state.view);
  const views = useModelStore((state) => state.views);
  const title = useModelStore((state) => state.title);

  const currentViewData = views.find((v: View) => v.id === currentView);
  const viewName = currentViewData?.name || 'Overview';
  const documentTitle = `${title || 'Untitled'} | ${viewName}`;

  const [imageData, setImageData] = useState<string>();
  const [exportError, setExportError] = useState(false);
  const [publishError, setPublishError] = useState<string>('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string>('');

  const [cropTransparent, setCropTransparent] = useState(true);
  const [cropMargin, setCropMargin] = useState(() => {
    const saved = localStorage.getItem('isoflow-export-crop-margin');
    return saved ? parseInt(saved, 10) : 8;
  });
  const [publishPath, setPublishPath] = useState(() =>
    generateDefaultPath(title, viewName)
  );
  const { getUnprojectedBounds } = useDiagramUtils();
  const uiStateActions = useUiStateStore((state) => state.actions);

  const model = useModelStore((state): Omit<ModelStore, 'actions'> => {
    return modelFromModelStore(state);
  });

  const unprojectedBounds = useMemo(() => {
    return getUnprojectedBounds();
  }, [getUnprojectedBounds]);

  // Background settings
  const [transparentBackground, setTransparentBackground] = useState(true);
  const [backgroundColor, setBackgroundColor] = useState<string>('#ffffff');

  // Fetch URL when path changes
  useEffect(() => {
    if (publishPath) {
      api.publish.getUrl(publishPath)
        .then(result => setPublishedUrl(result.url))
        .catch(() => setPublishedUrl(''));
    }
  }, [publishPath]);

  // Snippets
  const snippets = useMemo(() => {
    const url = publishedUrl || `[URL will appear here after publish]`;
    return {
      url,
      html: `<img src="${url}" alt="${documentTitle}" />`,
      markdown: `![${documentTitle}](${url})`
    };
  }, [publishedUrl, documentTitle]);

  // Copy to clipboard with feedback
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const handleCopy = useCallback((field: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  }, []);


  // Set interaction mode
  useEffect(() => {
    uiStateActions.setMode({
      type: 'INTERACTIONS_DISABLED',
      showCursor: false
    });
  }, [uiStateActions]);

  const calculateExport = useCallback(async () => {
    if (!containerRef.current) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const data = await exportAsImage(
          containerRef.current!,
          undefined,
          cropTransparent,
          cropMargin
        );
        setImageData(data);
      } catch (e) {
        setExportError(true);
      }
    }, 2000);
  }, [cropTransparent, cropMargin]);

  // Re-export when settings change
  useEffect(() => {
    setImageData(undefined);
    calculateExport();
  }, [transparentBackground, backgroundColor, cropTransparent, cropMargin, calculateExport]);

  const handlePublish = useCallback(async () => {
    if (!imageData) return;

    setIsPublishing(true);
    setPublishError('');
    setPublishSuccess(false);

    try {
      // Convert base64 to blob
      const base64Data = imageData.split(',')[1];
      const blob = base64ToBlob(base64Data, 'image/png');

      // Publish to server
      const result = await api.publish.upload(publishPath, blob);

      setPublishedUrl(result.url);
      setPublishSuccess(true);
    } catch (error: any) {
      setPublishError(error.message || 'Failed to publish image');
    } finally {
      setIsPublishing(false);
    }
  }, [imageData, publishPath]);

  const handleMarginChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (isNaN(value) || value < 0) return;

    setCropMargin(value);
    localStorage.setItem('isoflow-export-crop-margin', String(value));
  }, []);


  const handleTextFieldClick = useCallback((field: string, text: string, event: React.MouseEvent<HTMLInputElement>) => {
    const target = event.target as HTMLInputElement;
    target.select();
    handleCopy(field, text);
  }, [handleCopy]);

  return (
    <Dialog open onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Publish as Image</DialogTitle>
      <DialogContent sx={{ pb: 2 }}>
        <Stack spacing={2}>
          {exportError && (
            <Alert severity="error">
              Failed to generate export. Please try again.
            </Alert>
          )}

          {publishError && (
            <Alert severity="error">
              {publishError}
            </Alert>
          )}

          {publishSuccess && (
            <Alert severity="success">
              Image published successfully!
            </Alert>
          )}

          <Stack direction="row" spacing={4}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Preview
              </Typography>
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  minHeight: imageData ? 'auto' : 300,  // 4:3 ratio minimum height
                  aspectRatio: imageData ? 'auto' : '4/3',
                  border: '2px dashed',
                  borderColor: 'divider',
                  borderRadius: 1,
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: transparentBackground
                    ? 'repeating-conic-gradient(#e0e0e0 0% 25%, #f5f5f5 0% 50%) 50% / 20px 20px'
                    : backgroundColor,
                  backgroundImage: transparentBackground
                    ? 'repeating-conic-gradient(#e0e0e0 0% 25%, #f5f5f5 0% 50%) 50% / 20px 20px'
                    : 'none'
                }}
              >
                {!imageData && (
                  <Box
                    sx={{
                      position: 'absolute',
                      width: 0,
                      height: 0,
                      overflow: 'hidden'
                    }}
                  >
                    <Box
                      ref={containerRef}
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0
                      }}
                      style={{
                        width: unprojectedBounds.width * quality,
                        height: unprojectedBounds.height * quality
                      }}
                    >
                      <Isoflow
                        editorMode="NON_INTERACTIVE"
                        onModelUpdated={calculateExport}
                        initialData={{
                          ...model,
                          fitToView: true,
                          view: currentView
                        }}
                        renderer={{
                          showGrid: false,
                          backgroundColor: transparentBackground ? 'transparent' : backgroundColor,
                          forceZoom: 2.0
                        }}
                      />
                    </Box>
                  </Box>
                )}

                {imageData ? (
                  <Box
                    sx={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <img
                      src={imageData}
                      alt="Export preview"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        width: 'auto',
                        height: 'auto',
                        display: 'block'
                      }}
                    />
                  </Box>
                ) : (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '100%',
                      height: '100%'
                    }}
                  >
                    <Loader />
                  </Box>
                )}
              </Box>
            </Box>

            <Box sx={{ flex: 1 }}>
              <Stack spacing={2}>
                <Typography variant="subtitle2">Export Settings</Typography>

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={transparentBackground}
                      onChange={(e) => setTransparentBackground(e.target.checked)}
                    />
                  }
                  label="Transparent background"
                />

                {!transparentBackground && (
                  <Box>
                    <Typography variant="body2" gutterBottom>
                      Background Color
                    </Typography>
                    <ColorPicker
                      value={backgroundColor}
                      onChange={setBackgroundColor}
                    />
                  </Box>
                )}

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={cropTransparent}
                      onChange={(e) => setCropTransparent(e.target.checked)}
                    />
                  }
                  label="Crop transparent areas"
                />

                {cropTransparent && (
                  <TextField
                    label="Margin (px)"
                    type="number"
                    value={cropMargin}
                    onChange={handleMarginChange}
                    size="small"
                    fullWidth
                  />
                )}

                <Typography variant="subtitle2" sx={{ mt: 2 }}>
                  Publish Settings
                </Typography>

                <TextField
                  label="Path"
                  value={publishPath}
                  onChange={(e) => setPublishPath(e.target.value)}
                  size="small"
                  fullWidth
                  helperText="File path on the server"
                />

                <Typography variant="subtitle2" sx={{ mt: 2 }}>
                  Share Snippets
                </Typography>

                <Stack spacing={1}>
                  <TextField
                    label="URL"
                    value={snippets.url}
                    size="small"
                    fullWidth
                    onClick={(e) => handleTextFieldClick('url', snippets.url, e as React.MouseEvent<HTMLInputElement>)}
                    InputProps={{
                      readOnly: true,
                      sx: { fontSize: '0.875rem' },
                      endAdornment: copiedField === 'url' && (
                        <Typography variant="caption" color="success.main">Copied!</Typography>
                      )
                    }}
                  />

                  <TextField
                    label="HTML"
                    value={snippets.html}
                    size="small"
                    fullWidth
                    onClick={(e) => handleTextFieldClick('html', snippets.html, e as React.MouseEvent<HTMLInputElement>)}
                    InputProps={{
                      readOnly: true,
                      sx: { fontSize: '0.875rem' },
                      endAdornment: copiedField === 'html' && (
                        <Typography variant="caption" color="success.main">Copied!</Typography>
                      )
                    }}
                  />

                  <TextField
                    label="Markdown"
                    value={snippets.markdown}
                    size="small"
                    fullWidth
                    onClick={(e) => handleTextFieldClick('markdown', snippets.markdown, e as React.MouseEvent<HTMLInputElement>)}
                    InputProps={{
                      readOnly: true,
                      sx: { fontSize: '0.875rem' },
                      endAdornment: copiedField === 'markdown' && (
                        <Typography variant="caption" color="success.main">Copied!</Typography>
                      )
                    }}
                  />
                </Stack>
              </Stack>
            </Box>
          </Stack>

          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button variant="text" onClick={onClose}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handlePublish}
              disabled={!imageData || isPublishing}
              startIcon={isPublishing && <CircularProgress size={16} />}
            >
              {isPublishing ? 'Publishing...' : 'Publish as PNG'}
            </Button>
          </Stack>
        </Stack>
      </DialogContent>

      <Snackbar
        open={publishSuccess}
        autoHideDuration={6000}
        onClose={() => setPublishSuccess(false)}
        message="Image published successfully!"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Dialog>
  );
};