// src/core/viewport/viewport.ts

/**
 * Viewport - High-Performance Virtual Scrolling
 * Main composer for viewport functionality using pipe pattern
 */

import { pipe } from "mtrl/src/core";
import type {
  ViewportConfig,
  ViewportComponent,
  ViewportContext,
} from "./types";
import { createViewportManager } from "./features/manager";

/**
 * Creates a viewport-enhanced component using composition
 *
 * @param config - Viewport configuration
 * @returns Function that enhances a component with viewport capabilities
 */
export const createViewport = (config: ViewportConfig = {}) => {
  return <T extends ViewportContext>(component: T): T & ViewportComponent => {
    // Use pipe pattern for future extensibility
    const enhance = pipe(createViewportManager(config));

    return enhance(component);
  };
};
