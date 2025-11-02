import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { useScene } from 'src/hooks/useScene';
import { connectorPathTileToGlobal, getTilePosition } from 'src/utils';
import { PROJECTED_TILE_SIZE } from 'src/config';
import { Label } from 'src/components/Label/Label';

interface Props {
  connector: ReturnType<typeof useScene>['connectors'][0];
}

export const ConnectorLabel = ({ connector }: Props) => {
  const textSize = connector.textSize ?? 1;
  const textFrame = connector.textFrame ?? true;
  const textOffset = connector.textOffset ?? 0.5;

  const labelPosition = useMemo(() => {
    const pathLength = connector.path.tiles.length;
    const tileIndex = Math.floor((pathLength - 1) * textOffset);

    const tile = connector.path.tiles[tileIndex];

    return getTilePosition({
      tile: connectorPathTileToGlobal(tile, connector.path.rectangle.from)
    });
  }, [connector.path, textOffset]);

  // Calculate font size based on textSize (1-10)
  const getFontSize = (size: number) => {
    if (size <= 1) return 'body2';
    if (size <= 2) return 'body1';
    if (size <= 3) return 'h6';
    if (size <= 4) return 'h5';
    if (size <= 6) return 'h4';
    if (size <= 8) return 'h3';
    return 'h2';
  };

  const fontSize = getFontSize(textSize);

  return (
    <Box
      sx={{ position: 'absolute', pointerEvents: 'none' }}
      style={{
        maxWidth: PROJECTED_TILE_SIZE.width,
        left: labelPosition.x,
        top: labelPosition.y
      }}
    >
      <Label
        maxWidth={150}
        labelHeight={0}
        sx={{
          py: textFrame ? 0.75 : 0,
          px: textFrame ? 1 : 0,
          borderRadius: textFrame ? 2 : 0,
          backgroundColor: textFrame ? undefined : 'transparent',
          boxShadow: textFrame ? undefined : 'none',
          border: textFrame ? undefined : 'none'
        }}
      >
        <Typography color="text.secondary" variant={fontSize}>
          {connector.description}
        </Typography>
      </Label>
    </Box>
  );
};
