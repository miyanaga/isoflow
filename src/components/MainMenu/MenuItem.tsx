import React from 'react';
import { MenuItem as MuiMenuItem, ListItemIcon, SxProps, Theme, Box, Typography } from '@mui/material';

export interface Props {
  onClick?: () => void;
  Icon?: React.ReactNode;
  children: string | React.ReactNode;
  sx?: SxProps<Theme>;
  shortcut?: string;
}

export const MenuItem = ({ onClick, Icon, children, sx, shortcut }: Props) => {
  return (
    <MuiMenuItem onClick={onClick} sx={sx}>
      <ListItemIcon>{Icon}</ListItemIcon>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        {children}
        {shortcut && (
          <Typography variant="caption" sx={{ ml: 2, color: 'text.secondary', fontSize: '11px' }}>
            {shortcut}
          </Typography>
        )}
      </Box>
    </MuiMenuItem>
  );
};
