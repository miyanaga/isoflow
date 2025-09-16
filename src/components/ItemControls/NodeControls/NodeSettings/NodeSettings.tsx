import React from 'react';
import { Slider, Box, TextField, FormControlLabel, Checkbox } from '@mui/material';
import { ModelItem, ViewItem } from 'src/types';
import { MarkdownEditor } from 'src/components/MarkdownEditor/MarkdownEditor';
import { useModelItem } from 'src/hooks/useModelItem';
import { DeleteButton } from '../../components/DeleteButton';
import { Section } from '../../components/Section';

export type NodeUpdates = {
  model: Partial<ModelItem>;
  view: Partial<ViewItem>;
};

interface Props {
  node: ViewItem;
  onModelItemUpdated: (updates: Partial<ModelItem>) => void;
  onViewItemUpdated: (updates: Partial<ViewItem>) => void;
  onDeleted: () => void;
}

export const NodeSettings = ({
  node,
  onModelItemUpdated,
  onViewItemUpdated,
  onDeleted
}: Props) => {
  const modelItem = useModelItem(node.id);

  return (
    <>
      <Section title="Name">
        <TextField
          value={modelItem.name}
          onChange={(e) => {
            const text = e.target.value as string;
            if (modelItem.name !== text) onModelItemUpdated({ name: text });
          }}
        />
      </Section>
      <Section title="Description">
        <MarkdownEditor
          value={modelItem.description}
          onChange={(text) => {
            if (modelItem.description !== text)
              onModelItemUpdated({ description: text });
          }}
        />
      </Section>
      {modelItem.name && !node.labelOnly && (
        <Section title="Label height">
          <Slider
            marks
            step={20}
            min={60}
            max={280}
            value={node.labelHeight}
            onChange={(e, newHeight) => {
              const labelHeight = newHeight as number;
              onViewItemUpdated({ labelHeight });
            }}
          />
        </Section>
      )}
      {!node.labelOnly && (
        <Section title="Icon size">
          <Slider
            marks
            step={1}
            min={1}
            max={3}
            value={node.size || 1}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => {
              return `${value}x${value}`;
            }}
            onChange={(e, newSize) => {
              const size = newSize as number;
              onViewItemUpdated({ size });
            }}
          />
        </Section>
      )}
      {modelItem.name && (
        <Section title="Label size">
          <Slider
            marks
            step={0.5}
            min={1}
            max={2}
            value={node.labelSize || 1}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => {
              return `${value}x`;
            }}
            onChange={(e, newSize) => {
              const labelSize = newSize as number;
              onViewItemUpdated({ labelSize });
            }}
          />
        </Section>
      )}
      <Section title="Icon options">
        <FormControlLabel
          control={
            <Checkbox
              checked={node.flipHorizontal || false}
              onChange={(e) => {
                onViewItemUpdated({ flipHorizontal: e.target.checked });
              }}
            />
          }
          label="Flip horizontally"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={node.labelOnly || false}
              onChange={(e) => {
                onViewItemUpdated({ labelOnly: e.target.checked });
              }}
            />
          }
          label="Label only"
        />
      </Section>
      <Section>
        <Box>
          <DeleteButton onClick={onDeleted} />
        </Box>
      </Section>
    </>
  );
};
