// src/core/viewport/viewport.ts

/**
 * Viewport - High-Performance Virtual Scrolling
 * Main composer for viewport functionality
 */

import type { ViewportConfig, ViewportComponent, ViewportHost } from "./types";
import { withViewport } from "./features/with-viewport";

/**
 * Creates a viewport-enhanced component
 *
 * @param config - Viewport configuration
 * @returns Function that enhances a component with viewport capabilities
 */
export const createViewport = (config: ViewportConfig = {}) => {
  return <T extends ViewportHost>(component: T): T & ViewportComponent => {
    // Use minimal viewport for now
    return withViewport(config as any)(component);
  };
};
