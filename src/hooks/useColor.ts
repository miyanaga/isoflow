import { useMemo } from 'react';
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

    // 存在しないカラーIDの場合、エラーをスローせずにデフォルトカラーを返す
    const colorIndex = colors.findIndex((c) => c.id === colorId);
    if (colorIndex === -1) {
      console.warn(`Color with id "${colorId}" not found. Using default color.`);
      if (colors.length > 0) {
        return colors[0];
      }
      return DEFAULT_COLOR;
    }

    return colors[colorIndex];
  }, [colorId, colors]);

  return color;
};
