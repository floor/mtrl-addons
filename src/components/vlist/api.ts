import type { ListComponent, ListConfig, ListAPI } from "./types";

/**
 * API configuration interface
 */
export interface ApiConfig<T = any> {
  component: ListComponent<T>;
  config: ListConfig<T>;
}

/**
 * Creates the public API layer for the List component
 * Following mtrl's withAPI pattern
 */
export const withAPI =
  <T = any>(apiConfig: ApiConfig<T>) =>
  <C extends Partial<ListComponent<T>>>(component: C): C & ListAPI<T> => {
    const { config } = apiConfig;

    // Store references to orchestration methods before API overwrites them
    const orchestrationMethods = {
      scrollToIndex: component.scrollToIndex,
      scrollToTop: component.scrollToTop,
      scrollToBottom: component.scrollToBottom,
      loadData: component.loadData,
      reload: component.reload,
      clear: component.clear,
    };

    // Create clean public API interface
    const api: ListAPI<T> = {
      // Data management API
      async loadData(): Promise<void> {
        try {
          if (orchestrationMethods.loadData) {
            await orchestrationMethods.loadData();
          } else {
            await component.collection?.loadPage?.(1);
          }
        } catch (error) {
          console.error("List: Failed to load data", error);
          throw error;
        }
      },

      async reload(): Promise<void> {
        try {
          if (orchestrationMethods.reload) {
            await orchestrationMethods.reload();
          } else {
            await component.collection?.refresh?.();
          }
        } catch (error) {
          console.error("List: Failed to reload data", error);
          throw error;
        }
      },

      clear(): void {
        if (orchestrationMethods.clear) {
          orchestrationMethods.clear();
        } else {
          component.collection?.clearItems?.();
          component.clearSelection?.();
        }
      },

      addItems(items: T[], position: "start" | "end" = "end"): void {
        if (!Array.isArray(items)) {
          throw new Error("Items must be an array");
        }
        component.addItems?.(items, position);
      },

      removeItems(indices: number[]): void {
        if (!Array.isArray(indices)) {
          throw new Error("Indices must be an array");
        }
        component.removeItems?.(indices);
      },

      updateItem(index: number, item: T): void {
        if (typeof index !== "number" || index < 0) {
          throw new Error("Index must be a non-negative number");
        }
        component.updateItem?.(index, item);
      },

      getItem(index: number): T | undefined {
        if (typeof index !== "number") {
          return undefined;
        }
        return component.getItem?.(index);
      },

      getItems(): T[] {
        return component.getItems?.() || [];
      },

      getItemCount(): number {
        return component.collection?.getSize?.() || 0;
      },

      // Scrolling API
      async scrollToIndex(
        index: number,
        alignment: "start" | "center" | "end" = "start"
      ): Promise<void> {
        if (typeof index !== "number" || index < 0) {
          throw new Error("Index must be a non-negative number");
        }

        // For virtual scrolling with infinite data, don't do strict bounds checking
        // The orchestration layer will handle loading data as needed
        try {
          if (orchestrationMethods.scrollToIndex) {
            await orchestrationMethods.scrollToIndex(index, alignment);
          } else {
            console.warn("scrollToIndex not available");
          }
        } catch (error) {
          console.error("List: Failed to scroll to index", error);
          throw error;
        }
      },

      async scrollToTop(): Promise<void> {
        try {
          if (orchestrationMethods.scrollToTop) {
            await orchestrationMethods.scrollToTop();
          } else {
            console.warn("scrollToTop not available");
          }
        } catch (error) {
          console.error("List: Failed to scroll to top", error);
          throw error;
        }
      },

      async scrollToBottom(): Promise<void> {
        try {
          if (orchestrationMethods.scrollToBottom) {
            await orchestrationMethods.scrollToBottom();
          } else {
            console.warn("scrollToBottom not available");
          }
        } catch (error) {
          console.error("List: Failed to scroll to bottom", error);
          throw error;
        }
      },

      getScrollPosition(): number {
        return component.getScrollPosition?.() || 0;
      },

      // Selection API
      selectItems(indices: number[]): void {
        if (!config.selection?.enabled) {
          console.warn("List: Selection is not enabled");
          return;
        }

        if (!Array.isArray(indices)) {
          throw new Error("Indices must be an array");
        }

        const itemCount = this.getItemCount();
        const validIndices = indices.filter(
          (index) =>
            typeof index === "number" && index >= 0 && index < itemCount
        );

        if (config.selection.mode === "single" && validIndices.length > 1) {
          console.warn("List: Single selection mode allows only one item");
          component.selectItems?.([validIndices[0]]);
        } else {
          component.selectItems?.(validIndices);
        }
      },

      deselectItems(indices: number[]): void {
        if (!config.selection?.enabled) {
          console.warn("List: Selection is not enabled");
          return;
        }

        if (!Array.isArray(indices)) {
          throw new Error("Indices must be an array");
        }

        component.deselectItems?.(indices);
      },

      clearSelection(): void {
        if (!config.selection?.enabled) {
          console.warn("List: Selection is not enabled");
          return;
        }

        component.clearSelection?.();
      },

      getSelectedItems(): T[] {
        return component.getSelectedItems?.() || [];
      },

      getSelectedIndices(): number[] {
        return component.getSelectedIndices?.() || [];
      },

      isSelected(index: number): boolean {
        if (typeof index !== "number") {
          return false;
        }
        return component.isSelected?.(index) || false;
      },

      // State API
      getState() {
        return (
          component.getState?.() || {
            isLoading: false,
            error: null,
            isEmpty: true,
            scrollTop: 0,
            visibleRange: { start: 0, end: 0, count: 0 },
            renderRange: { start: 0, end: 0, count: 0 },
            selectedIndices: [],
            totalItems: 0,
            isVirtual: false,
          }
        );
      },

      isLoading(): boolean {
        return component.isLoading?.() || false;
      },

      hasError(): boolean {
        return component.hasError?.() || false;
      },

      isEmpty(): boolean {
        return component.isEmpty?.() || true;
      },

      // Rendering API
      render(): void {
        component.render?.();
      },

      updateViewport(): void {
        component.updateViewport?.();
      },

      getVisibleRange() {
        return component.getVisibleRange?.() || { start: 0, end: 0, count: 0 };
      },

      getRenderRange() {
        return component.getRenderRange?.() || { start: 0, end: 0, count: 0 };
      },

      // Template API
      setTemplate(template) {
        if (typeof template !== "function") {
          throw new Error("Template must be a function");
        }
        component.setTemplate?.(template);
      },

      setLoadingTemplate(template) {
        // Store in config for future use
        config.loadingTemplate = template;
      },

      setEmptyTemplate(template) {
        // Store in config for future use
        config.emptyTemplate = template;
      },

      setErrorTemplate(template) {
        // Store in config for future use
        config.errorTemplate = template;
      },

      // Configuration API
      updateConfig(newConfig: Partial<ListConfig<T>>): void {
        if (typeof newConfig !== "object" || newConfig === null) {
          throw new Error("Config must be an object");
        }

        component.updateConfig?.(newConfig);
      },

      getConfig(): ListConfig<T> {
        return component.getConfig?.() || config;
      },
    };

    // Return component with API methods
    return Object.assign(component, api) as C & ListAPI<T>;
  };

/**
 * Helper to get API configuration
 */
export const getApiConfig = <T = any>(
  component: ListComponent<T>
): ApiConfig<T> => ({
  component,
  config: component.config,
});
