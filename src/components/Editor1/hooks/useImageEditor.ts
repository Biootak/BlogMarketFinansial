import { useCallback, useEffect, useState } from 'react';

interface ImageEditorState {
  rotation: number;
  filter: string;
  opacity: number;
  borderRadius: number;
  shadow: boolean;
  zoom: number;
  alt: string;
  title: string;
  caption: string;
}

interface UseImageEditorProps {
  initialState?: Partial<ImageEditorState>;
  onUpdate?: (state: Partial<ImageEditorState>) => void;
}

export const useImageEditor = ({ initialState = {}, onUpdate }: UseImageEditorProps = {}) => {
  const [state, setState] = useState<ImageEditorState>({
    rotation: 0,
    filter: 'none',
    opacity: 100,
    borderRadius: 12,
    shadow: true,
    zoom: 1,
    alt: '',
    title: '',
    caption: '',
    ...initialState,
  });

  const updateState = useCallback(
    (updates: Partial<ImageEditorState>) => {
      setState((prev) => {
        const newState = { ...prev, ...updates };
        onUpdate?.(updates);
        return newState;
      });
    },
    [onUpdate],
  );

  const rotate = useCallback(() => {
    updateState({ rotation: (state.rotation + 90) % 360 });
  }, [state.rotation, updateState]);

  const setFilter = useCallback(
    (filter: string) => {
      updateState({ filter });
    },
    [updateState],
  );

  const setOpacity = useCallback(
    (opacity: number) => {
      updateState({ opacity: Math.max(0, Math.min(100, opacity)) });
    },
    [updateState],
  );

  const setBorderRadius = useCallback(
    (borderRadius: number) => {
      updateState({ borderRadius: Math.max(0, Math.min(50, borderRadius)) });
    },
    [updateState],
  );

  const toggleShadow = useCallback(() => {
    updateState({ shadow: !state.shadow });
  }, [state.shadow, updateState]);

  const zoomIn = useCallback(() => {
    updateState({ zoom: Math.min(state.zoom + 0.25, 3) });
  }, [state.zoom, updateState]);

  const zoomOut = useCallback(() => {
    updateState({ zoom: Math.max(state.zoom - 0.25, 0.5) });
  }, [state.zoom, updateState]);

  const resetZoom = useCallback(() => {
    updateState({ zoom: 1 });
  }, [updateState]);

  const setMetadata = useCallback(
    (metadata: { alt?: string; title?: string; caption?: string }) => {
      updateState(metadata);
    },
    [updateState],
  );

  const reset = useCallback(() => {
    setState({
      rotation: 0,
      filter: 'none',
      opacity: 100,
      borderRadius: 12,
      shadow: true,
      zoom: 1,
      alt: initialState.alt || '',
      title: initialState.title || '',
      caption: initialState.caption || '',
    });
  }, [initialState]);

  return {
    state,
    actions: {
      rotate,
      setFilter,
      setOpacity,
      setBorderRadius,
      toggleShadow,
      zoomIn,
      zoomOut,
      resetZoom,
      setMetadata,
      reset,
      updateState,
    },
  };
};
