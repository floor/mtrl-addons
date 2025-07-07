import type { ListManagerPlugin } from "../../types";
import { CLASSES, LOGGING } from "../../constants";

/**
 * Orientation configuration
 */
export interface OrientationConfig {
  /** List orientation */
  orientation: "horizontal" | "vertical";
  /** Whether to auto-detect orientation based on container */
  autoDetect?: boolean;
  /** Reverse direction (RTL for horizontal, bottom-to-top for vertical) */
  reverse?: boolean;
  /** Cross-axis alignment */
  crossAxisAlignment?: "start" | "center" | "end" | "stretch";
}

/**
 * Orientation state interface
 */
interface OrientationState {
  current: "horizontal" | "vertical";
  isReversed: boolean;
  crossAxisAlignment: string;
  containerWidth: number;
  containerHeight: number;
  scrollProperty: "scrollTop" | "scrollLeft";
  sizeProperty: "height" | "width";
  crossSizeProperty: "width" | "height";
  offsetProperty: "top" | "left";
  crossOffsetProperty: "left" | "top";
}

/**
 * Orientation manager plugin
 * Handles horizontal and vertical list orientations
 */
export const orientationManager = (
  config: OrientationConfig
): ListManagerPlugin => ({
  name: "orientation-manager",
  version: "1.0.0",
  dependencies: [],

  install: (listManager, pluginConfig) => {
    // Configuration with defaults
    const orientationConfig: Required<OrientationConfig> = {
      orientation: "vertical",
      autoDetect: false,
      reverse: false,
      crossAxisAlignment: "stretch",
      ...config,
    };

    // Orientation state
    let state: OrientationState = createOrientationState(
      orientationConfig.orientation
    );

    // Get container element
    const getContainer = (): HTMLElement | null => {
      return listManager.getConfig().container || null;
    };

    /**
     * Create orientation state based on orientation
     */
    function createOrientationState(
      orientation: "horizontal" | "vertical"
    ): OrientationState {
      const isHorizontal = orientation === "horizontal";

      return {
        current: orientation,
        isReversed: orientationConfig.reverse,
        crossAxisAlignment: orientationConfig.crossAxisAlignment,
        containerWidth: 0,
        containerHeight: 0,
        scrollProperty: isHorizontal ? "scrollLeft" : "scrollTop",
        sizeProperty: isHorizontal ? "width" : "height",
        crossSizeProperty: isHorizontal ? "height" : "width",
        offsetProperty: isHorizontal ? "left" : "top",
        crossOffsetProperty: isHorizontal ? "top" : "left",
      };
    }

    /**
     * Apply orientation styles to container
     */
    const applyOrientationStyles = (): void => {
      const container = getContainer();
      if (!container) return;

      const isHorizontal = state.current === "horizontal";

      // Remove existing orientation classes
      container.classList.remove(
        `${CLASSES.LIST_CONTAINER}--horizontal`,
        `${CLASSES.LIST_CONTAINER}--vertical`,
        `${CLASSES.LIST_CONTAINER}--reversed`
      );

      // Add orientation class
      container.classList.add(`${CLASSES.LIST_CONTAINER}--${state.current}`);

      // Add reverse class if needed
      if (state.isReversed) {
        container.classList.add(`${CLASSES.LIST_CONTAINER}--reversed`);
      }

      // Apply CSS styles for orientation
      const styles = isHorizontal
        ? {
            display: "flex",
            flexDirection: state.isReversed ? "row-reverse" : "row",
            overflowX: "auto",
            overflowY: "hidden",
            alignItems: getCSSAlignment(state.crossAxisAlignment),
            width: "100%",
          }
        : {
            display: "block",
            flexDirection: state.isReversed ? "column-reverse" : "column",
            overflowX: "hidden",
            overflowY: "auto",
            height: "100%",
          };

      Object.assign(container.style, styles);
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
     * Update container dimensions
     */
    const updateContainerDimensions = (): void => {
      const container = getContainer();
      if (!container) return;

      const rect = container.getBoundingClientRect();
      state.containerWidth = rect.width;
      state.containerHeight = rect.height;

      // Emit dimension change event
      listManager.emit("orientation:dimensions:changed", {
        width: state.containerWidth,
        height: state.containerHeight,
        orientation: state.current,
      });
    };

    /**
     * Auto-detect orientation based on container aspect ratio
     */
    const autoDetectOrientation = (): "horizontal" | "vertical" => {
      const container = getContainer();
      if (!container) return "vertical";

      const rect = container.getBoundingClientRect();
      const aspectRatio = rect.width / rect.height;

      // If wider than tall, suggest horizontal
      return aspectRatio > 1.5 ? "horizontal" : "vertical";
    };

    /**
     * Set orientation
     */
    const setOrientation = (orientation: "horizontal" | "vertical"): void => {
      if (state.current === orientation) return;

      const previousOrientation = state.current;
      state = createOrientationState(orientation);

      // Apply new styles
      applyOrientationStyles();
      updateContainerDimensions();

      // Emit orientation change event
      listManager.emit("orientation:changed", {
        from: previousOrientation,
        to: orientation,
        state: { ...state },
      });

      console.log(
        `${LOGGING.PREFIX} Orientation changed: ${previousOrientation} → ${orientation}`
      );
    };

    /**
     * Set reverse direction
     */
    const setReverse = (reverse: boolean): void => {
      if (state.isReversed === reverse) return;

      state.isReversed = reverse;
      applyOrientationStyles();

      listManager.emit("orientation:reverse:changed", {
        reversed: reverse,
        orientation: state.current,
      });
    };

    /**
     * Set cross-axis alignment
     */
    const setCrossAxisAlignment = (
      alignment: OrientationConfig["crossAxisAlignment"]
    ): void => {
      if (!alignment || state.crossAxisAlignment === alignment) return;

      state.crossAxisAlignment = alignment;
      applyOrientationStyles();

      listManager.emit("orientation:alignment:changed", {
        alignment,
        orientation: state.current,
      });
    };

    /**
     * Get scroll position for current orientation
     */
    const getScrollPosition = (): number => {
      const container = getContainer();
      if (!container) return 0;

      return container[state.scrollProperty];
    };

    /**
     * Set scroll position for current orientation
     */
    const setScrollPosition = (position: number): void => {
      const container = getContainer();
      if (!container) return;

      container[state.scrollProperty] = position;
    };

    /**
     * Get container size for current orientation
     */
    const getContainerSize = (): number => {
      return state.current === "horizontal"
        ? state.containerWidth
        : state.containerHeight;
    };

    /**
     * Get container cross size
     */
    const getContainerCrossSize = (): number => {
      return state.current === "horizontal"
        ? state.containerHeight
        : state.containerWidth;
    };

    /**
     * Calculate item position for current orientation
     */
    const calculateItemPosition = (index: number, itemSize: number): number => {
      let position = index * itemSize;

      // Apply reverse direction
      if (state.isReversed) {
        const totalSize = getContainerSize();
        position = totalSize - position - itemSize;
      }

      return Math.max(0, position);
    };

    /**
     * Position item element according to orientation
     */
    const positionItemElement = (
      element: HTMLElement,
      position: number,
      size?: number
    ): void => {
      const isHorizontal = state.current === "horizontal";

      // Reset all positioning
      element.style.position = "absolute";
      element.style.top = "0";
      element.style.left = "0";
      element.style.right = "auto";
      element.style.bottom = "auto";
      element.style.width = "auto";
      element.style.height = "auto";

      if (isHorizontal) {
        // Horizontal positioning
        element.style.left = `${position}px`;
        if (size) {
          element.style.width = `${size}px`;
        }

        // Cross-axis alignment
        switch (state.crossAxisAlignment) {
          case "start":
            element.style.top = "0";
            break;
          case "center":
            element.style.top = "50%";
            element.style.transform = "translateY(-50%)";
            break;
          case "end":
            element.style.bottom = "0";
            element.style.top = "auto";
            break;
          case "stretch":
            element.style.height = "100%";
            break;
        }
      } else {
        // Vertical positioning
        element.style.top = `${position}px`;
        if (size) {
          element.style.height = `${size}px`;
        }

        // Cross-axis alignment (full width for vertical lists)
        element.style.width = "100%";
      }

      // Add orientation-specific classes
      element.classList.add(`${CLASSES.LIST_ITEM}--${state.current}`);
      if (state.isReversed) {
        element.classList.add(`${CLASSES.LIST_ITEM}--reversed`);
      }
    };

    // Setup resize observer for container
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        updateContainerDimensions();

        // Auto-detect orientation if enabled
        if (orientationConfig.autoDetect) {
          const detectedOrientation = autoDetectOrientation();
          if (detectedOrientation !== state.current) {
            setOrientation(detectedOrientation);
          }
        }
      });

      const container = getContainer();
      if (container) {
        resizeObserver.observe(container);
      }
    }

    // Initialize orientation
    if (orientationConfig.autoDetect) {
      const detectedOrientation = autoDetectOrientation();
      setOrientation(detectedOrientation);
    } else {
      setOrientation(orientationConfig.orientation);
    }

    // Return orientation API
    return {
      // Orientation management
      setOrientation,
      getOrientation: () => state.current,
      setReverse,
      isReversed: () => state.isReversed,
      setCrossAxisAlignment,
      getCrossAxisAlignment: () => state.crossAxisAlignment,

      // Dimension queries
      getContainerSize,
      getContainerCrossSize,
      getContainerDimensions: () => ({
        width: state.containerWidth,
        height: state.containerHeight,
      }),

      // Scroll management
      getScrollPosition,
      setScrollPosition,
      getScrollProperty: () => state.scrollProperty,

      // Item positioning
      calculateItemPosition,
      positionItemElement,

      // State queries
      getOrientationState: () => ({ ...state }),
      isHorizontal: () => state.current === "horizontal",
      isVertical: () => state.current === "vertical",

      // Auto-detection
      autoDetectOrientation,

      // Configuration
      updateConfig(newConfig: Partial<OrientationConfig>): void {
        Object.assign(orientationConfig, newConfig);

        if (newConfig.orientation && newConfig.orientation !== state.current) {
          setOrientation(newConfig.orientation);
        }
        if (newConfig.reverse !== undefined) {
          setReverse(newConfig.reverse);
        }
        if (newConfig.crossAxisAlignment) {
          setCrossAxisAlignment(newConfig.crossAxisAlignment);
        }
      },

      // Lifecycle
      destroy(): void {
        if (resizeObserver) {
          resizeObserver.disconnect();
          resizeObserver = null;
        }

        // Remove orientation classes
        const container = getContainer();
        if (container) {
          container.classList.remove(
            `${CLASSES.LIST_CONTAINER}--horizontal`,
            `${CLASSES.LIST_CONTAINER}--vertical`,
            `${CLASSES.LIST_CONTAINER}--reversed`
          );
        }

        console.log(`${LOGGING.PREFIX} Orientation manager destroyed`);
      },
    };
  },
});
