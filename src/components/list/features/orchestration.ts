import type { ListConfig, ListComponent, ListState } from "../types";
import type { BaseComponent, ElementComponent } from "mtrl/src/core/compose";
import {
  getDefaultTemplate,
  getCollectionConfig,
  getListManagerConfig,
} from "../config";
import { createDataCollection } from "../../../core/collection";
import type { CollectionItem } from "../../../core/collection/types";
import { createListManager } from "../../../core/list-manager";
import type { VirtualItem } from "../../../core/list-manager/types";
import { LIST_CLASSES } from "../constants";

/**
 * Orchestration feature that coordinates Collection (Data) and List Manager (Performance) layers
 * This is the heart of the 3-layer architecture
 */
export const withOrchestration =
  <T extends CollectionItem = CollectionItem>(config: ListConfig<T>) =>
  <C extends BaseComponent & ElementComponent>(
    component: C
  ): C & Partial<ListComponent<T>> => {
    // Initialize state
    const state: ListState = {
      isLoading: false,
      error: null,
      isEmpty: true,
      scrollTop: 0,
      visibleRange: { start: 0, end: 0, count: 0 },
      renderRange: { start: 0, end: 0, count: 0 },
      selectedIndices: config.selection?.selectedIndices || [],
      totalItems: 0,
      isVirtual: config.scroll?.virtual ?? true,
      animationEnabled: true, // Kept for backward compatibility, but delegated to List Manager
    };

    // Track pending scroll operations
    let pendingScrollOperation: {
      type: "scrollToIndex" | "scrollToPage";
      index: number;
      alignment: string;
      animate?: boolean;
    } | null = null;

    // Get template function early
    const template = config.template || getDefaultTemplate<T>();

    // Create Collection (Data Layer)
    const collectionConfig = getCollectionConfig(config);
    const collection = createDataCollection<T>(collectionConfig as any);

    // Create List Manager (Performance Layer)
    const listManagerConfig = getListManagerConfig(config);
    const listManager = createListManager(listManagerConfig);

    // Set initial scroll animation state from config
    if (config.scroll?.animation !== undefined) {
      listManager.setScrollAnimation(config.scroll.animation);
      console.log(
        `🎬 [ORCHESTRATION] Set initial scroll animation to: ${config.scroll.animation}`
      );
    }

    // Set template on List Manager immediately if available
    if (listManager.setTemplate && template) {
      console.log(
        `🎨 [ORCHESTRATION] Setting template on List Manager during initialization`
      );
      listManager.setTemplate(
        template as (item: VirtualItem, index: number) => string | HTMLElement
      );
    }

    // Add fallback for missing methods
    if (!listManager.getViewportInfo) {
      listManager.getViewportInfo = () => ({
        width: 0,
        height: 0,
        scrollTop: 0,
        scrollLeft: 0,
        startIndex: 0,
        endIndex: 0,
        visibleItems: [],
        bufferStart: 0,
        bufferEnd: 0,
        totalHeight: 0,
        totalWidth: 0,
      });
    }

    // Note: Render container is now managed by List Manager's rendering plugin
    // No need to create it manually in orchestration

    /**
     * Apply orientation styling to the list container
     */
    const applyOrientationStyling = (): void => {
      const orientation = config.orientation?.orientation || "vertical";
      const reverse = config.orientation?.reverse || false;
      const crossAxisAlignment =
        config.orientation?.crossAxisAlignment || "stretch";

      // Remove existing orientation classes
      component.element.classList.remove(
        `${config.prefix || "mtrl"}-list--horizontal`,
        `${config.prefix || "mtrl"}-list--vertical`,
        `${config.prefix || "mtrl"}-list--reversed`
      );

      // Add orientation class
      component.element.classList.add(
        `${config.prefix || "mtrl"}-list--${orientation}`
      );

      // Add reverse class if needed
      if (reverse) {
        component.element.classList.add(
          `${config.prefix || "mtrl"}-list--reversed`
        );
      }

      // Apply CSS styles for orientation
      const isHorizontal = orientation === "horizontal";
      const styles = isHorizontal
        ? {
            display: "flex",
            flexDirection: reverse ? "row-reverse" : "row",
            overflowX: "auto",
            overflowY: "hidden",
            alignItems: getCSSAlignment(crossAxisAlignment),
            width: "100%",
          }
        : {
            display: "block",
            flexDirection: reverse ? "column-reverse" : "column",
            overflowX: "hidden",
            overflowY: "auto",
            height: "100%",
          };

      Object.assign(component.element.style, styles);
    };

    /**
     * Convert cross-axis alignment to CSS value
     */
    const getCSSAlignment = (alignment: string): string => {
      switch (alignment) {
        case "start":
          return "flex-start";
        case "center":
          return "center";
        case "end":
          return "flex-end";
        case "stretch":
          return "stretch";
        default:
          return "stretch";
      }
    };

    /**
     * Render items - now delegated to List Manager
     */
    const renderItems = (): void => {
      const { renderRange } = state;

      console.log(
        `🎨 [ORCHESTRATION] Delegating rendering to List Manager for range:`,
        renderRange
      );

      // Delegate to List Manager's rendering plugin
      if (listManager.renderItems) {
        listManager.renderItems(renderRange);
      } else {
        console.warn(
          `⚠️ [ORCHESTRATION] List Manager doesn't have renderItems method`
        );
      }
    };

    /**
     * Handle item click
     */
    const handleItemClick = (
      item: T,
      index: number,
      event: MouseEvent
    ): void => {
      // Handle selection
      if (config.selection?.enabled) {
        handleItemSelection(index);
      }

      // Emit click event
      const originalEmit = (component as any).emit;
      if (originalEmit) {
        originalEmit.call(component, "item:click", { item, index, event });
      }
      config.on?.onItemClick?.(item, index, event);

      // Emit selection events
      const items = collection.getItems();
      const selectedItems = state.selectedIndices
        .map((i) => items[i])
        .filter(Boolean);

      if (originalEmit) {
        originalEmit.call(component, "selection:change", {
          selectedItems,
          selectedIndices: [...state.selectedIndices],
        });
      }

      // Note: Additional event emissions are handled by the orchestration layer
    };

    /**
     * Handle item selection
     */
    const handleItemSelection = (index: number): void => {
      const { mode } = config.selection || {};
      const isSelected = state.selectedIndices.includes(index);

      if (mode === "single") {
        state.selectedIndices = isSelected ? [] : [index];
      } else if (mode === "multiple") {
        if (isSelected) {
          state.selectedIndices = state.selectedIndices.filter(
            (i) => i !== index
          );
        } else {
          state.selectedIndices.push(index);
        }
      }

      // Update visual selection
      updateItemSelection();

      // Emit selection events
      const items = collection.getItems();
      const selectedItems = state.selectedIndices
        .map((i) => items[i])
        .filter(Boolean);

      if (originalEmit) {
        originalEmit.call(component, "selection:change", {
          selectedItems,
          selectedIndices: [...state.selectedIndices],
        });
      }

      config.on?.onSelectionChange?.(selectedItems, state.selectedIndices);
    };

    /**
     * Update visual selection state
     */
    const updateItemSelection = (): void => {
      const itemElements = component.element.querySelectorAll(`[data-index]`);

      itemElements.forEach((element) => {
        const index = parseInt(element.getAttribute("data-index") || "0", 10);
        const isSelected = state.selectedIndices.includes(index);

        element.classList.toggle(
          `${config.prefix || "mtrl"}-list-item--selected`,
          isSelected
        );
      });
    };

    /**
     * Handle Collection events
     */
    const setupCollectionEvents = (): void => {
      // Subscribe to collection events using the observer pattern
      collection.subscribe((payload) => {
        console.log(`📡 [ORCHESTRATION] Collection event:`, payload);

        // Handle different event types
        switch (payload.event) {
          case "items:loaded":
            const items = payload.data?.items || [];
            console.log(
              `📥 [ORCHESTRATION] items:loaded event received:`,
              items.length,
              "items"
            );

            state.totalItems = items.length;
            state.isEmpty = items.length === 0;
            state.isLoading = false;

            // Pass items and template to List Manager
            console.log(
              `🔄 [ORCHESTRATION] Passing ${items.length} items to List Manager`
            );

            // CRITICAL: Set total dataset size FIRST before setting items
            const totalDatasetSize = collection.getTotalCount?.() || 0;
            console.log(
              `🔧 [ORCHESTRATION] Setting total dataset size FIRST: ${totalDatasetSize} items`
            );
            if (listManager.setTotalItems) {
              listManager.setTotalItems(totalDatasetSize);
            }

            // THEN set the actual loaded items
            if (listManager.setItems) {
              listManager.setItems(items);
            } else {
              console.error(
                `❌ [ORCHESTRATION] listManager.setItems is not available!`
              );
            }

            // Set template on List Manager if it has the method
            if (listManager.setTemplate && template) {
              listManager.setTemplate(
                template as (
                  item: VirtualItem,
                  index: number
                ) => string | HTMLElement
              );
            }

            // For initial load, let the List Manager handle viewport calculations
            console.log(
              `🎯 [ORCHESTRATION] Checking if this is initial load...`
            );
            if (state.visibleRange.count === 0) {
              console.log(
                `🏁 [ORCHESTRATION] Initial load detected - delegating to List Manager`
              );

              // Set virtual total height for proper scrollbar sizing FIRST
              setVirtualTotalHeight();

              // Let the List Manager/virtual viewport calculate the ranges
              // The virtual viewport will emit virtual:range:changed event with proper ranges
              console.log(
                `📊 [ORCHESTRATION] Initial load: virtual viewport will emit range events, no manual rendering needed`
              );

              // Don't set ranges manually - let the virtual viewport handle it
              // The setItems call above will trigger the virtual viewport to calculate ranges
              // and emit virtual:range:changed event
              // The virtual:range:changed event handler will handle rendering
            } else {
              console.log(
                `🔄 [ORCHESTRATION] Subsequent load - rendering with current viewport`
              );

              // Check if there's a pending scroll operation
              if (pendingScrollOperation) {
                console.log(
                  `📍 [ORCHESTRATION] Applying pending scroll operation:`,
                  pendingScrollOperation
                );

                if (
                  pendingScrollOperation.type === "scrollToIndex" ||
                  pendingScrollOperation.type === "scrollToPage"
                ) {
                  handleScrollToIndexViewportUpdate(
                    pendingScrollOperation.index,
                    pendingScrollOperation.alignment,
                    pendingScrollOperation.animate
                  );
                }

                // Clear pending operation
                pendingScrollOperation = null;
              } else {
                // Always render when new data is loaded, even if viewport is already set
                renderItems();
              }
            }

            // Emit data loaded event
            if (originalEmit) {
              originalEmit.call(component, "data:loaded", {
                items,
                total: items.length,
              });
            }
            break;

          case "loading:start":
            state.isLoading = true;
            if (originalEmit) {
              originalEmit.call(component, "loading:change", {
                isLoading: true,
              });
            }
            break;

          case "loading:end":
            state.isLoading = false;
            if (originalEmit) {
              originalEmit.call(component, "loading:change", {
                isLoading: false,
              });
            }
            break;

          case "error:occurred":
            state.error = payload.data?.error;
            state.isLoading = false;
            if (originalEmit) {
              originalEmit.call(component, "error", {
                error: payload.data?.error,
              });
            }
            break;

          default:
            // Handle other events if needed
            console.log(
              `📡 [ORCHESTRATION] Unhandled collection event: ${payload.event}`
            );
            break;
        }
      });
    };

    /**
     * Handle scroll to index viewport updates - now delegated to List Manager
     */
    const handleScrollToIndexViewportUpdate = (
      index: number,
      alignment: string = "start",
      animate?: boolean
    ): void => {
      console.log(
        `🎯 [VIEWPORT-UPDATE] Delegating viewport calculation to List Manager for index ${index}, alignment: ${alignment}`
      );

      // Set total items on List Manager for viewport calculations
      const totalItems = collection.getTotalCount?.() || 0;
      console.log(
        `🎯 [VIEWPORT-UPDATE] Using total dataset size: ${totalItems} items`
      );
      if (listManager.setTotalItems) {
        listManager.setTotalItems(totalItems);
      }

      // Delegate to List Manager's viewport management
      if (listManager.handleScrollToIndex) {
        listManager.handleScrollToIndex(index, alignment as any, animate);
      } else {
        console.warn(
          `⚠️ [VIEWPORT-UPDATE] List Manager doesn't have handleScrollToIndex method`
        );
        return;
      }

      // Update orchestration state from List Manager
      if (
        listManager.getVisibleRange &&
        listManager.getRenderRange &&
        listManager.getScrollTop
      ) {
        state.visibleRange = listManager.getVisibleRange();
        state.renderRange = listManager.getRenderRange();
        state.scrollTop = listManager.getScrollTop();

        console.log(
          `📊 [VIEWPORT-UPDATE] Updated orchestration state from List Manager:`,
          {
            scrollTop: state.scrollTop,
            visibleRange: state.visibleRange,
            renderRange: state.renderRange,
          }
        );
      }

      // Trigger re-render with new range (only if we have valid ranges)
      if (state.renderRange && typeof state.renderRange.start === "number") {
        renderItems();
      } else {
        console.log(
          `🔍 [ORCHESTRATION] Skipping render after viewport update - invalid range:`,
          state.renderRange
        );
      }

      // Emit viewport change event
      if (originalEmit) {
        originalEmit.call(component, "viewport:change", {
          visibleRange: state.visibleRange,
        });
      }
      config.on?.onViewportChange?.(state.visibleRange);
    };

    /**
     * Set virtual total height - now delegated to List Manager
     */
    const setVirtualTotalHeight = (): void => {
      console.log(
        `🔧 [VIRTUAL-HEIGHT] Delegating to List Manager viewport manager`
      );

      // Set total dataset size for proper scrollbar representation
      const totalItems = collection.getTotalCount?.() || 0;
      console.log(
        `🔧 [VIRTUAL-HEIGHT] Setting total dataset size: ${totalItems} items`
      );
      if (listManager.setTotalItems) {
        listManager.setTotalItems(totalItems);
      }

      // Delegate to List Manager's viewport management
      if (listManager.setupVirtualContainer) {
        listManager.setupVirtualContainer();
      } else {
        console.warn(
          `⚠️ [VIRTUAL-HEIGHT] List Manager doesn't have setupVirtualContainer method`
        );
      }
    };

    /**
     * Handle List Manager events
     */
    const setupListManagerEvents = (): void => {
      console.log(`🔧 [ORCHESTRATION] Setting up List Manager event handlers`);

      // Subscribe to list manager events using the observer pattern
      console.log(`🔧 [ORCHESTRATION] Subscribing to listManager events...`);
      console.log(
        `🔧 [ORCHESTRATION] listManager.subscribe exists:`,
        !!listManager.subscribe
      );

      const subscriptionResult = listManager.subscribe((payload: any) => {
        console.log(`📡 [ORCHESTRATION] List Manager event:`, payload);

        // Special debug for virtual:range:changed events
        if (payload.event === "virtual:range:changed") {
          console.log(
            `🔥 [ORCHESTRATION] RECEIVED virtual:range:changed event!`
          );
        }

        // Handle different event types
        switch (payload.event) {
          case "viewport:changed":
            state.visibleRange =
              payload.data?.visibleRange || payload.viewport?.visibleRange;
            state.renderRange =
              payload.data?.renderRange || payload.viewport?.renderRange;
            state.scrollTop =
              payload.data?.scrollTop || payload.viewport?.scrollTop;

            console.log(
              `🔄 [ORCHESTRATION] Viewport changed - source: ${payload.data?.source}, scrollTop: ${state.scrollTop}`
            );

            // For custom scrollbar and wheel scroll, we don't apply additional native scrolling
            // The viewport handles its own positioning
            if (
              payload.data?.source === "scrollbar" ||
              payload.data?.source === "wheel-scroll"
            ) {
              console.log(
                `🎯 [ORCHESTRATION] ${payload.data?.source} event - skipping additional native scroll (viewport manages positioning)`
              );
              // Don't apply additional native scrolling for these events
              // The viewport manages its own positioning
            } else {
              // For other sources (like programmatic scrolling), apply native scrolling
              if (state.scrollTop !== undefined && component.element) {
                console.log(
                  `🔄 [ORCHESTRATION] Applying native scroll to ${state.scrollTop}px`
                );

                // Use List Manager's scroll animation control
                const animationEnabled = listManager.getScrollAnimation();

                console.log(
                  `🎬 [LIST-MANAGER-EVENT] Animation state: ${animationEnabled}`
                );

                // CRITICAL: Always set scroll-behavior CSS to ensure the animation setting is respected
                component.element.style.scrollBehavior = animationEnabled
                  ? "smooth"
                  : "unset";
                component.element.style.setProperty(
                  "scroll-behavior",
                  animationEnabled ? "smooth" : "unset"
                );

                if (component.element.scrollTo && animationEnabled) {
                  console.log(
                    `🎬 [LIST-MANAGER-EVENT] Using smooth scrollTo() to ${state.scrollTop}px`
                  );
                  component.element.scrollTo({
                    top: state.scrollTop,
                    behavior: "smooth",
                  });
                } else {
                  // Instant scroll (no animation) - CSS is now forced to auto
                  console.log(
                    `🎬 [LIST-MANAGER-EVENT] Using instant scrollTop to ${state.scrollTop}px`
                  );
                  component.element.scrollTop = state.scrollTop;
                }
              }
            }

            // Re-render if render range changed (only if we have valid ranges)
            if (
              state.renderRange &&
              typeof state.renderRange.start === "number"
            ) {
              renderItems();
            } else {
              console.log(
                `🔍 [ORCHESTRATION] Skipping render - invalid or missing range:`,
                state.renderRange
              );
            }

            // Emit viewport change
            if (originalEmit) {
              originalEmit.call(component, "viewport:change", {
                visibleRange: state.visibleRange,
              });
            }
            config.on?.onViewportChange?.(state.visibleRange);
            break;

          case "load:more:triggered":
            if (originalEmit) {
              originalEmit.call(component, "load:more", {
                direction: payload.data?.direction,
              });
            }
            config.on?.onLoadMore?.(payload.data?.direction);

            // Trigger collection to load more data
            if (payload.data?.direction === "forward") {
              collection.loadMore?.();
            }
            break;

          case "scroll:position:changed":
            state.scrollTop = payload.data?.scrollTop || 0;
            if (originalEmit) {
              originalEmit.call(component, "scroll:change", {
                scrollTop: state.scrollTop,
                direction: payload.data?.direction || "none",
              });
            }
            config.on?.onScroll?.(
              state.scrollTop,
              payload.data?.direction || "none"
            );
            break;

          case "scroll:to:index":
            console.log(
              `📍 [ORCHESTRATION] Handling scroll to index ${payload.data?.index}`
            );
            // After scroll to index, we need to calculate and update the viewport
            handleScrollToIndexViewportUpdate(
              payload.data?.index,
              payload.data?.align,
              payload.data?.animate
            );
            break;

          case "virtual:range:changed":
            console.log(
              `🎯 [ORCHESTRATION] Handling virtual range change: ${JSON.stringify(
                payload.data
              )}`
            );
            console.log(`🔍 [ORCHESTRATION] Full payload structure:`, {
              event: payload.event,
              hasData: !!payload.data,
              dataKeys: payload.data ? Object.keys(payload.data) : [],
              visibleRange: payload.data?.visibleRange,
              renderRange: payload.data?.renderRange,
              action: payload.data?.action,
              source: payload.data?.source,
            });

            // Check if we need to load more data for this range
            const currentItemCount = collection.getSize?.() || 0;
            const totalItemCount = collection.getTotalCount?.() || 0;
            const renderRange = payload.data?.renderRange || {
              start: 0,
              end: 0,
            };
            const visibleRange = payload.data?.visibleRange || {
              start: 0,
              end: 0,
            };

            // Update the current render range in state IMMEDIATELY
            state.renderRange = renderRange;
            state.visibleRange = visibleRange;

            console.log(
              `📊 [ORCHESTRATION] Range analysis: visible(${visibleRange.start}-${visibleRange.end}), render(${renderRange.start}-${renderRange.end}), current=${currentItemCount}, total=${totalItemCount}, action=${payload.data?.action}`
            );

            // 🎯 SCROLLBAR OPTIMIZATION: Only trigger data loading for specific actions
            const shouldTriggerDataLoading =
              payload.data?.action === "drag-end" ||
              payload.data?.action === "scroll" ||
              payload.data?.action === "setItems" ||
              payload.data?.action === "setTotalDatasetSize" ||
              (!payload.data?.action && payload.data?.source !== "scrollbar"); // Fallback, but exclude scrollbar without action

            // Explicitly exclude drag actions
            const isDragAction = payload.data?.action === "drag";
            if (isDragAction) {
              console.log(
                `🚫 [ORCHESTRATION] Skipping data loading for drag action (scrollbar optimization)`
              );
              renderItems(); // Still render with existing data
              break;
            }

            if (!shouldTriggerDataLoading) {
              console.log(
                `🚫 [ORCHESTRATION] Skipping data loading for action: ${payload.data?.action} (scrollbar drag optimization)`
              );
              // Still render with existing data, but don't trigger new data loads
              renderItems();
              break;
            }

            console.log(
              `✅ [ORCHESTRATION] Data loading allowed for action: ${payload.data?.action}`
            );

            // For drag-end events and native scroll, we need to be more strategic about data loading
            // Load the page that contains the visible range start
            if (
              payload.data?.action === "drag-end" ||
              payload.data?.action === "scroll"
            ) {
              const pageSize = collectionConfig.pageSize || 20;
              const targetPage = Math.floor(visibleRange.start / pageSize) + 1;
              const currentPage = Math.floor(currentItemCount / pageSize);

              console.log(
                `🎯 [ORCHESTRATION] ${payload.data?.action}: targeting page ${targetPage} for visible range ${visibleRange.start}-${visibleRange.end} (current page: ${currentPage})`
              );

              // Always load the page containing the visible range start
              if (
                targetPage !== currentPage ||
                visibleRange.start >= currentItemCount
              ) {
                console.log(
                  `🔄 [ORCHESTRATION] Loading page ${targetPage} for ${payload.data?.action} position`
                );
                collection.loadPage?.(targetPage);
              } else {
                console.log(
                  `✅ [ORCHESTRATION] Target page ${targetPage} already loaded`
                );
                // Data is already available, just re-render
                renderItems();
              }
            } else {
              // For non-drag-end events, use the original logic
              // If we need items beyond what's currently loaded, request more data
              if (
                renderRange.end >= currentItemCount &&
                currentItemCount < totalItemCount
              ) {
                const pageSize = collectionConfig.pageSize || 20;
                const targetPage = Math.floor(renderRange.end / pageSize) + 1;
                const currentPage = Math.floor(currentItemCount / pageSize);

                console.log(
                  `🔄 [ORCHESTRATION] Need to load page ${targetPage} (current page: ${currentPage}) for range ${renderRange.start}-${renderRange.end}`
                );

                // Load the required page
                collection.loadPage?.(targetPage);
              } else {
                console.log(
                  `✅ [ORCHESTRATION] Data already available for range ${renderRange.start}-${renderRange.end}`
                );
                // Always trigger re-render to update visible items
                renderItems();
              }

              // CRITICAL: Always render if we have valid ranges, regardless of data loading logic
              if (
                renderRange.end >= renderRange.start &&
                renderRange.start >= 0
              ) {
                console.log(
                  `🎨 [ORCHESTRATION] FORCE RENDER: Valid ranges detected (${renderRange.start}-${renderRange.end}), triggering render`
                );
                renderItems();
              }
            }

            // State already updated above
            break;

          default:
            // Handle other events if needed
            console.log(
              `📡 [ORCHESTRATION] Unhandled list manager event: ${payload.event}`
            );
            break;
        }
      });

      console.log(
        `🔧 [ORCHESTRATION] Subscription result:`,
        subscriptionResult
      );
      console.log(
        `🔧 [ORCHESTRATION] List Manager event handlers setup complete`
      );
    };

    /**
     * Initialize the orchestration
     */
    const initialize = (): void => {
      // Apply orientation styling
      applyOrientationStyling();

      // Initialize scroll behavior based on List Manager's animation state
      if (component.element) {
        const animationEnabled = listManager.getScrollAnimation();
        component.element.style.scrollBehavior = animationEnabled
          ? "smooth"
          : "unset";
        component.element.style.setProperty(
          "scroll-behavior",
          animationEnabled ? "smooth" : "unset"
        );
      }

      // CRITICAL: Setup event handlers BEFORE loading data
      // This ensures we capture all events from the start
      console.log(
        `🔧 [ORCHESTRATION] Setting up event handlers BEFORE data loading`
      );
      setupCollectionEvents();
      setupListManagerEvents();

      // Load initial data AFTER event handlers are set up
      if (config.items && config.items.length > 0) {
        // Static data
        collection.addItems(config.items);
      } else {
        // Load from API
        collection.loadPage?.(1);
      }

      console.log(
        `📋 List orchestration initialized with 3-layer architecture (${
          config.orientation?.orientation || "vertical"
        } orientation)`
      );
    };

    // Store original component emit to avoid recursion
    const originalEmit = (component as any).emit;

    // Initialize on next tick
    setTimeout(initialize, 0);

    // Extend component with orchestration API
    return Object.assign(component, {
      // Core instances
      collection,
      listManager,
      state,
      config,

      // Template management
      setTemplate: (newTemplate: typeof template) => {
        Object.assign(template, newTemplate);
        renderItems(); // Re-render with new template
      },

      // Data operations
      loadData: () =>
        collection.loadPage?.(1)?.then(() => {}) || Promise.resolve(),
      reload: () => collection.refresh?.()?.then(() => {}) || Promise.resolve(),
      clear: () => collection.clearItems?.(),
      addItems: (items: T[], position: "start" | "end" = "end") => {
        collection.addItems(items);
      },
      removeItems: (indices: number[]) => {
        // Convert indices to item IDs
        const items = collection.getItems?.() || [];
        const itemIds = indices.map((i) => items[i]?.id).filter(Boolean);
        collection.removeItems?.(itemIds);
      },
      updateItem: (index: number, item: T) => {
        // Collection updateItems expects array of partial items with IDs
        const items = collection.getItems?.() || [];
        const existingItem = items[index];
        if (existingItem) {
          collection.updateItems?.([{ ...item, id: existingItem.id }]);
        }
      },
      getItem: (index: number) => {
        const items = collection.getItems?.() || [];
        return items[index];
      },
      getItems: () => collection.getItems?.() || [],
      getItemCount: () => collection.getSize?.() || 0,

      // Scrolling operations
      scrollToIndex: async (
        index: number,
        alignment: "start" | "center" | "end" = "start",
        animate?: boolean
      ) => {
        console.log(
          `📍 [ORCHESTRATION] scrollToIndex(${index}, ${alignment}, animate: ${animate})`
        );
        console.log(
          `🔍 [ORCHESTRATION] animate parameter analysis: type=${typeof animate}, value=${animate}, isUndefined=${
            animate === undefined
          }`
        );

        // Store original animation state
        const originalAnimationState = listManager.getScrollAnimation();
        console.log(
          `🎬 [ORCHESTRATION] Original animation state: ${originalAnimationState}, Requested animate: ${animate}`
        );

        // If animate parameter is provided, temporarily override animation setting
        if (animate !== undefined && animate !== originalAnimationState) {
          console.log(
            `🎬 [ORCHESTRATION] Temporarily overriding animation to: ${animate}`
          );
          listManager.setScrollAnimation(animate);
        }

        try {
          // Check if we need to load more data to reach this index
          const currentItemCount = collection.getSize?.() || 0;
          console.log(
            `📊 [ORCHESTRATION] Current items: ${currentItemCount}, Target index: ${index}`
          );

          if (index >= currentItemCount) {
            console.log(
              `🔄 [ORCHESTRATION] Need to load more data to reach index ${index}`
            );

            // Store the pending scroll operation
            pendingScrollOperation = {
              type: "scrollToIndex",
              index,
              alignment,
              animate,
            };

            // Calculate target page based on page size
            const pageSize = collectionConfig.pageSize || 25;
            const targetPage = Math.floor(index / pageSize) + 1;

            console.log(
              `📄 [ORCHESTRATION] Loading page ${targetPage} (pageSize: ${pageSize})`
            );

            // Load the required page (Collection handles caching internally)
            await collection.loadPage?.(targetPage);

            // Wait a bit for data to be processed
            await new Promise((resolve) => setTimeout(resolve, 100));
          } else {
            console.log(
              `✅ [ORCHESTRATION] Data already available, scrolling to index ${index}`
            );
            // Handle scrolling directly in orchestration layer
            handleScrollToIndexViewportUpdate(index, alignment, animate);
          }

          return Promise.resolve();
        } finally {
          // Restore original animation state if we changed it
          if (animate !== undefined && animate !== originalAnimationState) {
            console.log(
              `🎬 [ORCHESTRATION] Restoring animation state to: ${originalAnimationState}`
            );
            listManager.setScrollAnimation(originalAnimationState);
          }
        }
      },

      scrollToPage: async (
        page: number,
        alignment: "start" | "center" | "end" = "start",
        animate?: boolean
      ) => {
        console.log(
          `📄 [ORCHESTRATION] scrollToPage(${page}, ${alignment}, animate: ${animate})`
        );

        // Store original animation state
        const originalAnimationState = listManager.getScrollAnimation();

        // If animate parameter is provided, temporarily override animation setting
        if (animate !== undefined && animate !== originalAnimationState) {
          listManager.setScrollAnimation(animate);
        }

        try {
          // Calculate the starting index for this page
          const pageSize = collectionConfig.pageSize || 25;
          const startIndex = (page - 1) * pageSize;

          console.log(
            `📍 [ORCHESTRATION] Scrolling to page ${page} start index: ${startIndex}`
          );

          // Check if we need to load data for this page
          const currentItemCount = collection.getSize?.() || 0;
          const needsData = startIndex >= currentItemCount;

          if (needsData) {
            console.log(
              `🔄 [ORCHESTRATION] Need to load page ${page} data first`
            );

            // Store the pending scroll operation (like scrollToIndex does)
            pendingScrollOperation = {
              type: "scrollToPage",
              index: startIndex,
              alignment,
              animate,
            };

            // Load the target page (Collection handles caching internally)
            await collection.loadPage?.(page);

            // The viewport update will be handled when items:loaded fires and applies pendingScrollOperation
          } else {
            console.log(
              `✅ [ORCHESTRATION] Data already available for page ${page}, scrolling directly`
            );

            // Data is already available, scroll immediately
            await collection.loadPage?.(page); // This will emit items:loaded but use cached data

            // Apply scroll immediately since data is available
            handleScrollToIndexViewportUpdate(startIndex, alignment, animate);
          }

          return Promise.resolve();
        } finally {
          // Restore original animation state if we changed it
          if (animate !== undefined && animate !== originalAnimationState) {
            listManager.setScrollAnimation(originalAnimationState);
          }
        }
      },

      scrollToItem: async (
        itemId: string,
        alignment: "start" | "center" | "end" = "start",
        animate?: boolean
      ) => {
        console.log(
          `📍 [ORCHESTRATION] scrollToItem(${itemId}, ${alignment}, animate: ${animate})`
        );

        // Store original animation state
        const originalAnimationState = listManager.getScrollAnimation();

        // If animate parameter is provided, temporarily override animation setting
        if (animate !== undefined && animate !== originalAnimationState) {
          listManager.setScrollAnimation(animate);
        }

        try {
          // First try to find the item in current data
          const items = collection.getItems?.() || [];
          const index = items.findIndex(
            (item: any) => String(item.id) === String(itemId)
          );

          if (index >= 0) {
            console.log(
              `✅ [ORCHESTRATION] Found item ${itemId} at index ${index}`
            );

            // Handle scrolling directly in orchestration layer to respect animation state
            handleScrollToIndexViewportUpdate(index, alignment, animate);

            return Promise.resolve();
          }

          console.warn(
            `⚠️ [ORCHESTRATION] Item ${itemId} not found in current data. Collection doesn't support loadItem by ID yet.`
          );

          return Promise.resolve();
        } finally {
          // Restore original animation state if we changed it
          if (animate !== undefined && animate !== originalAnimationState) {
            listManager.setScrollAnimation(originalAnimationState);
          }
        }
      },

      scrollToTop: () => {
        handleScrollToIndexViewportUpdate(0, "start");
        return Promise.resolve();
      },
      scrollToBottom: () => {
        const totalItems = collection.getTotalCount?.() || 0;
        if (totalItems > 0) {
          handleScrollToIndexViewportUpdate(totalItems - 1, "end");
        }
        return Promise.resolve();
      },
      getScrollPosition: () => state.scrollTop,

      // Scroll animation control operations (delegated to List Manager)
      setScrollAnimation: (enabled: boolean) => {
        listManager.setScrollAnimation(enabled);

        // Update CSS scroll-behavior to override SCSS
        if (component.element) {
          component.element.style.scrollBehavior = enabled ? "smooth" : "unset";
          component.element.style.setProperty(
            "scroll-behavior",
            enabled ? "smooth" : "unset"
          );
        }

        return component;
      },
      getScrollAnimation: () => listManager.getScrollAnimation(),
      toggleScrollAnimation: () => {
        listManager.toggleScrollAnimation();
        return component;
      },

      // Selection operations
      selectItems: (indices: number[]) => {
        state.selectedIndices = [...indices];
        updateItemSelection();
      },
      deselectItems: (indices: number[]) => {
        state.selectedIndices = state.selectedIndices.filter(
          (i) => !indices.includes(i)
        );
        updateItemSelection();
      },
      clearSelection: () => {
        state.selectedIndices = [];
        updateItemSelection();
      },
      getSelectedItems: () => {
        const items = collection.getItems?.() || [];
        return state.selectedIndices.map((i) => items[i]).filter(Boolean);
      },
      getSelectedIndices: () => [...state.selectedIndices],
      isSelected: (index: number) => state.selectedIndices.includes(index),

      // Additional methods expected by showcase
      hasNext: () => collection.hasNext?.() || false,
      getSelectedIds: () => {
        const items = collection.getItems?.() || [];
        return state.selectedIndices.map((i) => items[i]?.id).filter(Boolean);
      },
      getMetrics: () => ({
        renderCount: 0,
        scrollCount: 0,
        averageRenderTime: 0,
        averageScrollTime: 0,
        memoryUsage: 0,
        recycledElements: 0,
        // Add more metrics as needed
      }),

      // State queries
      getState: () => ({ ...state }),
      isLoading: () => state.isLoading,
      hasError: () => state.error !== null,
      isEmpty: () => state.isEmpty,

      // Rendering
      render: renderItems,
      updateViewport: () => listManager.updateViewport?.(),
      getVisibleRange: () => ({ ...state.visibleRange }),
      getRenderRange: () => ({ ...state.renderRange }),

      // Configuration
      updateConfig: (newConfig: Partial<ListConfig<T>>) => {
        Object.assign(config, newConfig);
      },
      getConfig: () => ({ ...config }),

      // Lifecycle
      lifecycle: {
        init: initialize,
        destroy: () => {
          collection.destroy?.();
          listManager.destroy?.();
        },
        update: renderItems,
      },

      // Event subscription - expose both collection and list manager events
      subscribe: (observer: (payload: any) => void) => {
        // Subscribe to collection events
        const collectionUnsub = collection.subscribe(observer);

        // Subscribe to list manager events
        const listManagerUnsub =
          listManager.subscribe?.(observer) || (() => {});

        // Return unsubscribe function that cleans up both
        return () => {
          collectionUnsub();
          listManagerUnsub();
        };
      },

      // Event emission - use original emit to avoid recursion
      emit: (event: string, data: any) => {
        if (originalEmit) {
          originalEmit.call(component, event, data);
        }
      },
    }) as C & Partial<ListComponent<T>>;
  };
