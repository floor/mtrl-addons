/**
 * Viewport Constants
 * Centralized constants for viewport features
 */

export const VIEWPORT_CONSTANTS = {
  /**
   * Request queue configuration
   */
  REQUEST_QUEUE: {
    ENABLED: true, // Enable request queue system to handle rapid requests
    MAX_QUEUE_SIZE: 50, // Maximum number of queued requests
    MAX_ACTIVE_REQUESTS: 1, // Maximum concurrent active requests (1 = sequential)
  },

  /**
   * Loading configuration
   */
  LOADING: {
    CANCEL_THRESHOLD: 1, // px/ms - velocity above which loads are cancelled
  },

  // Placeholder settings
  PLACEHOLDER: {
    MASK_CHARACTER: "x",
    CSS_CLASS: "list-item__placeholder",
    MIN_SAMPLE_SIZE: 5, // Minimum items needed for reliable analysis
    MIN_SAMPLE_SIZE: 20, // Maximum items to analyze for performance
  },

  // Scrolling settings
  SCROLLING: {
    OVERSCAN: 2,
  },
};
