import { useEffect, useRef } from 'react';
import { useModelStore } from 'src/stores/modelStore';
import { Icon } from 'src/types';
import { generateId } from 'src/utils';

// Use relative WebSocket URL through the proxy
const getWebSocketUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  return `${protocol}//${host}/api/icons/sync`;
};

interface IconData {
  name: string;
  svg: string;
  updatedAt: string;
}

interface SyncMessage {
  type: 'sync' | 'error';
  data?: IconData[];
  message?: string;
}

export const useIconSync = () => {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const modelActions = useModelStore((state) => state.actions);
  const isConnecting = useRef(false);

  const connectWebSocket = () => {
    if (isConnecting.current || (ws.current && ws.current.readyState === WebSocket.OPEN)) {
      return;
    }

    isConnecting.current = true;
    const wsUrl = getWebSocketUrl();
    console.log('Connecting to icon sync WebSocket:', wsUrl);

    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('Connected to icon sync WebSocket');
      isConnecting.current = false;
    };

    ws.current.onmessage = (event) => {
      try {
        const message: SyncMessage = JSON.parse(event.data);

        if (message.type === 'sync' && message.data) {
          console.log(`Syncing ${message.data.length} CUSTOM icons`);

          // Convert server icons to Isoflow icons
          const customIcons: Icon[] = message.data.map(iconData => ({
            id: `custom_${iconData.name}`,
            name: iconData.name,
            url: `data:image/svg+xml;base64,${btoa(iconData.svg)}`,
            collection: 'CUSTOM',
            isIsometric: false
          }));

          // Get current icons and filter out existing CUSTOM icons
          const currentState = modelActions.get();
          const currentIcons = currentState.icons.filter(
            (icon: Icon) => icon.collection !== 'CUSTOM'
          );

          // Combine with new CUSTOM icons
          const updatedIcons = [...currentIcons, ...customIcons];

          // Update the store
          modelActions.setIcons(updatedIcons);
        } else if (message.type === 'error') {
          console.error('Icon sync error:', message.message);
        }
      } catch (error) {
        console.error('Error processing sync message:', error);
      }
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      isConnecting.current = false;
    };

    ws.current.onclose = () => {
      console.log('WebSocket connection closed');
      isConnecting.current = false;
      ws.current = null;

      // Reconnect after 3 seconds
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      reconnectTimeout.current = setTimeout(() => {
        console.log('Attempting to reconnect...');
        connectWebSocket();
      }, 3000);
    };
  };

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);
};