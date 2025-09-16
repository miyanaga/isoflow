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
  TextField
} from '@mui/material';
import { useModelStore } from 'src/stores/modelStore';
import {
  exportAsImage,
  downloadFile as downloadFileUtil,
  base64ToBlob,
  generateGenericFilename,
  modelFromModelStore
} from 'src/utils';
import { ModelStore } from 'src/types';
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

export const ExportImageDialog = ({ onClose, quality = 1.5 }: Props) => {
  const containerRef = useRef<HTMLDivElement>();
  const debounceRef = useRef<NodeJS.Timeout>();
  const currentView = useUiStateStore((state) => {
    return state.view;
  });
  const [imageData, setImageData] = React.useState<string>();
  const [exportError, setExportError] = useState(false);
  const [cropTransparent, setCropTransparent] = useState(true);
  const [cropMargin, setCropMargin] = useState(() => {
    const saved = localStorage.getItem('isoflow-export-crop-margin');
    return saved ? parseInt(saved, 10) : 8; // デフォルト8px
  });
  const [exportWidth, setExportWidth] = useState(() => {
    const saved = localStorage.getItem('isoflow-export-width');
    return saved ? parseInt(saved, 10) : 800; // デフォルト800px
  });
  const [calculatedQuality, setCalculatedQuality] = useState(quality);
  const { getUnprojectedBounds } = useDiagramUtils();
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const model = useModelStore((state): Omit<ModelStore, 'actions'> => {
    return modelFromModelStore(state);
  });

  const unprojectedBounds = useMemo(() => {
    return getUnprojectedBounds();
  }, [getUnprojectedBounds]);

  // crop時の実際の画像サイズを計算し、必要な解像度を算出
  const [croppedBounds, setCroppedBounds] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    if (cropTransparent && exportWidth > 0) {
      // 一時的にエクスポートして実際のcrop後のサイズを取得
      const calculateCroppedBounds = async () => {
        if (!containerRef.current) return;

        const tempQuality = 1; // 一時的に低品質で計算
        const tempElement = containerRef.current.cloneNode(true) as HTMLDivElement;

        // 実際のcrop領域を計算するための一時エクスポート
        try {
          const tempData = await exportAsImage(containerRef.current, undefined, true, 0);
          const img = new Image();
          img.onload = () => {
            const aspectRatio = img.height / img.width;
            const targetWidthWithoutMargin = exportWidth - (cropMargin * 2);
            const targetHeight = targetWidthWithoutMargin * aspectRatio;

            // 必要な解像度倍率を計算
            const requiredQuality = targetWidthWithoutMargin / (unprojectedBounds.width * tempQuality);

            setCroppedBounds({ width: img.width, height: img.height });
            setCalculatedQuality(Math.max(1, requiredQuality));
          };
          img.src = tempData;
        } catch (err) {
          console.error('Failed to calculate cropped bounds:', err);
          setCalculatedQuality(quality);
        }
      };

      calculateCroppedBounds();
    } else {
      setCalculatedQuality(quality);
      setCroppedBounds(null);
    }
  }, [cropTransparent, exportWidth, cropMargin, unprojectedBounds, containerRef, quality]);

  useEffect(() => {
    uiStateActions.setMode({
      type: 'INTERACTIONS_DISABLED',
      showCursor: false
    });
  }, [uiStateActions]);

  const exportImage = useCallback(async () => {
    if (!containerRef.current) return;

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const targetWidth = cropTransparent ? exportWidth : undefined;
      exportAsImage(containerRef.current as HTMLDivElement, undefined, cropTransparent, cropMargin, targetWidth)
        .then((data) => {
          return setImageData(data);
        })
        .catch((err) => {
          console.log(err);
          setExportError(true);
        });
    }, 2000);
  }, [cropTransparent, cropMargin, exportWidth]);

  const downloadFile = useCallback(() => {
    if (!imageData) return;

    const data = base64ToBlob(
      imageData.replace('data:image/png;base64,', ''),
      'image/png;charset=utf-8'
    );

    downloadFileUtil(data, generateGenericFilename('png'));
  }, [imageData]);

  const [showGrid, setShowGrid] = useState(false);
  const handleShowGridChange = (checked: boolean) => {
    setShowGrid(checked);
  };

  const [transparentBackground, setTransparentBackground] = useState(true);
  const handleTransparentChange = (checked: boolean) => {
    setTransparentBackground(checked);
  };

  const handleCropTransparentChange = (checked: boolean) => {
    setCropTransparent(checked);
  };

  const handleCropMarginChange = (value: number) => {
    const clampedValue = Math.max(0, Math.min(100, value)); // 0-100の範囲で制限
    setCropMargin(clampedValue);
    localStorage.setItem('isoflow-export-crop-margin', clampedValue.toString());
  };

  const handleExportWidthChange = (value: number) => {
    const clampedValue = Math.max(100, Math.min(4000, value)); // 100-4000の範囲で制限
    setExportWidth(clampedValue);
    localStorage.setItem('isoflow-export-width', clampedValue.toString());
  };

  const [backgroundColor, setBackgroundColor] = useState<string>(
    customVars.customPalette.diagramBg
  );
  const handleBackgroundColorChange = (color: string) => {
    setBackgroundColor(color);
  };

  useEffect(() => {
    setImageData(undefined);
  }, [showGrid, backgroundColor, transparentBackground, cropTransparent, cropMargin, exportWidth]);

  return (
    <Dialog open onClose={onClose}>
      <DialogTitle>Export as image</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Alert severity="info">
            <strong>
              Certain browsers may not support exporting images properly.
            </strong>{' '}
            <br />
            For best results, please use the latest version of either Chrome or
            Firefox.
          </Alert>

          {!imageData && (
            <>
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
                    width: unprojectedBounds.width * calculatedQuality,
                    height: unprojectedBounds.height * calculatedQuality
                  }}
                >
                  <Isoflow
                    editorMode="NON_INTERACTIVE"
                    onModelUpdated={exportImage}
                    initialData={{
                      ...model,
                      fitToView: true,
                      view: currentView
                    }}
                    renderer={{
                      showGrid,
                      backgroundColor: transparentBackground ? 'transparent' : backgroundColor
                    }}
                  />
                </Box>
              </Box>
              <Box
                sx={{
                  position: 'relative',
                  top: 0,
                  left: 0,
                  width: 500,
                  height: 300,
                  bgcolor: 'common.white'
                }}
              >
                <Loader size={2} />
              </Box>
            </>
          )}
          <Stack alignItems="center" spacing={2}>
            {imageData && (
              <Box
                sx={{
                  maxWidth: '100%',
                  position: 'relative',
                  backgroundImage: transparentBackground
                    ? `repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50% / 20px 20px`
                    : 'none',
                  backgroundSize: '20px 20px'
                }}
                style={{
                  width: unprojectedBounds.width
                }}
              >
                <Box
                  component="img"
                  sx={{
                    display: 'block',
                    maxWidth: '100%',
                    width: '100%'
                  }}
                  src={imageData}
                  alt="preview"
                />
              </Box>
            )}
            <Box sx={{ width: '100%' }}>
              <Box component="fieldset">
                <Typography variant="caption" component="legend">
                  Options
                </Typography>

                <FormControlLabel
                  label="Show grid"
                  control={
                    <Checkbox
                      size="small"
                      checked={showGrid}
                      onChange={(event) => {
                        handleShowGridChange(event.target.checked);
                      }}
                    />
                  }
                />
                <FormControlLabel
                  label="Transparent background"
                  control={
                    <Checkbox
                      size="small"
                      checked={transparentBackground}
                      onChange={(event) => {
                        handleTransparentChange(event.target.checked);
                      }}
                    />
                  }
                />
                <FormControlLabel
                  label="Crop transparent regions"
                  control={
                    <Checkbox
                      size="small"
                      checked={cropTransparent}
                      onChange={(event) => {
                        handleCropTransparentChange(event.target.checked);
                      }}
                    />
                  }
                />
                {cropTransparent && (
                  <>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 4 }}>
                      <Typography variant="caption">Width:</Typography>
                      <TextField
                        size="small"
                        type="text"
                        value={exportWidth}
                        onChange={(event) => {
                          const value = parseInt(event.target.value) || 100;
                          handleExportWidthChange(value);
                        }}
                        inputProps={{
                          style: { width: '80px' }
                        }}
                      />
                      <Typography variant="caption">px</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 4 }}>
                      <Typography variant="caption">Margin:</Typography>
                      <TextField
                        size="small"
                        type="text"
                        value={cropMargin}
                        onChange={(event) => {
                          const value = parseInt(event.target.value) || 0;
                          handleCropMarginChange(value);
                        }}
                        inputProps={{
                          style: { width: '60px' }
                        }}
                      />
                      <Typography variant="caption">px</Typography>
                    </Box>
                    {croppedBounds && (
                      <Box sx={{ ml: 4, mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Resolution: {Math.round(calculatedQuality * 100)}%
                        </Typography>
                      </Box>
                    )}
                  </>
                )}
                {!transparentBackground && (
                  <FormControlLabel
                    label="Background color"
                    control={
                      <ColorPicker
                        value={backgroundColor}
                        onChange={handleBackgroundColorChange}
                      />
                    }
                  />
                )}
              </Box>
            </Box>
            {imageData && (
              <Stack sx={{ width: '100%' }} alignItems="flex-end">
                <Stack direction="row" spacing={2}>
                  <Button variant="text" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button onClick={downloadFile}>Download as PNG</Button>
                </Stack>
              </Stack>
            )}
          </Stack>

          {exportError && (
            <Alert severity="error">Could not export image</Alert>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
};
