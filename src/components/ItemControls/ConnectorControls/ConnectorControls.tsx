import React from 'react';
import { Connector, connectorStyleOptions, arrowOptions } from 'src/types';
import { Box, Slider, Select, MenuItem, TextField } from '@mui/material';
import { useConnector } from 'src/hooks/useConnector';
import { ColorSelector } from 'src/components/ColorSelector/ColorSelector';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useScene } from 'src/hooks/useScene';
import { ControlsContainer } from '../components/ControlsContainer';
import { Section } from '../components/Section';
import { DeleteButton } from '../components/DeleteButton';

interface Props {
  id: string;
}

export const ConnectorControls = ({ id }: Props) => {
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const connector = useConnector(id);
  const { updateConnector, deleteConnector } = useScene();

  return (
    <ControlsContainer>
      <Section>
        <TextField
          label="Description"
          value={connector.description}
          onChange={(e) => {
            updateConnector(connector.id, {
              description: e.target.value as string
            });
          }}
        />
      </Section>
      <Section>
        <ColorSelector
          onChange={(color) => {
            return updateConnector(connector.id, { color });
          }}
          activeColor={connector.color}
        />
      </Section>
      <Section title="Width">
        <Slider
          marks
          step={10}
          min={10}
          max={30}
          value={connector.width}
          onChange={(e, newWidth) => {
            updateConnector(connector.id, { width: newWidth as number });
          }}
        />
      </Section>
      <Section title="Style">
        <Select
          value={connector.style}
          onChange={(e) => {
            updateConnector(connector.id, {
              style: e.target.value as Connector['style']
            });
          }}
        >
          {Object.values(connectorStyleOptions).map((style) => {
            return <MenuItem key={style} value={style}>{style}</MenuItem>;
          })}
        </Select>
      </Section>
      <Section title="Arrows">
        <Select
          value={connector.arrows || 'to'}
          onChange={(e) => {
            updateConnector(connector.id, {
              arrows: e.target.value as Connector['arrows']
            });
          }}
        >
          {Object.values(arrowOptions).map((arrow) => {
            return (
              <MenuItem key={arrow} value={arrow}>
                {arrow === 'to' && 'To (→)'}
                {arrow === 'from' && 'From (←)'}
                {arrow === 'both' && 'Both (↔)'}
                {arrow === 'none' && 'None (─)'}
              </MenuItem>
            );
          })}
        </Select>
      </Section>
      <Section title="Arrow Offset">
        <Slider
          marks
          step={0.5}
          min={0}
          max={5}
          value={connector.arrowOffset || 0}
          onChange={(e, newOffset) => {
            updateConnector(connector.id, { arrowOffset: newOffset as number });
          }}
        />
      </Section>
      <Section>
        <Box>
          <DeleteButton
            onClick={() => {
              uiStateActions.setItemControls(null);
              deleteConnector(connector.id);
            }}
          />
        </Box>
      </Section>
    </ControlsContainer>
  );
};
