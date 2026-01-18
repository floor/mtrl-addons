// src/components/form/features/protection.ts

/**
 * Protection feature for Form component
 * Handles blocking overlay to prevent clicks outside the form when it has unsaved changes
 */

import type {
  FormConfig,
  BaseFormComponent,
  FormData,
  FormState,
  FormFieldRegistry,
  ProtectChangesConfig,
  DataConflictEvent,
} from "../types";
import { FORM_EVENTS } from "../constants";

/**
 * Normalizes protection config to a consistent object format
 */
const normalizeProtectConfig = (
  config: boolean | ProtectChangesConfig | undefined,
): ProtectChangesConfig => {
  if (!config) {
    return { beforeUnload: false, onDataOverwrite: false };
  }
  if (config === true) {
    return { beforeUnload: true, onDataOverwrite: true };
  }
  return {
    beforeUnload: config.beforeUnload ?? false,
    onDataOverwrite: config.onDataOverwrite ?? false,
  };
};

/**
 * withProtection feature
 * Adds blocking overlay protection to prevent clicks outside the form when modified
 */
export const withProtection = (config: FormConfig) => {
  return <
    T extends BaseFormComponent & {
      fields: FormFieldRegistry;
      state: FormState;
      emit?: (event: string, data?: unknown) => void;
      on?: (event: string, handler: Function) => void;
    },
  >(
    component: T,
  ): T => {
    // Normalize protection configuration
    const protectConfig = normalizeProtectConfig(config.protectChanges);

    // If overlay protection is not enabled, return component unchanged
    if (!protectConfig.onDataOverwrite) {
      return component;
    }

    // Track blocking overlay elements (top, bottom, left, right)
    let blockingOverlays: HTMLElement[] = [];

    // Resize/scroll handler for updating overlay positions
    let resizeHandler: (() => void) | null = null;

    /**
     * Creates blocking overlay elements around the form
     * These overlays prevent clicks outside the form when it has unsaved changes
     */
    const createBlockingOverlays = (): void => {
      if (blockingOverlays.length > 0) return; // Already created

      const formElement = component.element;
      if (!formElement) return;

      // Get form position and dimensions (relative to viewport for fixed positioning)
      const rect = formElement.getBoundingClientRect();

      // Common overlay styles - using fixed positioning for viewport-relative placement
      const baseStyles = `
        position: fixed;
        background: transparent;
        z-index: 9999;
        cursor: not-allowed;
      `;

      // Create top overlay (from top of viewport to top of form)
      const topOverlay = document.createElement("div");
      topOverlay.className =
        "mtrl-form-blocking-overlay mtrl-form-blocking-overlay--top";
      topOverlay.style.cssText = `${baseStyles}
        top: 0;
        left: 0;
        right: 0;
        height: ${rect.top}px;
      `;

      // Create bottom overlay (from bottom of form to bottom of viewport)
      const bottomOverlay = document.createElement("div");
      bottomOverlay.className =
        "mtrl-form-blocking-overlay mtrl-form-blocking-overlay--bottom";
      bottomOverlay.style.cssText = `${baseStyles}
        top: ${rect.bottom}px;
        left: 0;
        right: 0;
        bottom: 0;
      `;

      // Create left overlay (from left of viewport to left of form, between top and bottom)
      const leftOverlay = document.createElement("div");
      leftOverlay.className =
        "mtrl-form-blocking-overlay mtrl-form-blocking-overlay--left";
      leftOverlay.style.cssText = `${baseStyles}
        top: ${rect.top}px;
        left: 0;
        width: ${rect.left}px;
        height: ${rect.height}px;
      `;

      // Create right overlay (from right of form to right of viewport, between top and bottom)
      const rightOverlay = document.createElement("div");
      rightOverlay.className =
        "mtrl-form-blocking-overlay mtrl-form-blocking-overlay--right";
      rightOverlay.style.cssText = `${baseStyles}
        top: ${rect.top}px;
        left: ${rect.right}px;
        right: 0;
        height: ${rect.height}px;
      `;

      // Add click handler to show dialog when clicking on overlay
      const handleOverlayClick = (e: MouseEvent): void => {
        e.preventDefault();
        e.stopPropagation();

        // Emit data:conflict event to show dialog
        const conflictEvent: DataConflictEvent = {
          currentData: { ...component.state.currentData },
          newData: {},
          cancelled: false,
          cancel: () => {
            // User chose to keep editing - do nothing, overlays stay
          },
          proceed: () => {
            // User chose to discard - this will be handled by the form
            // The form's data:conflict handler should call clear(true) or reset(true)
          },
        };

        component.emit?.(FORM_EVENTS.DATA_CONFLICT, conflictEvent);
      };

      [topOverlay, bottomOverlay, leftOverlay, rightOverlay].forEach(
        (overlay) => {
          overlay.addEventListener("click", handleOverlayClick);
          document.body.appendChild(overlay);
          blockingOverlays.push(overlay);
        },
      );
    };

    /**
     * Removes blocking overlay elements
     */
    const removeBlockingOverlays = (): void => {
      if (blockingOverlays.length === 0) return;

      blockingOverlays.forEach((overlay) => {
        overlay.remove();
      });
      blockingOverlays = [];
    };

    /**
     * Updates blocking overlays position (e.g., on window resize)
     */
    const updateBlockingOverlays = (): void => {
      if (blockingOverlays.length === 0) return;

      const formElement = component.element;
      if (!formElement) return;

      const rect = formElement.getBoundingClientRect();

      // Update each overlay position (using fixed positioning, no scroll offset needed)
      const [topOverlay, bottomOverlay, leftOverlay, rightOverlay] =
        blockingOverlays;

      if (topOverlay) {
        topOverlay.style.height = `${rect.top}px`;
      }
      if (bottomOverlay) {
        bottomOverlay.style.top = `${rect.bottom}px`;
      }
      if (leftOverlay) {
        leftOverlay.style.top = `${rect.top}px`;
        leftOverlay.style.width = `${rect.left}px`;
        leftOverlay.style.height = `${rect.height}px`;
      }
      if (rightOverlay) {
        rightOverlay.style.top = `${rect.top}px`;
        rightOverlay.style.left = `${rect.right}px`;
        rightOverlay.style.height = `${rect.height}px`;
      }
    };

    /**
     * Updates blocking overlays based on modified state
     */
    const updateProtectionState = (modified: boolean): void => {
      if (modified) {
        createBlockingOverlays();
        // Add resize/scroll listeners to update overlay positions
        if (!resizeHandler) {
          resizeHandler = updateBlockingOverlays;
          window.addEventListener("resize", resizeHandler);
          window.addEventListener("scroll", resizeHandler);
        }
      } else {
        removeBlockingOverlays();
        // Remove resize/scroll listeners
        if (resizeHandler) {
          window.removeEventListener("resize", resizeHandler);
          window.removeEventListener("scroll", resizeHandler);
          resizeHandler = null;
        }
      }
    };

    // Listen for state changes to show/hide overlays
    component.on?.(FORM_EVENTS.STATE_CHANGE, (event: { modified: boolean }) => {
      updateProtectionState(event.modified);
    });

    // Also listen for reset event to remove overlays
    component.on?.(FORM_EVENTS.RESET, () => {
      updateProtectionState(false);
    });

    // Register cleanup when component is destroyed
    const originalLifecycle = component.lifecycle;
    if (originalLifecycle) {
      const originalDestroy = originalLifecycle.destroy;
      originalLifecycle.destroy = () => {
        // Clean up blocking overlays
        removeBlockingOverlays();
        if (resizeHandler) {
          window.removeEventListener("resize", resizeHandler);
          window.removeEventListener("scroll", resizeHandler);
          resizeHandler = null;
        }
        // Call original destroy
        originalDestroy?.();
      };
    }

    return component;
  };
};

export default withProtection;
