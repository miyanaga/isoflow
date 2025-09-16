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

  // 底面中央を基準にした位置調整
  const offsetX = -scaledWidth / 2;
  const offsetY = -PROJECTED_TILE_SIZE.height / 2 - (size - 1) * PROJECTED_TILE_SIZE.height / 2;

  return (
    <Box sx={{ pointerEvents: 'none' }}>
      <Box
        sx={{
          position: 'absolute',
          left: offsetX,
          top: offsetY,
          transformOrigin: 'bottom center',
          transform: `${getIsoProjectionCss()}${flipHorizontal ? ' scaleX(-1)' : ''}`
        }}
      >
        <Box
          component="img"
          src={icon.url}
          alt={`icon-${icon.id}`}
          sx={{ width: scaledWidth }}
        />
      </Box>
    </Box>
  );
};
