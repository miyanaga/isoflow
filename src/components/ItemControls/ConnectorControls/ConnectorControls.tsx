import React from 'react';
import { Connector, connectorStyleOptions, arrowOptions } from 'src/types';
import { Box, Slider, Select, MenuItem, TextField, Switch, FormControlLabel } from '@mui/material';
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
      <Section title="Text Size">
        <Slider
          marks
          step={1}
          min={1}
          max={10}
          value={connector.textSize ?? 1}
          onChange={(e, newSize) => {
            updateConnector(connector.id, { textSize: newSize as number });
          }}
        />
      </Section>
      <Section title="Text Frame">
        <FormControlLabel
          control={
            <Switch
              checked={connector.textFrame ?? true}
              onChange={(e) => {
                updateConnector(connector.id, { textFrame: e.target.checked });
              }}
            />
          }
          label="Show background and border"
        />
      </Section>
      <Section title="Text Position">
        <Slider
          marks
          step={0.1}
          min={0}
          max={1}
          value={connector.textOffset ?? 0.5}
          onChange={(e, newOffset) => {
            updateConnector(connector.id, { textOffset: newOffset as number });
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
