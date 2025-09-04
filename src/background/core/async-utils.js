/**
 * Asynchronous Utilities Module
 * 
 * Provides utilities for managing asynchronous operations, preventing main thread blocking,
 * and implementing efficient async patterns for the MarkDownload extension.
 * 
 * @author MarkDownload Performance Team
 * @version 1.0.0
 * @since 2024
 */

/**
 * AsyncTaskManager - Manages async operations to prevent main thread blocking
 */
class AsyncTaskManager {
  constructor() {
    this.taskQueue = [];
    this.isProcessing = false;
    this.maxConcurrentTasks = 3;
    this.activeTasks = new Set();
    this.taskTimeouts = new Map();
    
    // Performance monitoring
    this.taskMetrics = {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      averageExecutionTime: 0
    };

    console.log('⚡ AsyncTaskManager initialized');
  }

  /**
   * Schedule a task for asynchronous execution
   * @param {Function} taskFunction - Task function to execute
   * @param {Object} options - Task execution options
   * @returns {Promise<*>} Task result
   */
  async scheduleTask(taskFunction, options = {}) {
    const {
      priority = 'normal', // 'high', 'normal', 'low'
      timeout = 30000,
      retries = 0,
      taskId = null
    } = options;

    const task = {
      id: taskId || this._generateTaskId(),
      function: taskFunction,
      priority,
      timeout,
      retries,
      maxRetries: retries,
      createdAt: Date.now(),
      options
    };

    return new Promise((resolve, reject) => {
      task.resolve = resolve;
      task.reject = reject;

      // Add task to queue with priority sorting
      this._addTaskToQueue(task);

      // Start processing if not already running
      if (!this.isProcessing) {
        this._processTaskQueue();
      }
    });
  }

  /**
   * Add task to queue with priority ordering
   * @private
   */
  _addTaskToQueue(task) {
    const priorityOrder = { 'high': 3, 'normal': 2, 'low': 1 };
    const taskPriority = priorityOrder[task.priority] || 2;

    // Insert task maintaining priority order
    let insertIndex = this.taskQueue.length;
    for (let i = 0; i < this.taskQueue.length; i++) {
      const queuedTaskPriority = priorityOrder[this.taskQueue[i].priority] || 2;
      if (taskPriority > queuedTaskPriority) {
        insertIndex = i;
        break;
      }
    }

    this.taskQueue.splice(insertIndex, 0, task);
    this.taskMetrics.totalTasks++;
  }

  /**
   * Process task queue with concurrency control
   * @private
   */
  async _processTaskQueue() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;

    try {
      while (this.taskQueue.length > 0 || this.activeTasks.size > 0) {
        // Start new tasks up to concurrency limit
        while (
          this.activeTasks.size < this.maxConcurrentTasks && 
          this.taskQueue.length > 0
        ) {
          const task = this.taskQueue.shift();
          this._executeTask(task);
        }

        // Yield control to prevent blocking main thread
        await this._yieldToMainThread();
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Execute individual task with timeout and error handling
   * @private
   */
  async _executeTask(task) {
    this.activeTasks.add(task);
    const startTime = Date.now();

    try {
      // Set up timeout
      const timeoutId = setTimeout(() => {
        this._handleTaskTimeout(task);
      }, task.timeout);
      
      this.taskTimeouts.set(task.id, timeoutId);

      // Execute task function
      const result = await task.function();

      // Clear timeout
      clearTimeout(timeoutId);
      this.taskTimeouts.delete(task.id);

      // Update metrics
      const executionTime = Date.now() - startTime;
      this._updateTaskMetrics(executionTime, true);

      // Resolve task
      task.resolve(result);

    } catch (error) {
      // Clear timeout
      const timeoutId = this.taskTimeouts.get(task.id);
      if (timeoutId) {
        clearTimeout(timeoutId);
        this.taskTimeouts.delete(task.id);
      }

      // Handle retry logic
      if (task.retries > 0) {
        task.retries--;
        console.warn(`⚠️ Task ${task.id} failed, retrying (${task.retries} attempts left):`, error.message);
        
        // Re-queue task with backoff delay
        setTimeout(() => {
          this._addTaskToQueue(task);
        }, Math.min(1000 * (task.maxRetries - task.retries), 5000));
        
      } else {
        // Update metrics
        const executionTime = Date.now() - startTime;
        this._updateTaskMetrics(executionTime, false);

        // Reject task
        console.error(`❌ Task ${task.id} failed after all retries:`, error);
        task.reject(error);
      }
    } finally {
      this.activeTasks.delete(task);
    }
  }

  /**
   * Handle task timeout
   * @private
   */
  _handleTaskTimeout(task) {
    console.warn(`⏰ Task ${task.id} timed out after ${task.timeout}ms`);
    
    const timeoutError = new Error(`Task timeout after ${task.timeout}ms`);
    timeoutError.code = 'TASK_TIMEOUT';
    
    this.activeTasks.delete(task);
    this.taskMetrics.failedTasks++;
    
    task.reject(timeoutError);
  }

  /**
   * Update task execution metrics
   * @private
   */
  _updateTaskMetrics(executionTime, success) {
    if (success) {
      this.taskMetrics.completedTasks++;
    } else {
      this.taskMetrics.failedTasks++;
    }

    // Update average execution time using moving average
    const totalCompleted = this.taskMetrics.completedTasks;
    if (totalCompleted > 0) {
      this.taskMetrics.averageExecutionTime = (
        (this.taskMetrics.averageExecutionTime * (totalCompleted - 1)) + executionTime
      ) / totalCompleted;
    }
  }

  /**
   * Yield control to main thread to prevent blocking
   * @private
   */
  async _yieldToMainThread() {
    return new Promise(resolve => setTimeout(resolve, 0));
  }

  /**
   * Generate unique task ID
   * @private
   */
  _generateTaskId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get task manager metrics
   * @returns {Object} Performance metrics
   */
  getMetrics() {
    return {
      ...this.taskMetrics,
      queueLength: this.taskQueue.length,
      activeTasks: this.activeTasks.size,
      successRate: this.taskMetrics.totalTasks > 0 
        ? (this.taskMetrics.completedTasks / this.taskMetrics.totalTasks) * 100 
        : 0
    };
  }

  /**
   * Clear all pending tasks and reset metrics
   */
  clearQueue() {
    // Reject all pending tasks
    this.taskQueue.forEach(task => {
      task.reject(new Error('Task queue cleared'));
    });

    this.taskQueue = [];
    this.taskMetrics = {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      averageExecutionTime: 0
    };

    console.log('🧹 Task queue cleared');
  }
}

/**
 * AsyncBatchProcessor - Process items in batches to avoid blocking
 */
class AsyncBatchProcessor {
  constructor(options = {}) {
    this.batchSize = options.batchSize || 10;
    this.batchDelay = options.batchDelay || 10; // ms between batches
    this.progressCallback = options.progressCallback || null;
  }

  /**
   * Process array of items in batches
   * @param {Array} items - Items to process
   * @param {Function} processorFunction - Function to process each item
   * @returns {Promise<Array>} Processed results
   */
  async processBatch(items, processorFunction) {
    const results = [];
    const totalItems = items.length;
    let processedCount = 0;

    for (let i = 0; i < items.length; i += this.batchSize) {
      const batch = items.slice(i, i + this.batchSize);
      
      // Process batch items concurrently
      const batchPromises = batch.map(async (item, index) => {
        try {
          return await processorFunction(item, i + index);
        } catch (error) {
          console.warn(`⚠️ Failed to process item ${i + index}:`, error);
          return { error: error.message, item, index: i + index };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      processedCount += batch.length;

      // Report progress
      if (this.progressCallback) {
        this.progressCallback({
          processed: processedCount,
          total: totalItems,
          percentage: Math.round((processedCount / totalItems) * 100)
        });
      }

      // Yield between batches to prevent blocking
      if (i + this.batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, this.batchDelay));
      }
    }

    return results;
  }
}

/**
 * AsyncDebouncer - Debounce async operations
 */
class AsyncDebouncer {
  constructor() {
    this.timeouts = new Map();
  }

  /**
   * Debounce an async operation
   * @param {string} key - Unique key for the operation
   * @param {Function} asyncFunction - Async function to debounce
   * @param {number} delay - Debounce delay in milliseconds
   * @returns {Promise<*>} Debounced operation result
   */
  debounce(key, asyncFunction, delay) {
    return new Promise((resolve, reject) => {
      // Clear existing timeout for this key
      if (this.timeouts.has(key)) {
        clearTimeout(this.timeouts.get(key).timeoutId);
      }

      // Set new timeout
      const timeoutId = setTimeout(async () => {
        try {
          const result = await asyncFunction();
          this.timeouts.delete(key);
          resolve(result);
        } catch (error) {
          this.timeouts.delete(key);
          reject(error);
        }
      }, delay);

      this.timeouts.set(key, { timeoutId, resolve, reject });
    });
  }

  /**
   * Cancel debounced operation
   * @param {string} key - Operation key to cancel
   */
  cancel(key) {
    if (this.timeouts.has(key)) {
      const { timeoutId, reject } = this.timeouts.get(key);
      clearTimeout(timeoutId);
      reject(new Error('Debounced operation cancelled'));
      this.timeouts.delete(key);
    }
  }

  /**
   * Get active debounced operations
   * @returns {Array<string>} Active operation keys
   */
  getActiveOperations() {
    return Array.from(this.timeouts.keys());
  }
}

/**
 * AsyncRateLimiter - Limit rate of async operations
 */
class AsyncRateLimiter {
  constructor(maxCalls, timeWindow) {
    this.maxCalls = maxCalls;
    this.timeWindow = timeWindow; // in milliseconds
    this.calls = [];
  }

  /**
   * Execute function with rate limiting
   * @param {Function} asyncFunction - Function to rate limit
   * @returns {Promise<*>} Function result
   */
  async execute(asyncFunction) {
    await this._waitForNextSlot();
    
    try {
      const result = await asyncFunction();
      this._recordCall();
      return result;
    } catch (error) {
      this._recordCall();
      throw error;
    }
  }

  /**
   * Wait for next available execution slot
   * @private
   */
  async _waitForNextSlot() {
    this._cleanupOldCalls();

    if (this.calls.length >= this.maxCalls) {
      const oldestCall = this.calls[0];
      const waitTime = (oldestCall + this.timeWindow) - Date.now();
      
      if (waitTime > 0) {
        console.log(`🚦 Rate limiting: waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this._waitForNextSlot(); // Recursive check after waiting
      }
    }
  }

  /**
   * Remove old calls outside time window
   * @private
   */
  _cleanupOldCalls() {
    const now = Date.now();
    this.calls = this.calls.filter(callTime => now - callTime < this.timeWindow);
  }

  /**
   * Record new function call
   * @private
   */
  _recordCall() {
    this.calls.push(Date.now());
  }
}

/**
 * AsyncOperationPool - Pool of reusable async operation workers
 */
class AsyncOperationPool {
  constructor(workerFactory, maxWorkers = 5) {
    this.workerFactory = workerFactory;
    this.maxWorkers = maxWorkers;
    this.availableWorkers = [];
    this.busyWorkers = new Set();
    this.waitingTasks = [];
  }

  /**
   * Execute task using pooled worker
   * @param {*} taskData - Data to process
   * @returns {Promise<*>} Task result
   */
  async execute(taskData) {
    return new Promise((resolve, reject) => {
      const task = { data: taskData, resolve, reject };

      if (this.availableWorkers.length > 0) {
        this._assignTaskToWorker(task);
      } else if (this.busyWorkers.size < this.maxWorkers) {
        this._createWorkerForTask(task);
      } else {
        this.waitingTasks.push(task);
      }
    });
  }

  /**
   * Assign task to available worker
   * @private
   */
  async _assignTaskToWorker(task) {
    const worker = this.availableWorkers.pop();
    this.busyWorkers.add(worker);

    try {
      const result = await worker.process(task.data);
      task.resolve(result);
    } catch (error) {
      task.reject(error);
    } finally {
      this._releaseWorker(worker);
    }
  }

  /**
   * Create new worker for task
   * @private
   */
  async _createWorkerForTask(task) {
    try {
      const worker = await this.workerFactory();
      this.busyWorkers.add(worker);

      const result = await worker.process(task.data);
      task.resolve(result);
      
      this._releaseWorker(worker);
    } catch (error) {
      task.reject(error);
    }
  }

  /**
   * Release worker back to pool
   * @private
   */
  _releaseWorker(worker) {
    this.busyWorkers.delete(worker);

    if (this.waitingTasks.length > 0) {
      const nextTask = this.waitingTasks.shift();
      this.busyWorkers.add(worker);
      this._assignTaskToWorker(nextTask);
    } else {
      this.availableWorkers.push(worker);
    }
  }

  /**
   * Get pool statistics
   * @returns {Object} Pool statistics
   */
  getStats() {
    return {
      availableWorkers: this.availableWorkers.length,
      busyWorkers: this.busyWorkers.size,
      waitingTasks: this.waitingTasks.length,
      totalWorkers: this.availableWorkers.length + this.busyWorkers.size
    };
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert synchronous operation to async with yielding
 * @param {Function} syncOperation - Synchronous operation
 * @param {number} yieldInterval - How often to yield (default: every 100 iterations)
 * @returns {Promise<*>} Async operation result
 */
async function makeAsync(syncOperation, yieldInterval = 100) {
  let iterationCount = 0;
  
  const originalSetTimeout = setTimeout;
  
  // Wrap the operation to yield periodically
  return new Promise(async (resolve, reject) => {
    try {
      // If the sync operation supports iteration yielding
      const result = await syncOperation(async () => {
        iterationCount++;
        if (iterationCount % yieldInterval === 0) {
          await new Promise(res => originalSetTimeout(res, 0));
        }
      });
      
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Create timeout wrapper for async operations
 * @param {Promise} promise - Promise to wrap
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<*>} Promise with timeout
 */
function withTimeout(promise, timeoutMs) {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}

// ============================================================================
// MODULE EXPORTS
// ============================================================================

self.AsyncTaskManager = AsyncTaskManager;
self.AsyncBatchProcessor = AsyncBatchProcessor;
self.AsyncDebouncer = AsyncDebouncer;
self.AsyncRateLimiter = AsyncRateLimiter;
self.AsyncOperationPool = AsyncOperationPool;
self.makeAsync = makeAsync;
self.withTimeout = withTimeout;

console.log('⚡ Async utilities module loaded and available');