// src/components/vlist/features/scroll-restore.ts

/**
 * Scroll Restore feature for VList
 *
 * Provides a mechanism to queue a pending scroll position and selection
 * that gets executed on the next reload. Useful for restoring list state
 * after navigation, filter changes, or other operations that cause a reload.
 *
 * This feature works with VList's `reloadAt()` method, providing a convenient
 * API for queuing scroll restoration that automatically executes on reload.
 *
 * @example
 * ```typescript
 * const vlist = createVList({
 *   layout: [...],
 *   scrollRestore: {
 *     enabled: true,
 *     // Optional: auto-clear pending after successful restore
 *     autoClear: true,
 *   },
 *   collection: { ... }
 * })
 *
 * // Queue a scroll restoration before triggering a reload
 * vlist.setPendingScroll({
 *   position: 100,         // Scroll to index 100
 *   selectId: 'item-123',  // Select this item after scroll
 * })
 *
 * // On next reload(), the pending scroll will be applied
 * await vlist.reload()  // Will use reloadAt(100, 'item-123')
 *
 * // Alternative: queue scroll with position lookup callback
 * vlist.setPendingScrollWithLookup({
 *   id: 'user-456',
 *   lookupPosition: async (id) => {
 *     const response = await fetch(`/api/users/position?id=${id}`)
 *     const data = await response.json()
 *     return data.position
 *   }
 * })
 *
 * // Events
 * vlist.on('scroll-restore:pending', ({ position, selectId }) => {
 *   console.log('Scroll restore queued')
 * })
 *
 * vlist.on('scroll-restore:applied', ({ position, selectId }) => {
 *   console.log('Scroll restore applied')
 * })
 *
 * vlist.on('scroll-restore:cleared', () => {
 *   console.log('Pending scroll cleared')
 * })
 * ```
 */

import type { VListConfig, VListItem } from "../types";

/**
 * Scroll restore configuration
 */
export interface ScrollRestoreConfig {
  /** Whether scroll restore is enabled (default: true) */
  enabled?: boolean;

  /** Auto-clear pending scroll after successful restore (default: true) */
  autoClear?: boolean;
}

/**
 * Pending scroll with pre-calculated position
 */
export interface PendingScrollPosition {
  /** The index position to scroll to */
  position: number;
  /** Optional ID of item to select after scroll */
  selectId?: string | number;
}

/**
 * Pending scroll with position lookup
 */
export interface PendingScrollLookup {
  /** The ID to look up position for */
  id: string | number;
  /** Alternative ID for position lookup (e.g., different ID format) */
  altId?: string | number;
  /** Async function to look up position from ID */
  lookupPosition: (id: string | number) => Promise<number>;
  /** Fallback position if lookup fails (default: 0) */
  fallbackPosition?: number;
}

/**
 * Internal pending scroll state
 */
interface PendingScrollState {
  type: "position" | "lookup" | null;
  position?: PendingScrollPosition;
  lookup?: PendingScrollLookup;
}

/**
 * Adds scroll restore functionality to VList component
 *
 * This feature:
 * 1. Provides API to queue pending scroll position/selection
 * 2. Intercepts reload to apply pending scroll via reloadAt()
 * 3. Supports both pre-calculated positions and position lookups
 * 4. Emits events for tracking scroll restore state
 * 5. Auto-clears pending state after successful restore (configurable)
 *
 * @param config - VList configuration with scrollRestore options
 * @returns Feature function that enhances the VList component
 */
export const withScrollRestore = <T extends VListItem = VListItem>(
  config: VListConfig<T> & { scrollRestore?: ScrollRestoreConfig }
) => {
  return (component: any): any => {
    const scrollRestoreConfig = config.scrollRestore;

    // Skip if disabled
    if (scrollRestoreConfig?.enabled === false) {
      return component;
    }

    // Configuration with defaults
    const autoClear = scrollRestoreConfig?.autoClear !== false;

    // Internal state
    const state: PendingScrollState = {
      type: null,
      position: undefined,
      lookup: undefined,
    };

    // Store original reload method
    const originalReload = component.reload;
    const originalReloadAt = component.reloadAt;

    /**
     * Clear pending scroll state
     */
    const clearPending = (): void => {
      const hadPending = state.type !== null;
      state.type = null;
      state.position = undefined;
      state.lookup = undefined;

      if (hadPending) {
        component.emit?.("scroll-restore:cleared", {});
      }
    };

    /**
     * Check if there's a pending scroll
     */
    const hasPendingScroll = (): boolean => {
      return state.type !== null;
    };

    /**
     * Get pending scroll info (for debugging/display)
     */
    const getPendingScroll = (): PendingScrollPosition | PendingScrollLookup | null => {
      if (state.type === "position" && state.position) {
        return { ...state.position };
      }
      if (state.type === "lookup" && state.lookup) {
        return { ...state.lookup };
      }
      return null;
    };

    /**
     * Set pending scroll with pre-calculated position
     */
    const setPendingScroll = (pending: PendingScrollPosition): void => {
      state.type = "position";
      state.position = { ...pending };
      state.lookup = undefined;

      component.emit?.("scroll-restore:pending", {
        type: "position",
        position: pending.position,
        selectId: pending.selectId,
      });
    };

    /**
     * Set pending scroll with position lookup
     */
    const setPendingScrollWithLookup = (pending: PendingScrollLookup): void => {
      state.type = "lookup";
      state.lookup = { ...pending };
      state.position = undefined;

      component.emit?.("scroll-restore:pending", {
        type: "lookup",
        id: pending.id,
        altId: pending.altId,
      });
    };

    /**
     * Apply pending scroll and return position/selectId for reloadAt
     */
    const applyPendingScroll = async (): Promise<{
      position: number;
      selectId?: string | number;
    } | null> => {
      if (state.type === "position" && state.position) {
        const result = {
          position: state.position.position,
          selectId: state.position.selectId,
        };

        if (autoClear) {
          clearPending();
        }

        component.emit?.("scroll-restore:applied", {
          type: "position",
          position: result.position,
          selectId: result.selectId,
        });

        return result;
      }

      if (state.type === "lookup" && state.lookup) {
        const lookup = state.lookup;
        let position = lookup.fallbackPosition ?? 0;

        try {
          const lookupId = lookup.altId ?? lookup.id;
          position = await lookup.lookupPosition(lookupId);
        } catch (error) {
          console.warn(
            "[ScrollRestore] Position lookup failed, using fallback:",
            error
          );
        }

        const result = {
          position,
          selectId: lookup.id,
        };

        if (autoClear) {
          clearPending();
        }

        component.emit?.("scroll-restore:applied", {
          type: "lookup",
          position: result.position,
          selectId: result.selectId,
          lookedUpId: lookup.altId ?? lookup.id,
        });

        return result;
      }

      return null;
    };

    /**
     * Enhanced reload that applies pending scroll
     */
    const enhancedReload = async function (this: any): Promise<void> {
      // Check for pending scroll
      if (hasPendingScroll()) {
        const scrollData = await applyPendingScroll();

        if (scrollData) {
          // Use reloadAt instead of reload
          if (typeof originalReloadAt === "function") {
            return originalReloadAt.call(
              this,
              scrollData.position,
              scrollData.selectId
            );
          }
        }
      }

      // No pending scroll or couldn't apply, do normal reload
      if (typeof originalReload === "function") {
        return originalReload.call(this);
      }
    };

    // Enhanced component with scroll restore API
    return {
      ...component,

      // Override reload to check for pending scroll
      reload: enhancedReload,

      /**
       * Set pending scroll with pre-calculated position
       * Will be applied on next reload()
       *
       * @param pending - Position and optional selectId
       */
      setPendingScroll(pending: PendingScrollPosition): void {
        setPendingScroll(pending);
      },

      /**
       * Set pending scroll with position lookup
       * Will look up position and apply on next reload()
       *
       * @param pending - ID and lookup function
       */
      setPendingScrollWithLookup(pending: PendingScrollLookup): void {
        setPendingScrollWithLookup(pending);
      },

      /**
       * Clear any pending scroll
       */
      clearPendingScroll(): void {
        clearPending();
      },

      /**
       * Check if there's a pending scroll queued
       * @returns True if pending scroll exists
       */
      hasPendingScroll(): boolean {
        return hasPendingScroll();
      },

      /**
       * Get pending scroll info (for debugging)
       * @returns Pending scroll data or null
       */
      getPendingScroll(): PendingScrollPosition | PendingScrollLookup | null {
        return getPendingScroll();
      },

      /**
       * Force apply pending scroll immediately (without waiting for reload)
       * Calls reloadAt() directly with pending scroll data
       */
      async applyPendingScrollNow(): Promise<void> {
        if (!hasPendingScroll()) return;

        const scrollData = await applyPendingScroll();
        if (scrollData && typeof originalReloadAt === "function") {
          return originalReloadAt.call(
            this,
            scrollData.position,
            scrollData.selectId
          );
        }
      },
    };
  };
};

/**
 * Type helper for VList with scroll restore
 */
export interface WithScrollRestoreComponent {
  /** Set pending scroll with pre-calculated position */
  setPendingScroll(pending: PendingScrollPosition): void;
  /** Set pending scroll with position lookup */
  setPendingScrollWithLookup(pending: PendingScrollLookup): void;
  /** Clear any pending scroll */
  clearPendingScroll(): void;
  /** Check if there's a pending scroll */
  hasPendingScroll(): boolean;
  /** Get pending scroll info */
  getPendingScroll(): PendingScrollPosition | PendingScrollLookup | null;
  /** Force apply pending scroll immediately */
  applyPendingScrollNow(): Promise<void>;
}
