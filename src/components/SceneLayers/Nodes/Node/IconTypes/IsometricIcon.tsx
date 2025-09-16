import React, { useRef, useEffect } from 'react';
import { Box } from '@mui/material';
import { PROJECTED_TILE_SIZE } from 'src/config';
import { useResizeObserver } from 'src/hooks/useResizeObserver';

interface Props {
  url: string;
  size?: number;
  flipHorizontal?: boolean;
  onImageLoaded?: () => void;
}

export const IsometricIcon = ({ url, size = 1, flipHorizontal = false, onImageLoaded }: Props) => {
  const ref = useRef();
  const { size: elementSize, observe, disconnect } = useResizeObserver();

  useEffect(() => {
    if (!ref.current) return;

    observe(ref.current);

    return disconnect;
  }, [observe, disconnect]);

  const baseWidth = PROJECTED_TILE_SIZE.width * 0.8;
  const scaledWidth = baseWidth * size;
  const scaledHeight = elementSize.height * size / (elementSize.width / baseWidth);

  // アイソメトリックグリッドの中心から下の点までの距離
  const gridCenterToBottom = PROJECTED_TILE_SIZE.height / 2;
  // 倍率に応じてY軸方向にオフセット（2倍のときは1倍、3倍のときは2倍）
  const yOffset = gridCenterToBottom * (size - 1);

  return (
    <Box
      ref={ref}
      component="img"
      onLoad={onImageLoaded}
      src={url}
      sx={{
        position: 'absolute',
        width: scaledWidth,
        top: -scaledHeight + yOffset,
        left: -scaledWidth / 2,
        pointerEvents: 'none',
        transformOrigin: 'center bottom',
        transform: flipHorizontal ? 'scaleX(-1)' : 'none'
      }}
    />
  );
};
