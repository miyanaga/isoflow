import React from 'react';
import { Box } from '@mui/material';
import { Icon } from 'src/types';
import { PROJECTED_TILE_SIZE } from 'src/config';
import { getIsoProjectionCss } from 'src/utils';

interface Props {
  icon: Icon;
  size?: number;
  flipHorizontal?: boolean;
}

export const NonIsometricIcon = ({ icon, size = 1, flipHorizontal = false }: Props) => {
  const baseWidth = PROJECTED_TILE_SIZE.width * 0.7;
  const scaledWidth = baseWidth * size;

  // アイソメトリックグリッドの中心から下の点までの距離
  const gridCenterToBottom = PROJECTED_TILE_SIZE.height / 2;
  // 倍率に応じてY軸方向にオフセット（2倍のときは1倍、3倍のときは2倍）
  const yOffset = gridCenterToBottom * (size - 1);

  // アイソメトリック投影を考慮した位置調整
  const offsetX = -scaledWidth / 2;
  const offsetY = -PROJECTED_TILE_SIZE.height / 2 + yOffset;

  return (
    <Box sx={{ pointerEvents: 'none' }}>
      <Box
        sx={{
          position: 'absolute',
          left: offsetX,
          top: offsetY,
          transformOrigin: 'center bottom',
          transform: `${getIsoProjectionCss()}${flipHorizontal ? ' scaleX(-1)' : ''}`
        }}
      >
        <Box
          component="img"
          src={icon.url}
          alt={`icon-${icon.id}`}
          sx={{
            width: scaledWidth,
            transformOrigin: 'center bottom'
          }}
        />
      </Box>
    </Box>
  );
};
