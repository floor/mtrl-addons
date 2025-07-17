/**
 * Viewport-specific constants for list manager
 */

export const VIEWPORT_CONSTANTS = {
  /**
   * Request queue configuration
   */
  REQUEST_QUEUE: {
    ENABLED: true, // Enable/disable request queue system
    MAX_QUEUE_SIZE: 50, // Maximum number of queued requests
    MAX_ACTIVE_REQUESTS: 1, // Maximum concurrent active requests (1 = sequential)
  },

  /**
   * Loading configuration
   */
  LOADING: {
    CANCEL_THRESHOLD: 3, // px/ms - velocity above which loads are cancelled (lowered for better scrollbar response)
  },
} as const;
