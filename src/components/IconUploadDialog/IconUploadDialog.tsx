import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Alert,
  CircularProgress,
  Paper,
} from '@mui/material';
import { CloudUpload as UploadIcon, Settings as SettingsIcon } from '@mui/icons-material';
import { api, getIsoProjectionCss } from 'src/utils';
import { PROJECTED_TILE_SIZE } from 'src/config';
import { useModelStore } from 'src/stores/modelStore';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useScene } from 'src/hooks/useScene';
import { useIconSync } from 'src/hooks/useIconSync';
import { Icon } from 'src/types';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  open: boolean;
  onClose: () => void;
}

type IconType = 'isometric' | 'flat';

export const IconUploadDialog = ({ open, onClose }: Props) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [iconName, setIconName] = useState('');
  const [iconType, setIconType] = useState<IconType>('flat');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const modelActions = useModelStore((state) => state.actions);
  const uiStateActions = useUiStateStore((state) => state.actions);
  const scene = useScene();
  const { triggerSync } = useIconSync();

  useEffect(() => {
    if (!open) {
      // Reset form when dialog closes
      setSelectedFile(null);
      setSvgContent('');
      setIconName('');
      setIconType('flat');
      setError('');
    }
  }, [open]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('svg')) {
      setError('Please select an SVG file');
      return;
    }

    setError('');
    setSelectedFile(file);

    // Extract name from filename (without extension)
    const nameWithoutExt = file.name.replace(/\.svg$/i, '');
    setIconName(nameWithoutExt);

    // Read file content
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setSvgContent(content);
    };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (!svgContent || !iconName.trim()) {
      setError('Please provide an icon name');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      // Check if icon already exists
      const { exists } = await api.icons.exists(iconName);
      if (exists) {
        const confirm = window.confirm(
          `An icon named "${iconName}" already exists. Do you want to replace it?`
        );
        if (!confirm) {
          setIsUploading(false);
          return;
        }
      }

      // Add metadata to SVG
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
      const svgElement = svgDoc.querySelector('svg');

      if (svgElement) {
        // Add custom attribute to indicate if it's already isometric
        svgElement.setAttribute('data-isometric', iconType === 'isometric' ? 'true' : 'false');
      }

      const serializer = new XMLSerializer();
      const modifiedSvg = serializer.serializeToString(svgDoc);

      // Upload icon
      await api.icons.save(iconName, modifiedSvg);

      // Sync icons with server
      await triggerSync();

      // Wait 500ms then place the icon as a node
      setTimeout(async () => {
        try {
          // Get the updated icons from model store
          const currentState = modelActions.get();
          const customIcon = currentState.icons.find(
            (i: Icon) => i.collection === 'CUSTOM' && i.id === `custom_${iconName}`
          );

          if (customIcon) {
            // Get center position
            const centerTile = { x: 0, y: 0 };
            const modelItemId = uuidv4();

            // Create model item
            scene.createModelItem({
              id: modelItemId,
              name: iconName,
              icon: customIcon.id
            });

            // Create view item
            scene.createViewItem({
              id: modelItemId,
              tile: centerTile,
              size: 1
            });

            console.log('Icon uploaded and placed on canvas');
          }
        } catch (error) {
          console.error('Error placing icon after upload:', error);
        }
      }, 500);

      // Success - close dialog
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to upload icon');
    } finally {
      setIsUploading(false);
    }
  };

  const renderPreview = () => {
    if (!svgContent) return null;

    const isIsometric = iconType === 'isometric';
    const tileWidth = PROJECTED_TILE_SIZE.width;
    const tileHeight = PROJECTED_TILE_SIZE.height;

    return (
      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        <Paper
          elevation={2}
          sx={{
            flex: 1,
            position: 'relative',
            height: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f5f5f5',
            overflow: 'hidden'
          }}
        >
          {/* Isometric Grid background - matching isoflow canvas exactly */}
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none'
            }}
            viewBox="0 0 600 300"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern
                id="isoGrid"
                width={tileWidth}
                height={tileHeight * 2}
                patternUnits="userSpaceOnUse"
              >
                {/* Main diamond shape matching grid-tile-bg.svg */}
                <polygon
                  points={`${tileWidth/2} ${tileHeight*0.5} ${tileWidth} ${tileHeight} ${tileWidth/2} ${tileHeight*1.5} 0 ${tileHeight}`}
                  fill="none"
                  stroke="#000000"
                  strokeOpacity="0.15"
                  strokeWidth="1"
                />
                {/* Diagonal lines from corners */}
                <line x1={tileWidth/2} y1={tileHeight*0.5} x2={tileWidth} y2={0}
                  stroke="#000000" strokeOpacity="0.15" strokeWidth="1" />
                <line x1={0} y1={0} x2={tileWidth/2} y2={tileHeight*0.5}
                  stroke="#000000" strokeOpacity="0.15" strokeWidth="1" />
                <line x1={tileWidth/2} y1={tileHeight*1.5} x2={0} y2={tileHeight*2}
                  stroke="#000000" strokeOpacity="0.15" strokeWidth="1" />
                <line x1={tileWidth} y1={tileHeight*2} x2={tileWidth/2} y2={tileHeight*1.5}
                  stroke="#000000" strokeOpacity="0.15" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#isoGrid)" />
          </svg>

          {/* Icon preview container */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: tileWidth,
              height: tileWidth, // Use width for initial square container
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {/* Icon with transformation */}
            <div
              style={{
                transform: isIsometric ? 'none' : `${getIsoProjectionCss()} scaleX(-1)`,
                transformOrigin: 'center center',
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              dangerouslySetInnerHTML={{
                __html: svgContent.replace(
                  /<svg/,
                  '<svg style="width: 100%; height: 100%; max-width: 100px; max-height: 100px;"'
                )
              }}
            />
          </div>

          <Typography
            variant="caption"
            sx={{
              position: 'absolute',
              bottom: 8,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(255,255,255,0.9)',
              px: 1,
              borderRadius: 1
            }}
          >
            {isIsometric ? 'Isometric (as-is)' : 'Flat (transformed)'}
          </Typography>
        </Paper>
      </Box>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Upload Custom Icon</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {/* File input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".svg,image/svg+xml"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />

          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => fileInputRef.current?.click()}
            fullWidth
            sx={{ mb: 2 }}
          >
            {selectedFile ? selectedFile.name : 'Choose SVG File'}
          </Button>

          {/* Icon name input */}
          {selectedFile && (
            <>
              <TextField
                label="Icon Name"
                value={iconName}
                onChange={(e) => setIconName(e.target.value)}
                fullWidth
                sx={{ mb: 2 }}
                helperText="This will be the name of your icon"
              />

              {/* Icon type selection */}
              <FormControl component="fieldset" sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Icon Type:
                </Typography>
                <RadioGroup
                  row
                  value={iconType}
                  onChange={(e) => setIconType(e.target.value as IconType)}
                >
                  <FormControlLabel
                    value="flat"
                    control={<Radio />}
                    label="Flat Icon (will be transformed)"
                  />
                  <FormControlLabel
                    value="isometric"
                    control={<Radio />}
                    label="Already Isometric"
                  />
                </RadioGroup>
              </FormControl>

              {/* Preview */}
              {renderPreview()}
            </>
          )}

          {/* Error message */}
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between' }}>
        <Button
          onClick={() => {
            uiStateActions.setDialog('ICON_MANAGEMENT');
          }}
          startIcon={<SettingsIcon />}
          disabled={isUploading}
        >
          Manage Icons
        </Button>
        <Box>
        <Button onClick={onClose} disabled={isUploading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleUpload}
          disabled={!selectedFile || !iconName.trim() || isUploading}
          startIcon={isUploading && <CircularProgress size={16} />}
        >
          {isUploading ? 'Uploading...' : 'Add Icon'}
        </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};