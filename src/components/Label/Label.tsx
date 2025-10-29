import React, { useRef } from 'react';
import { Box, SxProps } from '@mui/material';

const CONNECTOR_DOT_SIZE = 3;
const CONNECTOR_DOT_OUTLINE_OFFSET = 2;

export interface Props {
  labelHeight?: number;
  maxWidth: number;
  maxHeight?: number;
  expandDirection?: 'CENTER' | 'BOTTOM';
  children: React.ReactNode;
  sx?: SxProps;
  labelSize?: number;
}

export const Label = ({
  children,
  maxWidth,
  maxHeight,
  expandDirection = 'CENTER',
  labelHeight = 0,
  sx,
  labelSize = 1
}: Props) => {
  const contentRef = useRef<HTMLDivElement>();

  return (
    <Box
      sx={{
        position: 'absolute',
        width: maxWidth
      }}
    >
      {labelHeight > 0 && (
        <Box
          component="svg"
          viewBox={`0 0 ${CONNECTOR_DOT_SIZE} ${labelHeight}`}
          width={CONNECTOR_DOT_SIZE}
          sx={{
            position: 'absolute',
            top: -labelHeight,
            left: -CONNECTOR_DOT_SIZE / 2
          }}
        >
          <line
            x1={CONNECTOR_DOT_SIZE / 2}
            y1={0}
            x2={CONNECTOR_DOT_SIZE / 2}
            y2={labelHeight}
            strokeDasharray={`0, ${CONNECTOR_DOT_SIZE * 2}`}
            stroke="white"
            strokeWidth={CONNECTOR_DOT_SIZE + CONNECTOR_DOT_OUTLINE_OFFSET}
            strokeLinecap="round"
          />
          <line
            x1={CONNECTOR_DOT_SIZE / 2}
            y1={0}
            x2={CONNECTOR_DOT_SIZE / 2}
            y2={labelHeight}
            strokeDasharray={`0, ${CONNECTOR_DOT_SIZE * 2}`}
            stroke="black"
            strokeWidth={CONNECTOR_DOT_SIZE}
            strokeLinecap="round"
          />
        </Box>
      )}

      <Box
        ref={contentRef}
        sx={{
          position: 'absolute',
          display: 'inline-block',
          bgcolor: 'common.white',
          border: '1px solid',
          borderColor: 'grey.400',
          borderRadius: 2,
          py: 1,
          px: 1.5,
          transformOrigin: 'bottom center',
          transform: `translate(-50%, ${
            expandDirection === 'BOTTOM' ? '-100%' : '-50%'
          }) scale(${labelSize})`,
          overflow: 'hidden',
          ...sx
        }}
        style={{
          maxHeight,
          top: -labelHeight
        }}
      >
        {children}
      </Box>
    </Box>
  );
};
