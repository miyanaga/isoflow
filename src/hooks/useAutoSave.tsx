import { useEffect, useRef } from 'react';
import { useModelStore } from 'src/stores/modelStore';
import { modelFromModelStore } from 'src/utils';

const AUTOSAVE_KEY = 'isoflow_autosave';
const AUTOSAVE_INTERVAL = 10000; // 10 seconds

export const useAutoSave = () => {
  const modelActions = useModelStore((state) => state.actions);
  const documentName = useModelStore((state) => state.documentName);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const shouldBeAutoSavedRef = useRef<boolean>(false);

  // Save to localStorage
  const saveToLocalStorage = () => {
    try {
      // Skip save if shouldBeAutoSaved is false
      if (!shouldBeAutoSavedRef.current) {
        return;
      }

      const modelState = modelActions.get();
      const model = modelFromModelStore(modelState);

      const dataToSave = {
        model,
        documentName: modelState.documentName || 'Untitled',
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(dataToSave));
      console.log('Auto-saved to localStorage at', new Date().toLocaleTimeString());

      // Reset flag after successful save
      shouldBeAutoSavedRef.current = false;
    } catch (error) {
      console.error('Failed to auto-save:', error);
    }
  };

  // Restore from localStorage
  const restoreFromLocalStorage = () => {
    try {
      const savedData = localStorage.getItem(AUTOSAVE_KEY);
      if (savedData) {
        const { model, documentName: savedDocName } = JSON.parse(savedData);
        return { model, documentName: savedDocName };
      }
    } catch (error) {
      console.error('Failed to restore from localStorage:', error);
    }
    return null;
  };

  // Set up mouse movement detection
  useEffect(() => {
    const handleMouseMove = () => {
      shouldBeAutoSavedRef.current = true;
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Set up auto-save interval
  useEffect(() => {
    // Start auto-save interval
    intervalRef.current = setInterval(saveToLocalStorage, AUTOSAVE_INTERVAL);

    // Save on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // Force save on unmount regardless of flag
      shouldBeAutoSavedRef.current = true;
      saveToLocalStorage();
    };
  }, []);

  // Save whenever documentName changes
  useEffect(() => {
    shouldBeAutoSavedRef.current = true;
    saveToLocalStorage();
  }, [documentName]);

  return {
    saveToLocalStorage,
    restoreFromLocalStorage
  };
};