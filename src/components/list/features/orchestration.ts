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

    // Get template function
    const template = config.template || getDefaultTemplate<T>();

    // Create render container inside the list element
    const renderContainer = document.createElement("div");
    renderContainer.className = `${
      config.prefix || "mtrl"
    }-list__render-container`;
    renderContainer.style.cssText = `
      position: relative;
      width: 100%;
      height: 100%;
    `;
    component.element.appendChild(renderContainer);

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
     * Position items for current orientation
     */
    const positionItemsForOrientation = (
      itemElements: HTMLElement[],
      range: any
    ): void => {
      const orientation = config.orientation?.orientation || "vertical";
      const isHorizontal = orientation === "horizontal";
      const reverse = config.orientation?.reverse || false;
      const itemHeight = 50; // TODO: Get from size manager

      itemElements.forEach((element, index) => {
        const actualIndex = range.start + index;
        let position = 0; // Initialize position variable

        if (isHorizontal) {
          // Horizontal positioning
          position = actualIndex * itemHeight;
          if (reverse) {
            const totalWidth = state.totalItems * itemHeight;
            position = totalWidth - position - itemHeight;
          }

          element.style.position = "absolute";
          element.style.left = "0";
          element.style.top = "0";
          element.style.width = `${itemHeight}px`;

          // Cross-axis alignment - combine with existing transform
          const translateX = `translateX(${Math.max(0, position)}px)`;
          switch (config.orientation?.crossAxisAlignment) {
            case "center":
              element.style.top = "50%";
              element.style.transform = `${translateX} translateY(-50%)`;
              break;
            case "end":
              element.style.bottom = "0";
              element.style.top = "auto";
              element.style.transform = translateX;
              break;
            case "stretch":
              element.style.height = "100%";
              element.style.transform = translateX;
              break;
            case "start":
            default:
              element.style.top = "0";
              element.style.transform = translateX;
              break;
          }
        } else {
          // Vertical positioning (existing logic)
          position = actualIndex * itemHeight;
          if (reverse) {
            const totalHeight = state.totalItems * itemHeight;
            position = totalHeight - position - itemHeight;
          }

          element.style.position = "absolute";
          element.style.top = "0";
          element.style.left = "0";
          element.style.right = "0";
          element.style.height = `${itemHeight}px`;
          // Use transform for better performance (TanStack Virtual approach)
          element.style.transform = `translateY(${Math.max(0, position)}px)`;
        }

        element.setAttribute("data-virtual-index", actualIndex.toString());
        element.setAttribute("data-virtual-offset", position.toString());

        // Add orientation-specific classes
        element.classList.add(
          `${config.prefix || "mtrl"}-list-item--${orientation}`
        );
        if (reverse) {
          element.classList.add(
            `${config.prefix || "mtrl"}-list-item--reversed`
          );
        }
      });
    };

    /**
     * Render items in the current render range
     */
    const renderItems = (): void => {
      const { renderRange } = state;
      const items = collection.getItems();
      const pageSize = collectionConfig.pageSize || 20;

      console.log(`🎨 [ORCHESTRATION] Rendering items for range:`, renderRange);
      console.log(`📦 [ORCHESTRATION] Available items:`, items.length);

      // Clear existing rendered items
      renderContainer.innerHTML = "";

      // Render items in range
      for (
        let virtualIndex = renderRange.start;
        virtualIndex <= renderRange.end;
        virtualIndex++
      ) {
        // Calculate which page this virtual index belongs to
        const pageNumber = Math.floor(virtualIndex / pageSize) + 1;
        const indexInPage = virtualIndex % pageSize;

        // Find the item in the collection by matching the expected ID pattern
        // Since the Collection doesn't handle sparse data properly, we need to find items by ID
        const expectedItemId = (virtualIndex + 1).toString(); // API uses 1-based IDs

        let item = items.find((item: any) => item.id === expectedItemId);

        // If not found by ID, try direct access for sequential data
        if (!item && virtualIndex < items.length) {
          item = items[virtualIndex];
          // Verify this is the correct item by checking ID
          if (item && item.id !== expectedItemId) {
            item = undefined;
          }
        }

        if (!item) {
          console.log(
            `⚠️ [ORCHESTRATION] No item found for virtual index ${virtualIndex} (expected ID: ${expectedItemId}) in ${items.length} total items`
          );
          continue;
        }

        console.log(
          `✅ [ORCHESTRATION] Virtual index ${virtualIndex} → ${
            item.name || item.title || "Unknown"
          } (ID: ${item.id})`
        );

        // Create item wrapper
        const itemWrapper = document.createElement("div");
        itemWrapper.className = `${config.prefix || "mtrl"}-list-item`;
        itemWrapper.setAttribute("data-index", virtualIndex.toString());
        itemWrapper.setAttribute("role", "listitem");

        // Add selection styling
        if (state.selectedIndices.includes(virtualIndex)) {
          itemWrapper.classList.add(
            `${config.prefix || "mtrl"}-list-item--selected`
          );
        }

        // Render item content
        const content = template(item, virtualIndex);
        if (typeof content === "string") {
          itemWrapper.innerHTML = content;
        } else {
          itemWrapper.appendChild(content);
        }

        // Add click handler
        itemWrapper.addEventListener("click", (event) => {
          handleItemClick(item, virtualIndex, event);
        });

        renderContainer.appendChild(itemWrapper);
      }

      // Position items using orientation-aware positioning
      const itemElements = Array.from(
        renderContainer.children
      ) as HTMLElement[];
      positionItemsForOrientation(itemElements, renderRange);

      console.log(
        `✅ [ORCHESTRATION] Rendered ${itemElements.length} items for virtual indices ${renderRange.start}-${renderRange.end}`
      );

      // Emit render complete event
      const originalEmit = (component as any).emit;
      if (originalEmit) {
        originalEmit.call(component, "render:complete", { renderRange });
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
      const itemElements = renderContainer.querySelectorAll(`[data-index]`);

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

            // Update List Manager with new items
            console.log(
              `🔄 [ORCHESTRATION] Updating List Manager with ${items.length} items`
            );
            listManager.setItems?.(
              items.map((item: any, index: number) => ({
                id: String(index),
                data: item,
              }))
            );

            // For initial load, we need to calculate and set viewport range
            console.log(
              `🎯 [ORCHESTRATION] Checking if this is initial load...`
            );
            if (state.visibleRange.count === 0) {
              console.log(
                `🏁 [ORCHESTRATION] Initial load detected - calculating initial viewport`
              );

              // Calculate initial viewport
              const containerHeight = component.element.clientHeight || 400;
              const itemHeight = 50;
              const initialCount = Math.ceil(containerHeight / itemHeight) + 10; // Add buffer

              state.visibleRange = {
                start: 0,
                end: Math.min(initialCount - 1, items.length - 1),
                count: Math.min(initialCount, items.length),
              };
              state.renderRange = { ...state.visibleRange };

              console.log(
                `📊 [ORCHESTRATION] Initial viewport calculated:`,
                state.visibleRange
              );
              console.log(`🎨 [ORCHESTRATION] Triggering initial render...`);

              // Set virtual total height for proper scrollbar sizing
              setVirtualTotalHeight();

              // Trigger initial render
              renderItems();
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
     * Handle scroll to index viewport updates
     */
    const handleScrollToIndexViewportUpdate = (
      index: number,
      alignment: string = "start",
      animate?: boolean
    ): void => {
      const items = collection.getItems();
      const itemHeight = 50; // TODO: Get from configuration or size manager
      const containerHeight = component.element.clientHeight || 400;
      const pageSize = collectionConfig.pageSize || 20;

      console.log(
        `🎯 [VIEWPORT-UPDATE] Calculating viewport for index ${index}, alignment: ${alignment}`
      );
      console.log(
        `📊 [VIEWPORT-UPDATE] Available items: ${items.length}, pageSize: ${pageSize}`
      );

      // Calculate the visible item count for proper buffering
      const visibleItemCount = Math.ceil(containerHeight / itemHeight);
      const overscan = 5; // Buffer for smooth scrolling

      // Calculate which page this index belongs to
      const targetPage = Math.floor(index / pageSize) + 1;
      const pageStartIndex = (targetPage - 1) * pageSize;
      const pageEndIndex = pageStartIndex + pageSize - 1;

      console.log(
        `📄 [VIEWPORT-UPDATE] Target page: ${targetPage}, page range: ${pageStartIndex}-${pageEndIndex}`
      );

      // Calculate the proper start index based on alignment within the current page
      let startIndex: number;
      switch (alignment) {
        case "center":
          startIndex = Math.max(
            pageStartIndex,
            index - Math.floor(visibleItemCount / 2)
          );
          break;
        case "end":
          startIndex = Math.max(pageStartIndex, index - visibleItemCount + 1);
          break;
        case "start":
        default:
          // For "start" alignment, target index should be at the beginning of viewport
          startIndex = Math.max(pageStartIndex, index);
          break;
      }

      // Calculate end index, but constrain to current page + small buffer
      let endIndex = startIndex + visibleItemCount + overscan;

      // Don't render beyond the current page unless we have the data
      // For now, limit to current page since we load one page at a time
      endIndex = Math.min(endIndex, pageEndIndex + overscan);

      console.log(
        `📐 [VIEWPORT-UPDATE] Calculated render range: ${startIndex}-${endIndex}`
      );

      // Calculate scroll position to align with start of visible range
      const scrollTop = Math.max(0, startIndex * itemHeight);

      // Update state
      state.scrollTop = scrollTop;
      state.visibleRange = {
        start: startIndex,
        end: endIndex,
        count: endIndex - startIndex + 1,
      };
      state.renderRange = { ...state.visibleRange };

      console.log(`📊 [VIEWPORT-UPDATE] Updated state:`, {
        scrollTop: state.scrollTop,
        visibleRange: state.visibleRange,
        renderRange: state.renderRange,
      });

      // Apply container scrolling with configurable behavior
      if (component.element) {
        // Use explicit animate parameter if provided, otherwise use List Manager's scroll animation control
        const animationEnabled =
          animate !== undefined ? animate : listManager.getScrollAnimation();

        console.log(
          `🎬 [VIEWPORT-UPDATE] Animation control: animate=${animate}, listManagerState=${listManager.getScrollAnimation()}, final=${animationEnabled}`
        );

        // CRITICAL: Always set scroll-behavior CSS to ensure the animation setting is respected
        // This is necessary because SCSS or other CSS might override the behavior
        component.element.style.scrollBehavior = animationEnabled
          ? "smooth"
          : "unset";
        component.element.style.setProperty(
          "scroll-behavior",
          animationEnabled ? "smooth" : "unset"
        );

        if (component.element.scrollTo && animationEnabled) {
          console.log(
            `🎬 [VIEWPORT-UPDATE] Using smooth scrollTo() to ${scrollTop}px`
          );
          component.element.scrollTo({ top: scrollTop, behavior: "smooth" });
        } else {
          // Instant scroll (no animation) - CSS is now forced to auto/unset
          console.log(
            `🎬 [VIEWPORT-UPDATE] Using instant scrollTop to ${scrollTop}px`
          );
          component.element.scrollTop = scrollTop;
        }
      }

      // Set virtual total height for scrolling
      setVirtualTotalHeight();

      // Trigger re-render with new range
      renderItems();

      // Emit viewport change event
      if (originalEmit) {
        originalEmit.call(component, "viewport:change", {
          visibleRange: state.visibleRange,
        });
      }
      config.on?.onViewportChange?.(state.visibleRange);
    };

    /**
     * Set virtual total height using proper TanStack Virtual approach
     * Sets inner container height to enable scrolling to virtual positions
     */
    const setVirtualTotalHeight = (): void => {
      const itemHeight = 50;
      const estimatedTotalItems = 1000000; // Large number for infinite scrolling
      const maxBrowserHeight = 10000000; // 10M pixels - safe browser limit
      const totalHeight = Math.min(
        estimatedTotalItems * itemHeight,
        maxBrowserHeight
      );

      // CRITICAL: Ensure outer container has FIXED height (not 100%)
      if (component.element) {
        const currentHeight = getComputedStyle(component.element).height;
        const currentStyleHeight = component.element.style.height;

        // Force a fixed height for virtual scrolling - be aggressive about it
        if (
          currentHeight === "auto" ||
          currentHeight === "100%" ||
          currentStyleHeight === "100%" ||
          currentStyleHeight === "" ||
          parseInt(currentHeight) === 0 ||
          currentHeight.includes("%")
        ) {
          // FORCE a fixed height for virtual scrolling
          component.element.style.height = "400px";
          component.element.style.setProperty("height", "400px", "important");
          console.log(
            `🔧 [VIRTUAL-HEIGHT] FORCED outer container height to 400px (was: computed=${currentHeight}, style=${currentStyleHeight})`
          );
        }

        // Ensure overflow is set correctly
        component.element.style.overflow = "hidden auto";
        component.element.style.setProperty(
          "overflow",
          "hidden auto",
          "important"
        );
      }

      // Set render container height directly (TanStack Virtual approach)
      if (renderContainer) {
        renderContainer.style.height = `${totalHeight}px`;
        renderContainer.style.position = "relative";
        renderContainer.style.width = "100%";
        console.log(
          `🔧 [VIRTUAL-HEIGHT] Set inner container height to ${totalHeight}px`
        );
      }
    };

    /**
     * Handle List Manager events
     */
    const setupListManagerEvents = (): void => {
      // Subscribe to list manager events using the observer pattern
      listManager.subscribe((payload: any) => {
        console.log(`📡 [ORCHESTRATION] List Manager event:`, payload);

        // Handle different event types
        switch (payload.event) {
          case "viewport:changed":
            state.visibleRange =
              payload.data?.visibleRange || payload.viewport?.visibleRange;
            state.renderRange =
              payload.data?.renderRange || payload.viewport?.renderRange;
            state.scrollTop =
              payload.data?.scrollTop || payload.viewport?.scrollTop;

            // Apply actual container scrolling if scroll position changed
            if (state.scrollTop !== undefined && component.element) {
              console.log(
                `🔄 [ORCHESTRATION] Applying container scroll to ${state.scrollTop}px`
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

            // Re-render if render range changed
            renderItems();

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

          default:
            // Handle other events if needed
            console.log(
              `📡 [ORCHESTRATION] Unhandled list manager event: ${payload.event}`
            );
            break;
        }
      });
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

      // Setup event handlers
      setupCollectionEvents();
      setupListManagerEvents();

      // Load initial data
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
        const totalItems = collection.getSize?.() || 0;
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
