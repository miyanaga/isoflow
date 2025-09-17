import { useEffect, useRef, useCallback } from 'react';
import { useModelStore } from 'src/stores/modelStore';
import { Icon } from 'src/types';
import { api } from 'src/utils';

interface IconData {
  name: string;
  svg: string;
  updatedAt: string;
}

interface SyncResponse {
  lastUpdated: string | null;
  data?: IconData[];
}

export const useIconSync = () => {
  const modelActions = useModelStore((state) => state.actions);
  const lastUpdatedRef = useRef<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const syncIcons = useCallback(async (forceSync = false) => {
    try {
      const response = await api.icons.sync(lastUpdatedRef.current);
      const syncData = response as SyncResponse;

      // If server has no icons
      if (syncData.lastUpdated === null) {
        // Clear CUSTOM icons
        const currentState = modelActions.get();
        const nonCustomIcons = currentState.icons.filter(
          (icon: Icon) => icon.collection !== 'CUSTOM'
        );
        modelActions.setIcons(nonCustomIcons);
        lastUpdatedRef.current = null;
        return;
      }

      // If timestamps match and not force sync, no update needed
      if (!forceSync && syncData.lastUpdated === lastUpdatedRef.current) {
        return;
      }

      // Update with new data
      if (syncData.data) {
        console.log(`Syncing ${syncData.data.length} CUSTOM icons`);

        // Convert server icons to Isoflow icons
        const customIcons: Icon[] = syncData.data.map(iconData => {
          // Parse SVG to check if it has the isometric attribute
          let isIsometric = false;
          try {
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(iconData.svg, 'image/svg+xml');
            const svgElement = svgDoc.querySelector('svg');
            if (svgElement) {
              isIsometric = svgElement.getAttribute('data-isometric') === 'true';
            }
          } catch (error) {
            console.error('Error parsing SVG:', error);
          }

          // Convert UTF-8 string to base64
          const base64 = btoa(unescape(encodeURIComponent(iconData.svg)));

          return {
            id: `custom_${iconData.name}`,
            name: iconData.name,
            url: `data:image/svg+xml;base64,${base64}`,
            collection: 'CUSTOM',
            isIsometric
          };
        });

        // Get current icons and filter out existing CUSTOM icons
        const currentState = modelActions.get();
        const nonCustomIcons = currentState.icons.filter(
          (icon: Icon) => icon.collection !== 'CUSTOM'
        );

        // Combine with new CUSTOM icons
        const updatedIcons = [...nonCustomIcons, ...customIcons];

        // Update the store
        modelActions.setIcons(updatedIcons);
        lastUpdatedRef.current = syncData.lastUpdated;
      }
    } catch (error) {
      console.error('Error syncing icons:', error);
    }
  }, [modelActions]);

  // Manual sync trigger for after upload
  const triggerSync = useCallback(async () => {
    // Reset timestamp to force full sync
    lastUpdatedRef.current = null;
    await syncIcons(true);
  }, [syncIcons]);

  useEffect(() => {
    // Initial sync
    syncIcons();

    // Set up polling interval (10 seconds)
    const interval = setInterval(syncIcons, 10000);
    intervalRef.current = interval;

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [syncIcons]);

  // Export triggerSync so it can be called from other components
  return { triggerSync };
};