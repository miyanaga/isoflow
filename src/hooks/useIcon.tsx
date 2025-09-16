import React, { useMemo, useEffect } from 'react';
import { useModelStore } from 'src/stores/modelStore';
import { getItemByIdOrThrow } from 'src/utils';
import { IsometricIcon } from 'src/components/SceneLayers/Nodes/Node/IconTypes/IsometricIcon';
import { NonIsometricIcon } from 'src/components/SceneLayers/Nodes/Node/IconTypes/NonIsometricIcon';
import { DEFAULT_ICON } from 'src/config';

export const useIcon = (id: string | undefined, size: number = 1, flipHorizontal: boolean = false) => {
  const [hasLoaded, setHasLoaded] = React.useState(false);
  const icons = useModelStore((state) => {
    return state.icons;
  });

  const icon = useMemo(() => {
    if (!id) return DEFAULT_ICON;

    return getItemByIdOrThrow(icons, id).value;
  }, [icons, id]);

  useEffect(() => {
    setHasLoaded(false);
  }, [icon.url]);

  const iconComponent = useMemo(() => {
    if (!icon.isIsometric) {
      setHasLoaded(true);
      return <NonIsometricIcon icon={icon} size={size} flipHorizontal={flipHorizontal} />;
    }

    return (
      <IsometricIcon
        url={icon.url}
        size={size}
        flipHorizontal={flipHorizontal}
        onImageLoaded={() => {
          setHasLoaded(true);
        }}
      />
    );
  }, [icon, size, flipHorizontal]);

  return {
    icon,
    iconComponent,
    hasLoaded
  };
};
