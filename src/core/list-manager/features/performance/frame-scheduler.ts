import type { ListManagerPlugin } from "../../types";
import { LOGGING } from "../../constants";

/**
 * Frame scheduler configuration
 */
export interface FrameSchedulerConfig {
  enabled: boolean;
  targetFPS: number;
  maxFrameTime: number;
  prioritizeVisible: boolean;
  yieldThreshold: number;
}

/**
 * Frame scheduler plugin for performance optimization
 */
export const frameScheduler = (
  config: Partial<FrameSchedulerConfig> = {}
): ListManagerPlugin => ({
  name: "frame-scheduler",
  version: "1.0.0",
  dependencies: [],

  install: (listManager, pluginConfig) => {
    // Configuration with defaults
    const schedulerConfig: FrameSchedulerConfig = {
      enabled: true,
      targetFPS: 60,
      maxFrameTime: 16.67, // 60 FPS = 16.67ms per frame
      prioritizeVisible: true,
      yieldThreshold: 5,
      ...config,
    };

    let taskQueue: Array<() => void> = [];
    let isScheduling = false;
    let frameCount = 0;
    let lastFrameTime = performance.now();

    /**
     * Schedule task for next frame
     */
    const scheduleTask = (
      task: () => void,
      priority: "high" | "normal" | "low" = "normal"
    ): void => {
      if (priority === "high") {
        taskQueue.unshift(task);
      } else {
        taskQueue.push(task);
      }

      if (!isScheduling) {
        requestIdleCallback(processTasks);
        isScheduling = true;
      }
    };

    /**
     * Process task queue
     */
    const processTasks = (deadline: IdleDeadline): void => {
      const frameStart = performance.now();
      let tasksProcessed = 0;

      while (
        taskQueue.length > 0 &&
        (deadline.timeRemaining() > 0 || deadline.didTimeout) &&
        performance.now() - frameStart < schedulerConfig.maxFrameTime
      ) {
        const task = taskQueue.shift();
        if (task) {
          try {
            task();
            tasksProcessed++;

            // Yield after processing threshold
            if (tasksProcessed >= schedulerConfig.yieldThreshold) {
              break;
            }
          } catch (error) {
            console.error(`${LOGGING.PREFIX} Task execution error:`, error);
          }
        }
      }

      // Update frame metrics
      frameCount++;
      const now = performance.now();
      const frameDuration = now - lastFrameTime;
      lastFrameTime = now;

      // Continue processing if tasks remain
      if (taskQueue.length > 0) {
        requestIdleCallback(processTasks);
      } else {
        isScheduling = false;
      }

      // Emit frame metrics
      listManager.emit("frame:processed", {
        tasksProcessed,
        frameDuration,
        remainingTasks: taskQueue.length,
        frameCount,
      });
    };

    /**
     * Request idle callback polyfill
     */
    const requestIdleCallback = (
      callback: (deadline: IdleDeadline) => void
    ): number => {
      if (typeof window.requestIdleCallback === "function") {
        return window.requestIdleCallback(callback);
      }

      // Polyfill for browsers without requestIdleCallback
      return window.setTimeout(() => {
        const deadline = {
          timeRemaining: () =>
            Math.max(
              0,
              schedulerConfig.maxFrameTime -
                (performance.now() % schedulerConfig.maxFrameTime)
            ),
          didTimeout: false,
        };
        callback(deadline);
      }, 1) as any;
    };

    /**
     * Get current frame rate
     */
    const getCurrentFPS = (): number => {
      const now = performance.now();
      const timeSinceLastFrame = now - lastFrameTime;
      return timeSinceLastFrame > 0 ? 1000 / timeSinceLastFrame : 0;
    };

    /**
     * Clear task queue
     */
    const clearTasks = (): void => {
      taskQueue = [];
      isScheduling = false;
    };

    // Return frame scheduler API
    return {
      scheduleTask,
      clearTasks,

      getCurrentFPS,
      getQueueSize: () => taskQueue.length,
      isScheduling: () => isScheduling,

      updateConfig(newConfig: Partial<FrameSchedulerConfig>): void {
        Object.assign(schedulerConfig, newConfig);
      },

      destroy(): void {
        clearTasks();
        console.log(`${LOGGING.PREFIX} Frame scheduler destroyed`);
      },
    };
  },
});
