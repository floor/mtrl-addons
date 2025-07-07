import type { ListManagerPlugin } from "../../types";
import { CLASSES, LOGGING } from "../../constants";

/**
 * Viewport scrollbar configuration
 */
export interface ViewportScrollbarConfig {
  enabled: boolean;
  customScrollbar: boolean;
  scrollbarWidth: number;
  thumbColor: string;
  trackColor: string;
  autoHide: boolean;
  hideDelay: number;
}

/**
 * Viewport scrollbar management plugin
 */
export const viewportScrollbar = (
  config: Partial<ViewportScrollbarConfig> = {}
): ListManagerPlugin => ({
  name: "viewport-scrollbar",
  version: "1.0.0",
  dependencies: [],

  install: (listManager, pluginConfig) => {
    // Configuration with defaults
    const scrollbarConfig: ViewportScrollbarConfig = {
      enabled: true,
      customScrollbar: false,
      scrollbarWidth: 8,
      thumbColor: "#999",
      trackColor: "#f0f0f0",
      autoHide: true,
      hideDelay: 1000,
      ...config,
    };

    // Get viewport element
    const getViewportElement = (): HTMLElement | null => {
      const container = listManager.getConfig().container;
      return container?.querySelector(`.${CLASSES.VIEWPORT}`) || null;
    };

    /**
     * Apply native scrollbar styling
     */
    const applyNativeScrollbar = (viewport: HTMLElement): void => {
      if (!scrollbarConfig.customScrollbar) return;

      const scrollbarStyles = `
        ::-webkit-scrollbar {
          width: ${scrollbarConfig.scrollbarWidth}px;
        }
        ::-webkit-scrollbar-track {
          background: ${scrollbarConfig.trackColor};
        }
        ::-webkit-scrollbar-thumb {
          background: ${scrollbarConfig.thumbColor};
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: ${scrollbarConfig.thumbColor}dd;
        }
      `;

      // Add styles to viewport
      const styleElement = document.createElement("style");
      styleElement.textContent = scrollbarStyles;
      viewport.appendChild(styleElement);
    };

    /**
     * Handle scrollbar auto-hide
     */
    const setupAutoHide = (viewport: HTMLElement): void => {
      if (!scrollbarConfig.autoHide) return;

      let hideTimeout: number | null = null;

      const showScrollbar = () => {
        viewport.style.scrollbarWidth = "auto";
        viewport.style.msOverflowStyle = "scrollbar";
        if (hideTimeout) clearTimeout(hideTimeout);
      };

      const hideScrollbar = () => {
        hideTimeout = window.setTimeout(() => {
          viewport.style.scrollbarWidth = "none";
          viewport.style.msOverflowStyle = "none";
        }, scrollbarConfig.hideDelay);
      };

      viewport.addEventListener("mouseenter", showScrollbar);
      viewport.addEventListener("mouseleave", hideScrollbar);
      viewport.addEventListener("scroll", showScrollbar);
    };

    // Initialize scrollbar
    const viewport = getViewportElement();
    if (viewport && scrollbarConfig.enabled) {
      applyNativeScrollbar(viewport);
      setupAutoHide(viewport);
    }

    // Return scrollbar API
    return {
      updateConfig(newConfig: Partial<ViewportScrollbarConfig>): void {
        Object.assign(scrollbarConfig, newConfig);
      },

      destroy(): void {
        console.log(`${LOGGING.PREFIX} Viewport scrollbar destroyed`);
      },
    };
  },
});
