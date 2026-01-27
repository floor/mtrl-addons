// src/components/vlist/features/keyboard.ts

/**
 * Keyboard Navigation Feature for VList
 *
 * Implements Material Design 3 accessibility guidelines for lists:
 * - Arrow keys (Up/Down/Left/Right) navigate between items with wrapping
 * - Space/Enter activates/selects the focused item
 * - Tab moves focus to/from the list
 * - Home/End jump to first/last item
 * - Page Up/Down skip multiple items
 *
 * @see https://m3.material.io/components/lists/accessibility
 */

import type {
  VListConfig,
  VListComponent,
  VListItem,
  ListKeyboardConfig,
} from "../types";
import { PREFIX, addClass, removeClass } from "mtrl";

/**
 * Class name for keyboard focus styling
 */
const KEYBOARD_FOCUS_CLASS = "mtrl-vlist--keyboard-focus";

/**
 * ARIA roles and attributes for accessibility
 * Following MD3 Web implementation:
 * - Container role: listbox
 * - List item role: option
 * - State: aria-selected
 */
const ARIA = {
  ROLE_LISTBOX: "listbox",
  ROLE_OPTION: "option",
  ARIA_ACTIVEDESCENDANT: "aria-activedescendant",
  ARIA_SELECTED: "aria-selected",
  ARIA_LABEL: "aria-label",
  ARIA_MULTISELECTABLE: "aria-multiselectable",
};

/**
 * Get the viewport items container
 */
const getItemsContainer = (
  element: HTMLElement | undefined,
): HTMLElement | null => {
  return element?.querySelector(`.${PREFIX}-viewport-items`) || null;
};

/**
 * Get all rendered item elements
 */
const getRenderedItems = (container: HTMLElement | null): HTMLElement[] => {
  if (!container) return [];
  return Array.from(
    container.querySelectorAll(`.${PREFIX}-viewport-item[data-index]`),
  );
};

/**
 * Adds keyboard navigation and accessibility to VList component
 */
export const withKeyboard = <T extends VListItem = VListItem>(
  config: VListConfig<T>,
) => {
  return (component: VListComponent<T>): VListComponent<T> => {
    // Only enable keyboard if selection is enabled
    const selectionEnabled =
      config.selection?.enabled && config.selection?.mode !== "none";
    const keyboardConfig = config.keyboard || {};
    const enabled = keyboardConfig.enabled ?? selectionEnabled;

    if (!enabled) {
      return component;
    }

    // MD3 specifies that arrow keys should wrap by default
    const options = {
      homeEnd: keyboardConfig.homeEnd ?? true,
      pageUpDown: keyboardConfig.pageUpDown ?? true,
      pageSize: keyboardConfig.pageSize ?? 10,
      typeAhead: keyboardConfig.typeAhead ?? false,
      typeAheadTimeout: keyboardConfig.typeAheadTimeout ?? 500,
      wrap: keyboardConfig.wrap ?? true, // MD3: wraps to top/bottom
      onNavigate: keyboardConfig.onNavigate,
    };

    // Type-ahead state
    let typeAheadBuffer = "";
    let typeAheadTimer: ReturnType<typeof setTimeout> | null = null;

    // Track if last interaction was mouse (for focus styling)
    let lastMouseDownTime = 0;

    // Track if scrollbar is being dragged (to prevent focus interference)
    let isScrollbarDragging = false;

    /**
     * Setup ARIA attributes for accessibility
     */
    const setupAccessibility = () => {
      const element = component.element;
      if (!element) return;

      // Set listbox role on the component
      element.setAttribute("role", ARIA.ROLE_LISTBOX);

      // Set multiselectable if in multiple selection mode
      if (config.selection?.mode === "multiple") {
        element.setAttribute(ARIA.ARIA_MULTISELECTABLE, "true");
      }

      // Make focusable
      if (!element.hasAttribute("tabindex")) {
        element.setAttribute("tabindex", "0");
      }

      // Set aria-label if not present
      if (!element.hasAttribute(ARIA.ARIA_LABEL)) {
        element.setAttribute(ARIA.ARIA_LABEL, "List");
      }
    };

    /**
     * Update ARIA attributes on rendered items
     */
    const updateItemAccessibility = () => {
      const container = getItemsContainer(component.element);
      const items = getRenderedItems(container);
      const enhancedComponent = component as any;
      const selectedIndices = enhancedComponent.getSelectedIndices?.() || [];

      items.forEach((item) => {
        const index = parseInt(item.dataset.index || "-1", 10);
        if (index < 0) return;

        // Set option role
        item.setAttribute("role", ARIA.ROLE_OPTION);

        // Set unique ID for aria-activedescendant
        const itemId = `${PREFIX}-vlist-item-${index}`;
        item.id = itemId;

        // Set selected state
        const isSelected = selectedIndices.includes(index);
        item.setAttribute(ARIA.ARIA_SELECTED, String(isSelected));
      });

      // Update aria-activedescendant on container
      if (selectedIndices.length > 0 && component.element) {
        const activeId = `${PREFIX}-vlist-item-${selectedIndices[0]}`;
        component.element.setAttribute(ARIA.ARIA_ACTIVEDESCENDANT, activeId);
      } else {
        component.element?.removeAttribute(ARIA.ARIA_ACTIVEDESCENDANT);
      }
    };

    /**
     * Handle type-ahead search
     */
    const handleTypeAhead = (char: string) => {
      if (!options.typeAhead) return false;

      // Clear previous timer
      if (typeAheadTimer) {
        clearTimeout(typeAheadTimer);
      }

      // Add character to buffer
      typeAheadBuffer += char.toLowerCase();

      // Set timer to clear buffer
      typeAheadTimer = setTimeout(() => {
        typeAheadBuffer = "";
      }, options.typeAheadTimeout);

      // Search for matching item
      const enhancedComponent = component as any;
      const items = enhancedComponent.getItems?.() || [];
      const selectedIndices = enhancedComponent.getSelectedIndices?.() || [];
      const startIndex =
        selectedIndices.length > 0 ? selectedIndices[0] + 1 : 0;

      // Search from current position to end, then wrap to beginning
      for (let i = 0; i < items.length; i++) {
        const index = (startIndex + i) % items.length;
        const item = items[index];
        if (!item) continue;

        // Get searchable text from item
        const text = getItemText(item).toLowerCase();
        if (text.startsWith(typeAheadBuffer)) {
          enhancedComponent.selectAtIndex?.(index);
          options.onNavigate?.(index, "typeahead");
          return true;
        }
      }

      return false;
    };

    /**
     * Get searchable text from an item
     */
    const getItemText = (item: any): string => {
      if (typeof item === "string") return item;
      return item.title || item.name || item.label || item.text || "";
    };

    /**
     * Handle keyboard events
     *
     * MD3 Keyboard Navigation:
     * - Tab: Move focus to first/last list item or outside
     * - Down/Right: Move to next element; wraps to top if at end
     * - Up/Left: Move to previous element; wraps to bottom if at start
     * - Space/Enter: Select a list item
     */
    const handleKeyDown = async (e: KeyboardEvent) => {
      const enhancedComponent = component as any;
      const totalItems = enhancedComponent.getItemCount?.() || 0;

      if (totalItems === 0) return;

      const selectedIndices = enhancedComponent.getSelectedIndices?.() || [];
      const currentIndex = selectedIndices.length > 0 ? selectedIndices[0] : -1;

      let targetIndex: number | null = null;
      let handled = false;

      // Helper to mark event as handled and stop propagation
      const markHandled = () => {
        handled = true;
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      };

      switch (e.key) {
        // MD3: Down/Right move to next element
        case "ArrowDown":
        case "ArrowRight":
          markHandled();
          if (currentIndex < 0) {
            targetIndex = 0;
          } else if (currentIndex < totalItems - 1) {
            targetIndex = currentIndex + 1;
          } else if (options.wrap) {
            // MD3: wraps to top if at end
            targetIndex = 0;
          }
          break;

        // MD3: Up/Left move to previous element
        case "ArrowUp":
        case "ArrowLeft":
          markHandled();
          if (currentIndex < 0) {
            targetIndex = totalItems - 1;
          } else if (currentIndex > 0) {
            targetIndex = currentIndex - 1;
          } else if (options.wrap) {
            // MD3: wraps to bottom if at start
            targetIndex = totalItems - 1;
          }
          break;

        case "Home":
          if (options.homeEnd) {
            markHandled();
            targetIndex = 0;
          }
          break;

        case "End":
          if (options.homeEnd) {
            markHandled();
            targetIndex = totalItems - 1;
          }
          break;

        case "PageDown":
          if (options.pageUpDown) {
            markHandled();
            if (currentIndex < 0) {
              targetIndex = Math.min(options.pageSize - 1, totalItems - 1);
            } else {
              targetIndex = Math.min(
                currentIndex + options.pageSize,
                totalItems - 1,
              );
            }
          }
          break;

        case "PageUp":
          if (options.pageUpDown) {
            markHandled();
            if (currentIndex < 0) {
              targetIndex = 0;
            } else {
              targetIndex = Math.max(currentIndex - options.pageSize, 0);
            }
          }
          break;

        // MD3: Space/Enter select a list item
        case " ":
        case "Enter":
          markHandled();
          if (currentIndex >= 0) {
            if (config.selection?.mode === "multiple") {
              // In multiple mode, toggle selection
              const isSelected = enhancedComponent.isSelected?.(currentIndex);
              if (isSelected) {
                enhancedComponent.deselectItems?.([currentIndex]);
              } else {
                enhancedComponent.selectItems?.([currentIndex]);
              }
            } else {
              // In single mode, ensure item is selected and emit activation event
              enhancedComponent.selectItems?.([currentIndex]);
              // Emit activate event for single-action lists
              component.emit?.("item:activate", {
                index: currentIndex,
                item: enhancedComponent.getItems?.()?.[currentIndex],
              });
            }
          }
          break;

        case "a":
        case "A":
          // Ctrl+A / Cmd+A - select all in multiple mode
          if (
            (e.ctrlKey || e.metaKey) &&
            config.selection?.mode === "multiple"
          ) {
            markHandled();
            const allIndices = Array.from({ length: totalItems }, (_, i) => i);
            enhancedComponent.selectItems?.(allIndices);
          }
          break;

        case "Escape":
          // Clear selection
          markHandled();
          enhancedComponent.clearSelection?.();
          break;

        default:
          // Type-ahead for printable characters
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            handled = handleTypeAhead(e.key);
          }
          break;
      }

      // Navigate to target index
      if (targetIndex !== null && targetIndex !== currentIndex) {
        // Handle shift+arrow for range selection in multiple mode
        if (
          e.shiftKey &&
          config.selection?.mode === "multiple" &&
          currentIndex >= 0
        ) {
          const start = Math.min(currentIndex, targetIndex);
          const end = Math.max(currentIndex, targetIndex);
          const rangeIndices = Array.from(
            { length: end - start + 1 },
            (_, i) => start + i,
          );
          enhancedComponent.selectItems?.(rangeIndices);
        } else {
          // Await selectAtIndex for proper scrolling and data loading
          // This is important for Home/End/PageUp/PageDown which may jump to unloaded items
          await enhancedComponent.selectAtIndex?.(targetIndex);
        }
        options.onNavigate?.(targetIndex, e.key);
      }

      // Emit keyboard event for external handling
      if (handled) {
        component.emit?.("keyboard:navigate", {
          key: e.key,
          index: targetIndex ?? currentIndex,
          shiftKey: e.shiftKey,
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey,
        });
      }
    };

    /**
     * Handle focus event
     *
     * MD3 Focus Behavior for Single-Action Lists:
     * - The first element in a list should receive focus by default
     * - If the list has a selected element, focus goes to the selected item instead
     */
    const handleFocus = () => {
      const enhancedComponent = component as any;
      const selectedIndices = enhancedComponent.getSelectedIndices?.() || [];
      const totalItems = enhancedComponent.getItemCount?.() || 0;

      // Add keyboard focus class only if focus was NOT from a recent mouse click
      // 100ms threshold accounts for the delay between mousedown and focus
      const wasMouseClick = Date.now() - lastMouseDownTime < 100;
      if (!wasMouseClick && component.element) {
        addClass(component.element, KEYBOARD_FOCUS_CLASS);
      }

      if (totalItems === 0) return;

      // Skip auto-scroll/select behavior if scrollbar is being dragged
      // This prevents scroll reset when interacting with scrollbar
      if (isScrollbarDragging) {
        component.emit?.("keyboard:focus", {});
        return;
      }

      // MD3: If list has selected element, focus goes to selected item
      // Otherwise, first element receives focus
      if (selectedIndices.length === 0) {
        enhancedComponent.selectAtIndex?.(0);
      } else {
        // Only scroll to selected item if it's not already fully visible
        // This prevents unwanted scrolling when clicking on a visible item
        const selectedIndex = selectedIndices[0];
        const isVisible = enhancedComponent.isItemFullyVisible?.(selectedIndex);
        if (!isVisible && enhancedComponent.viewport?.scrollToIndex) {
          enhancedComponent.viewport.scrollToIndex(selectedIndex);
        }
      }

      component.emit?.("keyboard:focus", {});
    };

    /**
     * Handle blur event
     */
    const handleBlur = () => {
      // Remove keyboard focus class
      if (component.element) {
        removeClass(component.element, KEYBOARD_FOCUS_CLASS);
      }

      // Clear type-ahead on blur
      typeAheadBuffer = "";
      if (typeAheadTimer) {
        clearTimeout(typeAheadTimer);
        typeAheadTimer = null;
      }

      component.emit?.("keyboard:blur", {});
    };

    /**
     * Setup event listeners
     */
    const setup = () => {
      setupAccessibility();

      if (component.element) {
        component.element.addEventListener("keydown", handleKeyDown);
        component.element.addEventListener("focus", handleFocus);
        component.element.addEventListener("blur", handleBlur);

        // Track mouse clicks to distinguish from keyboard focus
        component.element.addEventListener("mousedown", () => {
          lastMouseDownTime = Date.now();
        });
      }

      // Listen for scrollbar drag events to prevent focus interference
      (component as any).on?.("viewport:drag-start", () => {
        isScrollbarDragging = true;
      });
      (component as any).on?.("viewport:drag-end", () => {
        // Delay clearing the flag to ensure focus event is handled first
        setTimeout(() => {
          isScrollbarDragging = false;
        }, 50);
      });

      if (component.element) {
        // Add click handler to focus the list when clicked
        // But don't steal focus from interactive elements like search inputs or scrollbar
        component.element.addEventListener("click", (e: MouseEvent) => {
          const target = e.target as HTMLElement;

          // Don't focus the list if clicking on an input, button, or interactive element
          if (
            target.closest(
              'input, button, select, textarea, [contenteditable], .mtrl-search, .mtrl-textfield, .mtrl-select, [class*="filter"]',
            )
          ) {
            return;
          }

          // Don't focus the list if clicking on the scrollbar
          // This prevents scroll reset when dragging the scrollbar
          if (target.closest(".mtrl-viewport-scrollbar")) {
            return;
          }

          component.element?.focus();
        });
      }

      // Update ARIA attributes when items are rendered
      (component as any).on?.(
        "viewport:items-rendered",
        updateItemAccessibility,
      );
      (component as any).on?.("viewport:rendered", updateItemAccessibility);

      // Update ARIA when selection changes
      (component as any).on?.("selection:change", updateItemAccessibility);
    };

    // Initialize after component is ready
    setTimeout(setup, 0);

    // Cleanup on destroy
    const originalDestroy = component.destroy;
    component.destroy = () => {
      if (component.element) {
        component.element.removeEventListener("keydown", handleKeyDown);
        component.element.removeEventListener("focus", handleFocus);
        component.element.removeEventListener("blur", handleBlur);
      }
      if (typeAheadTimer) {
        clearTimeout(typeAheadTimer);
      }
      originalDestroy?.();
    };

    // Return enhanced component with keyboard API
    return {
      ...component,

      /**
       * Focus the list for keyboard navigation
       */
      focus(): void {
        component.element?.focus();
      },

      /**
       * Blur the list
       */
      blur(): void {
        component.element?.blur();
      },

      /**
       * Check if list has focus
       */
      hasFocus(): boolean {
        return document.activeElement === component.element;
      },

      /**
       * Select first item
       */
      async selectFirst(): Promise<boolean> {
        const enhancedComponent = component as any;
        const totalItems = enhancedComponent.getItemCount?.() || 0;
        if (totalItems > 0) {
          return enhancedComponent.selectAtIndex?.(0) ?? false;
        }
        return false;
      },

      /**
       * Select last item
       */
      async selectLast(): Promise<boolean> {
        const enhancedComponent = component as any;
        const totalItems = enhancedComponent.getItemCount?.() || 0;
        if (totalItems > 0) {
          return enhancedComponent.selectAtIndex?.(totalItems - 1) ?? false;
        }
        return false;
      },
    };
  };
};

export default withKeyboard;
