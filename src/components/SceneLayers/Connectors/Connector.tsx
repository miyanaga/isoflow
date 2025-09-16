import React, { useMemo } from 'react';
import { useTheme, Box } from '@mui/material';
import { UNPROJECTED_TILE_SIZE } from 'src/config';
import { Coords } from 'src/types';
import {
  getAnchorTile,
  getColorVariant,
  getConnectorDirectionIcon
} from 'src/utils';
import { Circle } from 'src/components/Circle/Circle';
import { Svg } from 'src/components/Svg/Svg';
import { useIsoProjection } from 'src/hooks/useIsoProjection';
import { useConnector } from 'src/hooks/useConnector';
import { useScene } from 'src/hooks/useScene';
import { useColor } from 'src/hooks/useColor';

interface Props {
  connector: ReturnType<typeof useScene>['connectors'][0];
  isSelected?: boolean;
}

export const Connector = ({ connector: _connector, isSelected }: Props) => {
  const theme = useTheme();
  const color = useColor(_connector.color);
  const { currentView } = useScene();
  const connector = useConnector(_connector.id);
  const { css, pxSize } = useIsoProjection({
    ...connector.path.rectangle
  });

  const drawOffset = useMemo(() => {
    return {
      x: UNPROJECTED_TILE_SIZE / 2,
      y: UNPROJECTED_TILE_SIZE / 2
    };
  }, []);

  const pathString = useMemo(() => {
    return connector.path.tiles.reduce((acc, tile) => {
      return `${acc} ${tile.x * UNPROJECTED_TILE_SIZE + drawOffset.x},${
        tile.y * UNPROJECTED_TILE_SIZE + drawOffset.y
      }`;
    }, '');
  }, [connector.path.tiles, drawOffset]);

  const anchorPositions = useMemo(() => {
    if (!isSelected) return [];

    return connector.anchors.map((anchor) => {
      const position = getAnchorTile(anchor, currentView);

      return {
        id: anchor.id,
        x:
          (connector.path.rectangle.from.x - position.x) *
            UNPROJECTED_TILE_SIZE +
          drawOffset.x,
        y:
          (connector.path.rectangle.from.y - position.y) *
            UNPROJECTED_TILE_SIZE +
          drawOffset.y
      };
    });
  }, [
    currentView,
    connector.path.rectangle,
    connector.anchors,
    drawOffset,
    isSelected
  ]);

  const arrowIcons = useMemo(() => {
    const arrows = connector.arrows || 'to';
    const tiles = connector.path.tiles;
    const arrowOffset = connector.arrowOffset || 0;

    if (tiles.length < 2 || arrows === 'none') {
      return [];
    }

    const icons = [];

    // Helper function to apply offset to arrow position
    const applyOffsetToArrow = (tiles: Coords[], offset: number, isFromArrow = false) => {
      if (offset === 0) {
        if (isFromArrow) {
          // 始点側の矢印：始点の位置と向きを計算
          if (tiles.length < 2) return null;

          const startTile = tiles[0];
          const secondTile = tiles[1];

          const dx = secondTile.x - startTile.x;
          const dy = secondTile.y - startTile.y;

          let rotation = 0;
          if (dx > 0) {
            if (dy > 0) rotation = 135;
            else if (dy < 0) rotation = 45;
            else rotation = 90;
          } else if (dx < 0) {
            if (dy > 0) rotation = -135;
            else if (dy < 0) rotation = -45;
            else rotation = -90;
          } else {
            if (dy > 0) rotation = 180;
            else if (dy < 0) rotation = 0;
            else rotation = -90;
          }

          return {
            x: startTile.x * UNPROJECTED_TILE_SIZE + UNPROJECTED_TILE_SIZE / 2,
            y: startTile.y * UNPROJECTED_TILE_SIZE + UNPROJECTED_TILE_SIZE / 2,
            rotation
          };
        } else {
          // 終点側の矢印：元の関数を使用
          return getConnectorDirectionIcon(tiles);
        }
      }

      // Calculate the total path length
      let totalLength = 0;
      for (let i = 1; i < tiles.length; i++) {
        const dx = tiles[i].x - tiles[i - 1].x;
        const dy = tiles[i].y - tiles[i - 1].y;
        totalLength += Math.sqrt(dx * dx + dy * dy);
      }

      // Calculate target position along the path
      // For "to" arrow: offset from end
      // For "from" arrow: offset from start
      const targetDistance = isFromArrow ? offset : totalLength - offset;

      if (targetDistance <= 0 || targetDistance >= totalLength) {
        return getConnectorDirectionIcon(tiles);
      }

      // Find the segment and position within that segment
      let currentDistance = 0;
      for (let i = 1; i < tiles.length; i++) {
        const segmentStart = tiles[i - 1];
        const segmentEnd = tiles[i];
        const dx = segmentEnd.x - segmentStart.x;
        const dy = segmentEnd.y - segmentStart.y;
        const segmentLength = Math.sqrt(dx * dx + dy * dy);

        if (currentDistance + segmentLength >= targetDistance) {
          // The target position is within this segment
          const distanceInSegment = targetDistance - currentDistance;
          const ratio = distanceInSegment / segmentLength;

          const x = segmentStart.x + dx * ratio;
          const y = segmentStart.y + dy * ratio;

          // Calculate rotation based on segment direction
          let rotation = 0;
          if (dx > 0) {
            if (dy > 0) rotation = 135;
            else if (dy < 0) rotation = 45;
            else rotation = 90;
          } else if (dx < 0) {
            if (dy > 0) rotation = -135;
            else if (dy < 0) rotation = -45;
            else rotation = -90;
          } else {
            if (dy > 0) rotation = 180;
            else if (dy < 0) rotation = 0;
            else rotation = -90;
          }

          // For "from" arrow, reverse the direction (add 180 degrees)
          if (isFromArrow) {
            rotation = (rotation + 180) % 360;
          }

          return {
            x: x * UNPROJECTED_TILE_SIZE + UNPROJECTED_TILE_SIZE / 2,
            y: y * UNPROJECTED_TILE_SIZE + UNPROJECTED_TILE_SIZE / 2,
            rotation
          };
        }

        currentDistance += segmentLength;
      }

      return getConnectorDirectionIcon(tiles);
    };

    if (arrows === 'to' || arrows === 'both') {
      // Arrow at the end with offset
      const directionIcon = applyOffsetToArrow(tiles, arrowOffset);
      if (directionIcon) {
        icons.push({
          ...directionIcon,
          id: 'to'
        });
      }
    }

    if (arrows === 'from' || arrows === 'both') {
      // Arrow at the start with offset (from start)
      let fromDirectionIcon;

      if (arrowOffset === 0) {
        // オフセットが0の場合、終点と同様に2番目のタイルに矢印を配置
        if (tiles.length >= 2) {
          const firstTile = tiles[0];
          const secondTile = tiles[1];

          // 2番目から1番目への方向（逆方向）を計算
          const dx = firstTile.x - secondTile.x;
          const dy = firstTile.y - secondTile.y;

          let rotation = 0;
          if (dx > 0) {
            if (dy > 0) rotation = 135;
            else if (dy < 0) rotation = 45;
            else rotation = 90;
          } else if (dx < 0) {
            if (dy > 0) rotation = -135;
            else if (dy < 0) rotation = -45;
            else rotation = -90;
          } else {
            if (dy > 0) rotation = 180;
            else if (dy < 0) rotation = 0;
            else rotation = -90;
          }

          // 2番目のタイルに配置、始点を向く
          fromDirectionIcon = {
            x: secondTile.x * UNPROJECTED_TILE_SIZE + UNPROJECTED_TILE_SIZE / 2,
            y: secondTile.y * UNPROJECTED_TILE_SIZE + UNPROJECTED_TILE_SIZE / 2,
            rotation
          };
        }
      } else {
        // オフセットがある場合はヘルパー関数を使用
        fromDirectionIcon = applyOffsetToArrow(tiles, arrowOffset, true);
      }

      if (fromDirectionIcon) {
        icons.push({
          ...fromDirectionIcon,
          id: 'from'
        });
      }
    }

    return icons;
  }, [connector.path.tiles, connector.arrows, connector.arrowOffset]);

  const connectorWidthPx = useMemo(() => {
    return (UNPROJECTED_TILE_SIZE / 100) * connector.width;
  }, [connector.width]);

  const strokeDashArray = useMemo(() => {
    switch (connector.style) {
      case 'DASHED':
        return `${connectorWidthPx * 2}, ${connectorWidthPx * 2}`;
      case 'DOTTED':
        return `0, ${connectorWidthPx * 1.8}`;
      case 'SOLID':
      default:
        return 'none';
    }
  }, [connector.style, connectorWidthPx]);

  return (
    <Box style={css}>
      <Svg
        style={{
          // TODO: The original x coordinates of each tile seems to be calculated wrongly.
          // They are mirrored along the x-axis.  The hack below fixes this, but we should
          // try to fix this issue at the root of the problem (might have further implications).
          transform: 'scale(-1, 1)'
        }}
        viewboxSize={pxSize}
      >
        <polyline
          points={pathString}
          stroke={theme.palette.common.white}
          strokeWidth={connectorWidthPx * 1.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity={0.7}
          strokeDasharray={strokeDashArray}
          fill="none"
        />
        <polyline
          points={pathString}
          stroke={getColorVariant(color.value, 'dark', { grade: 1 })}
          strokeWidth={connectorWidthPx}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={strokeDashArray}
          fill="none"
        />

        {anchorPositions.map((anchor) => {
          return (
            <g key={anchor.id}>
              <Circle
                tile={anchor}
                radius={18}
                fill={theme.palette.common.white}
                fillOpacity={0.7}
              />
              <Circle
                tile={anchor}
                radius={12}
                stroke={theme.palette.common.black}
                fill={theme.palette.common.white}
                strokeWidth={6}
              />
            </g>
          );
        })}

        {arrowIcons.map((arrowIcon) => (
          <g key={arrowIcon.id} transform={`translate(${arrowIcon.x}, ${arrowIcon.y})`}>
            <g transform={`rotate(${arrowIcon.rotation})`}>
              <polygon
                fill="black"
                stroke={theme.palette.common.white}
                strokeWidth={4}
                points="17.58,17.01 0,-17.01 -17.58,17.01"
              />
            </g>
          </g>
        ))}
      </Svg>
    </Box>
  );
};
