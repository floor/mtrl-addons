// src/core/viewport/features/momentum.ts

/**
 * Momentum Feature - Adds inertial scrolling to viewport
 * Provides smooth deceleration after touch/mouse drag gestures
 */

import type { ViewportComponent, ViewportContext } from "../types";
import { VIEWPORT_CONSTANTS } from "../constants";

interface MomentumConfig {
  enabled?: boolean;
  deceleration?: number;
  minVelocity?: number;
  minDuration?: number;
  minVelocityThreshold?: number;
}

/**
 * Adds momentum scrolling to viewport
 */
export const withMomentum = (config: MomentumConfig = {}) => {
  return <T extends ViewportContext & ViewportComponent>(component: T): T => {
    const {
      enabled = VIEWPORT_CONSTANTS.MOMENTUM.ENABLED,
      deceleration = VIEWPORT_CONSTANTS.MOMENTUM.DECELERATION_FACTOR,
      minVelocity = VIEWPORT_CONSTANTS.MOMENTUM.MIN_VELOCITY,
      minDuration = VIEWPORT_CONSTANTS.MOMENTUM.MIN_DURATION,
      minVelocityThreshold = VIEWPORT_CONSTANTS.MOMENTUM.MIN_VELOCITY_THRESHOLD,
    } = config;

    // Always apply the feature, but check isEnabled at runtime

    // Momentum state
    let momentumAnimationId: number | null = null;
    let isTouching = false;
    let isMouseDragging = false;
    let lastTouchPosition = 0;
    let lastMousePosition = 0;
    let touchStartTime = 0;
    let viewportState: any;
    let scrollingState: any;
    let isEnabled = enabled; // Track current enabled state

    // Get references after initialization
    const originalInitialize = component.viewport.initialize;
    component.viewport.initialize = () => {
      originalInitialize();

      // Get viewport and scrolling states
      viewportState = (component.viewport as any).state;
      scrollingState = (component.viewport as any).scrollingState;
    };

    // Start momentum animation
    const startMomentum = (initialVelocity: number) => {
      // Cancel any existing momentum
      if (momentumAnimationId) {
        cancelAnimationFrame(momentumAnimationId);
      }

      let velocity = initialVelocity;

      const animate = () => {
        // Apply deceleration
        velocity *= deceleration;

        // Stop if velocity is too small
        if (Math.abs(velocity) < minVelocity) {
          momentumAnimationId = null;
          // Reset velocity in scrolling feature
          if (scrollingState) {
            scrollingState.setVelocityToZero?.();
          }
          return;
        }

        // Calculate scroll delta (velocity is in px/ms, so multiply by frame time)
        const frameDelta = velocity * VIEWPORT_CONSTANTS.MOMENTUM.FRAME_TIME;

        // Use scrolling feature's API to update position
        if (component.viewport.scrollBy) {
          component.viewport.scrollBy(frameDelta);

          // Continue animation
          momentumAnimationId = requestAnimationFrame(animate);
        } else {
          // No scrollBy method, stop momentum
          momentumAnimationId = null;
        }
      };

      momentumAnimationId = requestAnimationFrame(animate);
    };

    // Touch event handlers
    const handleTouchStart = (e: TouchEvent) => {
      isTouching = true;
      const touch = e.touches[0];
      const orientation = viewportState?.orientation || "vertical";
      lastTouchPosition =
        orientation === "vertical" ? touch.clientY : touch.clientX;
      touchStartTime = Date.now();

      // Cancel any ongoing momentum
      if (momentumAnimationId) {
        cancelAnimationFrame(momentumAnimationId);
        momentumAnimationId = null;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isTouching) return;

      e.preventDefault(); // Prevent native scrolling

      const touch = e.touches[0];
      const orientation = viewportState?.orientation || "vertical";
      const currentPosition =
        orientation === "vertical" ? touch.clientY : touch.clientX;
      const delta = lastTouchPosition - currentPosition; // Inverted for natural scrolling
      lastTouchPosition = currentPosition;

      // Use scrolling feature's API
      if (component.viewport.scrollBy) {
        component.viewport.scrollBy(delta);
      }
    };

    const handleTouchEnd = () => {
      if (!isTouching) return;
      isTouching = false;

      const touchEndTime = Date.now();
      const touchDuration = touchEndTime - touchStartTime;

      // Get current velocity from scrolling feature
      const velocity = component.viewport.getVelocity?.() || 0;

      // Only start momentum if the touch was quick enough and we have velocity
      if (
        touchDuration < minDuration &&
        Math.abs(velocity) > minVelocityThreshold
      ) {
        startMomentum(velocity);
      }
    };

    // Mouse event handlers for desktop
    const handleMouseDown = (e: MouseEvent) => {
      isMouseDragging = true;
      const orientation = viewportState?.orientation || "vertical";
      lastMousePosition = orientation === "vertical" ? e.clientY : e.clientX;
      touchStartTime = Date.now();

      // Cancel any ongoing momentum
      if (momentumAnimationId) {
        cancelAnimationFrame(momentumAnimationId);
        momentumAnimationId = null;
      }

      // Prevent text selection
      e.preventDefault();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isMouseDragging) return;

      const orientation = viewportState?.orientation || "vertical";
      const currentPosition =
        orientation === "vertical" ? e.clientY : e.clientX;
      const delta = lastMousePosition - currentPosition;
      lastMousePosition = currentPosition;

      // Use scrolling feature's API
      if (component.viewport.scrollBy) {
        component.viewport.scrollBy(delta);
      }
    };

    const handleMouseUp = () => {
      if (!isMouseDragging) return;
      isMouseDragging = false;

      const mouseUpTime = Date.now();
      const dragDuration = mouseUpTime - touchStartTime;

      // Get current velocity from scrolling feature
      const velocity = component.viewport.getVelocity?.() || 0;

      // Start momentum for quick drags
      if (
        dragDuration < minDuration &&
        Math.abs(velocity) > minVelocityThreshold
      ) {
        startMomentum(velocity);
      }
    };

    // Override initialize to add event listeners
    const originalInit = component.viewport.initialize;
    component.viewport.initialize = () => {
      originalInit();

      const viewportElement =
        (component as any).viewportElement ||
        (component.viewport as any).state?.viewportElement;

      if (viewportElement) {
        // Touch events
        viewportElement.addEventListener("touchstart", handleTouchStart, {
          passive: true,
        });
        viewportElement.addEventListener("touchmove", handleTouchMove, {
          passive: false,
        });
        viewportElement.addEventListener("touchend", handleTouchEnd, {
          passive: true,
        });

        // Mouse events for desktop dragging
        viewportElement.addEventListener("mousedown", handleMouseDown);
        viewportElement.addEventListener("mousemove", handleMouseMove);
        viewportElement.addEventListener("mouseup", handleMouseUp);
        viewportElement.addEventListener("mouseleave", handleMouseUp);

        // Store reference for cleanup
        (component as any)._momentumViewportElement = viewportElement;
      }
    };

    // Clean up on destroy
    if ("destroy" in component && typeof component.destroy === "function") {
      const originalDestroy = component.destroy;
      component.destroy = () => {
        // Remove event listeners
        const viewportElement = (component as any)._momentumViewportElement;
        if (viewportElement) {
          viewportElement.removeEventListener("touchstart", handleTouchStart);
          viewportElement.removeEventListener("touchmove", handleTouchMove);
          viewportElement.removeEventListener("touchend", handleTouchEnd);
          viewportElement.removeEventListener("mousedown", handleMouseDown);
          viewportElement.removeEventListener("mousemove", handleMouseMove);
          viewportElement.removeEventListener("mouseup", handleMouseUp);
          viewportElement.removeEventListener("mouseleave", handleMouseUp);
        }

        // Cancel momentum animation
        if (momentumAnimationId) {
          cancelAnimationFrame(momentumAnimationId);
          momentumAnimationId = null;
        }

        originalDestroy();
      };
    }

    return component;
  };
};
