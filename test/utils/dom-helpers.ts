// test/utils/dom-helpers.ts - DOM Testing Utilities

/**
 * Creates a test container element with scrolling capabilities
 * @param height - Height of the container (default: 400px)
 * @param width - Width of the container (default: 100%)
 * @returns HTMLElement configured for testing
 */
export function createContainer(height = "400px", width = "100%"): HTMLElement {
  const container = document.createElement("div");
  container.style.height = height;
  container.style.width = width;
  container.style.overflow = "auto";
  container.style.position = "relative";
  container.className = "test-container";
  document.body.appendChild(container);
  return container;
}

/**
 * Cleans up a test container by removing it from DOM
 * @param container - Container to cleanup
 */
export function cleanupContainer(container: HTMLElement): void {
  if (container && container.parentNode) {
    container.parentNode.removeChild(container);
  }
}

/**
 * Simulates a scroll event on an element
 * @param element - Element to scroll
 * @param scrollTop - Scroll position
 * @param scrollLeft - Horizontal scroll position (optional)
 */
export function simulateScroll(
  element: HTMLElement,
  scrollTop: number,
  scrollLeft: number = 0
): void {
  element.scrollTop = scrollTop;
  element.scrollLeft = scrollLeft;

  const scrollEvent = new Event("scroll", {
    bubbles: true,
    cancelable: true,
  });

  element.dispatchEvent(scrollEvent);
}

/**
 * Simulates a resize event on an element
 * @param element - Element to resize
 * @param width - New width
 * @param height - New height
 */
export function simulateResize(
  element: HTMLElement,
  width: number,
  height: number
): void {
  element.style.width = `${width}px`;
  element.style.height = `${height}px`;

  const resizeEvent = new Event("resize", {
    bubbles: true,
    cancelable: true,
  });

  window.dispatchEvent(resizeEvent);
}

/**
 * Waits for the next animation frame
 * @returns Promise that resolves after requestAnimationFrame
 */
export function waitForAnimationFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

/**
 * Waits for multiple animation frames
 * @param count - Number of frames to wait
 * @returns Promise that resolves after the specified frames
 */
export function waitForAnimationFrames(count: number): Promise<void> {
  return new Promise((resolve) => {
    let remaining = count;

    function frame() {
      remaining--;
      if (remaining <= 0) {
        resolve();
      } else {
        requestAnimationFrame(frame);
      }
    }

    requestAnimationFrame(frame);
  });
}

/**
 * Waits for a specific amount of time
 * @param ms - Milliseconds to wait
 * @returns Promise that resolves after the timeout
 */
export function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Gets the computed style of an element
 * @param element - Element to get style for
 * @param property - CSS property to get
 * @returns The computed style value
 */
export function getComputedStyleValue(
  element: HTMLElement,
  property: string
): string {
  return window.getComputedStyle(element).getPropertyValue(property);
}

/**
 * Checks if an element is visible in the viewport
 * @param element - Element to check
 * @param container - Container element (default: document.body)
 * @returns Whether the element is visible
 */
export function isElementVisible(
  element: HTMLElement,
  container: HTMLElement = document.body
): boolean {
  const rect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  return (
    rect.top >= containerRect.top &&
    rect.left >= containerRect.left &&
    rect.bottom <= containerRect.bottom &&
    rect.right <= containerRect.right
  );
}

/**
 * Gets all elements within a visible range
 * @param container - Container element
 * @param selector - CSS selector for elements
 * @returns Array of visible elements
 */
export function getVisibleElements(
  container: HTMLElement,
  selector: string = ".test-item"
): HTMLElement[] {
  const elements = Array.from(
    container.querySelectorAll(selector)
  ) as HTMLElement[];
  return elements.filter((el) => isElementVisible(el, container));
}

/**
 * Simulates a mouse event on an element
 * @param element - Target element
 * @param type - Event type (click, mousedown, etc.)
 * @param options - Event options
 */
export function simulateMouseEvent(
  element: HTMLElement,
  type: string,
  options: Partial<MouseEventInit> = {}
): void {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    ...options,
  });

  element.dispatchEvent(event);
}

/**
 * Simulates a touch event on an element
 * @param element - Target element
 * @param type - Event type (touchstart, touchmove, etc.)
 * @param touches - Touch points
 */
export function simulateTouchEvent(
  element: HTMLElement,
  type: string,
  touches: Touch[] = []
): void {
  const event = new TouchEvent(type, {
    bubbles: true,
    cancelable: true,
    touches,
  });

  element.dispatchEvent(event);
}

/**
 * Creates a mock IntersectionObserver for testing
 * @param callback - Callback function
 * @returns Mock IntersectionObserver
 */
export function createMockIntersectionObserver(
  callback: IntersectionObserverCallback
): any {
  const observer = {
    observe: () => {},
    unobserve: () => {},
    disconnect: () => {},
    root: null,
    rootMargin: "",
    thresholds: [],
    takeRecords: () => [],
  };

  // Store callback for manual triggering
  (observer as any).callback = callback;

  return observer;
}

/**
 * Triggers intersection observer callback manually
 * @param observer - Mock observer
 * @param entries - Intersection entries
 */
export function triggerIntersectionObserver(
  observer: any,
  entries: IntersectionObserverEntry[]
): void {
  if (observer.callback) {
    observer.callback(entries, observer);
  }
}

/**
 * Creates a mock ResizeObserver for testing
 * @param callback - Callback function
 * @returns Mock ResizeObserver
 */
export function createMockResizeObserver(
  callback: ResizeObserverCallback
): any {
  const observer = {
    observe: () => {},
    unobserve: () => {},
    disconnect: () => {},
  };

  // Store callback for manual triggering
  (observer as any).callback = callback;

  return observer;
}

/**
 * Triggers resize observer callback manually
 * @param observer - Mock observer
 * @param entries - Resize entries
 */
export function triggerResizeObserver(
  observer: any,
  entries: ResizeObserverEntry[]
): void {
  if (observer.callback) {
    observer.callback(entries, observer);
  }
}
