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

  // After isometric transformation, we need to adjust position to center the icon
  // The icon should appear at the center of the grid diamond
  // Move up by half grid height to center on the grid
  const offsetX = -scaledWidth / 2;
  const offsetY = -scaledWidth / 2 - PROJECTED_TILE_SIZE.height / 2;

  return (
    <Box sx={{ pointerEvents: 'none' }}>
      <Box
        sx={{
          position: 'absolute',
          left: offsetX,
          top: offsetY,
          width: scaledWidth,
          height: scaledWidth,
          transformOrigin: 'center',
          transform: `${getIsoProjectionCss()}${flipHorizontal ? ' scaleX(-1)' : ''}`
        }}
      >
        <Box
          component="img"
          src={icon.url}
          alt={`icon-${icon.id}`}
          sx={{
            width: '100%',
            height: 'auto'
          }}
        />
      </Box>
    </Box>
  );
};
