import type { ListManagerPlugin } from "../../types";
import { LOGGING } from "../../constants";

/**
 * Scroll restore configuration
 */
export interface ScrollRestoreConfig {
  enabled: boolean;
  autoSave: boolean;
  saveInterval: number;
  storageKey: string;
  restoreOnInit: boolean;
  smoothRestore: boolean;
}

/**
 * Scroll position restore plugin
 */
export const scrollRestore = (
  config: Partial<ScrollRestoreConfig> = {}
): ListManagerPlugin => ({
  name: "scroll-restore",
  version: "1.0.0",
  dependencies: [],

  install: (listManager, pluginConfig) => {
    // Configuration with defaults
    const restoreConfig: ScrollRestoreConfig = {
      enabled: true,
      autoSave: true,
      saveInterval: 1000,
      storageKey: "list-manager-scroll-position",
      restoreOnInit: true,
      smoothRestore: false,
      ...config,
    };

    let saveTimeout: number | null = null;
    let lastSavedPosition = 0;

    /**
     * Save scroll position to storage
     */
    const savePosition = (position: number): void => {
      if (!restoreConfig.enabled) return;

      try {
        sessionStorage.setItem(restoreConfig.storageKey, position.toString());
        lastSavedPosition = position;
      } catch (error) {
        console.warn(
          `${LOGGING.PREFIX} Failed to save scroll position:`,
          error
        );
      }
    };

    /**
     * Load scroll position from storage
     */
    const loadPosition = (): number | null => {
      if (!restoreConfig.enabled) return null;

      try {
        const saved = sessionStorage.getItem(restoreConfig.storageKey);
        return saved ? parseInt(saved, 10) : null;
      } catch (error) {
        console.warn(
          `${LOGGING.PREFIX} Failed to load scroll position:`,
          error
        );
        return null;
      }
    };

    /**
     * Restore scroll position
     */
    const restorePosition = async (): Promise<void> => {
      const savedPosition = loadPosition();
      if (savedPosition === null) return;

      const viewport = listManager.getViewport?.();
      if (!viewport) return;

      if (restoreConfig.smoothRestore) {
        // Use smooth scroll if available
        const smoothScroll = listManager.getFeature?.("smooth-scroll");
        if (smoothScroll?.smoothScrollTo) {
          await smoothScroll.smoothScrollTo(savedPosition);
        } else {
          viewport.scrollTop = savedPosition;
        }
      } else {
        viewport.scrollTop = savedPosition;
      }

      console.log(
        `${LOGGING.PREFIX} Scroll position restored: ${savedPosition}`
      );
    };

    /**
     * Handle scroll events for auto-save
     */
    const handleScroll = (): void => {
      if (!restoreConfig.autoSave) return;

      const viewport = listManager.getViewport?.();
      if (!viewport) return;

      const currentPosition = viewport.scrollTop;

      // Debounce saves
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }

      saveTimeout = window.setTimeout(() => {
        if (Math.abs(currentPosition - lastSavedPosition) > 10) {
          savePosition(currentPosition);
        }
      }, restoreConfig.saveInterval);
    };

    /**
     * Clear saved position
     */
    const clearSavedPosition = (): void => {
      try {
        sessionStorage.removeItem(restoreConfig.storageKey);
        lastSavedPosition = 0;
      } catch (error) {
        console.warn(
          `${LOGGING.PREFIX} Failed to clear saved position:`,
          error
        );
      }
    };

    // Setup scroll listener for auto-save
    const viewport = listManager.getViewport?.();
    if (viewport && restoreConfig.autoSave) {
      viewport.addEventListener("scroll", handleScroll, { passive: true });
    }

    // Auto-restore on init
    if (restoreConfig.restoreOnInit) {
      // Delay to ensure viewport is ready
      setTimeout(restorePosition, 100);
    }

    // Return scroll restore API
    return {
      savePosition,
      loadPosition,
      restorePosition,
      clearSavedPosition,

      getCurrentPosition(): number {
        const viewport = listManager.getViewport?.();
        return viewport?.scrollTop || 0;
      },

      updateConfig(newConfig: Partial<ScrollRestoreConfig>): void {
        Object.assign(restoreConfig, newConfig);
      },

      destroy(): void {
        if (saveTimeout) {
          clearTimeout(saveTimeout);
        }

        if (viewport) {
          viewport.removeEventListener("scroll", handleScroll);
        }

        console.log(`${LOGGING.PREFIX} Scroll restore destroyed`);
      },
    };
  },
});
