// src/core/list-manager/features/api.ts

/**
 * API Bridge - Event communication between features and components
 * 
 * This module provides a clean interface for:
 * - Feature-to-component event forwarding
 * - Component-to-feature method calls
 * - Standardized event naming and data structures
 */

import type { ListManagerEvents, ListManagerEventData } from "../../types";

/**
 * Event bridge for forwarding feature events to components
 */
export const createEventBridge = (component: any) => {
  return {
    forwardEvent<T extends ListManagerEvents>(
      event: T,
      data: ListManagerEventData[T]
    ) {
      // Forward to component's event system
      if (component.emit) {
        component.emit(event, data);
      }
    },

    // Convenience methods for common events
    notifyViewportChanged(data: ListManagerEventData[ListManagerEvents.VIEWPORT_CHANGED]) {
      this.forwardEvent(ListManagerEvents.VIEWPORT_CHANGED, data);
    },

    notifyRangeLoaded(data: ListManagerEventData[ListManagerEvents.RANGE_LOADED]) {
      this.forwardEvent(ListManagerEvents.RANGE_LOADED, data);
    },

    notifyError(data: ListManagerEventData[ListManagerEvents.ERROR_OCCURRED]) {
      this.forwardEvent(ListManagerEvents.ERROR_OCCURRED, data);
    }
  };
};

/**
 * Standard API methods that features can expose to components
 */
export interface FeatureAPI {
  // Core lifecycle
  initialize(): void;
  destroy(): void;
  
  // Configuration
  updateConfig(config: any): void;
  getConfig(): any;
  
  // Status
  isInitialized(): boolean;
}
