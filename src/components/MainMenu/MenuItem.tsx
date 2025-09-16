import React from 'react';
import { MenuItem as MuiMenuItem, ListItemIcon, SxProps, Theme } from '@mui/material';

export interface Props {
  onClick?: () => void;
  Icon?: React.ReactNode;
  children: string | React.ReactNode;
  sx?: SxProps<Theme>;
}

export const MenuItem = ({ onClick, Icon, children, sx }: Props) => {
  return (
    <MuiMenuItem onClick={onClick} sx={sx}>
      <ListItemIcon>{Icon}</ListItemIcon>
      {children}
    </MuiMenuItem>
  );
};
