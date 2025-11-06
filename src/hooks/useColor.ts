import { useMemo } from 'react';
import { getItemByIdOrThrow } from 'src/utils';
import { useScene } from 'src/hooks/useScene';
import { DEFAULT_COLOR } from 'src/config';
import { Colors } from 'src/types';

export const useColor = (colorId?: string): Colors[0] => {
  const { colors } = useScene();

  const color = useMemo(() => {
    if (colorId === undefined || colorId === '__DEFAULT__') {
      if (colors.length > 0) {
        return colors[0];
      }

      return DEFAULT_COLOR;
    }

    return getItemByIdOrThrow(colors, colorId).value;
  }, [colorId, colors]);

  return color;
};
