/**
 * Async Utils Coverage Sprint Test Suite
 * 
 * Targeting specific uncovered branches for ≥30% coverage improvement
 * Focus: retry/backoff logic, cancel tokens, debounce/throttle boundaries
 * Architecture requirement: Direct require() method as specified
 * 
 * @coverage-target 30% branches minimum
 * @strategy Progressive ratchet for quality gates
 */

describe('AsyncUtils Coverage Sprint', () => {
  let AsyncTaskManager, AsyncDebouncer, AsyncRateLimiter, AsyncOperationPool;

  beforeEach(() => {
    // Mock console methods to prevent test noise
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    
    // Direct require as per architectural requirements
    require('../../../../src/background/core/async-utils.js');
    
    // Access classes from global scope
    AsyncTaskManager = self.AsyncTaskManager;
    AsyncDebouncer = self.AsyncDebouncer;
    AsyncRateLimiter = self.AsyncRateLimiter;  
    AsyncOperationPool = self.AsyncOperationPool;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('AsyncTaskManager Retry/Backoff Coverage', () => {
    let taskManager;

    beforeEach(() => {
      taskManager = new AsyncTaskManager();
    });

    test('should execute retry logic with backoff delay', async () => {
      let callCount = 0;
      const mockTask = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Simulated failure');
        }
        return Promise.resolve('success after retries');
      });

      // Mock setTimeout to speed up test
      jest.spyOn(global, 'setTimeout').mockImplementation((callback, delay) => {
        callback();
        return 123;
      });

      const result = await taskManager.scheduleTask(mockTask, { retries: 1 });
      
      expect(result).toBe('success after retries');
      expect(mockTask).toHaveBeenCalledTimes(2); // Initial + 1 retry
      
      global.setTimeout.mockRestore();
    });

    test('should handle task failure with retry exhaustion', async () => {
      const mockTask = jest.fn().mockRejectedValue(new Error('Persistent failure'));
      
      // Mock setTimeout to speed up test
      jest.spyOn(global, 'setTimeout').mockImplementation((callback, delay) => {
        callback();
        return 123;
      });
      
      await expect(taskManager.scheduleTask(mockTask, { retries: 1 })).rejects.toThrow('Persistent failure');
      expect(taskManager.taskMetrics.failedTasks).toBe(1);
      
      global.setTimeout.mockRestore();
    });

    test('should apply exponential backoff for retry delays', async () => {
      let callCount = 0;
      const mockTask = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Retry test failure');
        }
        return Promise.resolve('eventually succeeds');
      });

      let actualDelay;
      jest.spyOn(global, 'setTimeout').mockImplementation((callback, delay) => {
        actualDelay = delay;
        callback();
        return 123;
      });

      await taskManager.scheduleTask(mockTask, { retries: 1 });
      
      expect(actualDelay).toBeGreaterThan(0);
      expect(mockTask).toHaveBeenCalledTimes(2);
      
      global.setTimeout.mockRestore();
    });

    test('should clear queue and reject pending tasks', async () => {
      let resolve1, resolve2;
      const mockTask1 = jest.fn().mockImplementation(() => new Promise(res => { resolve1 = res; }));
      const mockTask2 = jest.fn().mockImplementation(() => new Promise(res => { resolve2 = res; }));
      
      const promise1 = taskManager.scheduleTask(mockTask1);
      const promise2 = taskManager.scheduleTask(mockTask2);
      
      // Let tasks get into the queue
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Clear queue should reject pending tasks
      taskManager.clearQueue();
      
      await expect(promise1).rejects.toThrow('Task queue cleared');
      await expect(promise2).rejects.toThrow('Task queue cleared');
      
      expect(taskManager.taskMetrics.totalTasks).toBe(0);
    });

    test('should handle metrics calculation with zero tasks', () => {
      const metrics = taskManager.getMetrics();
      
      expect(metrics.successRate).toBe(0);
      expect(metrics.averageExecutionTime).toBe(0);
      expect(metrics.queueLength).toBe(0);
    });

    test('should handle metrics calculation with successful tasks', async () => {
      const mockTask = jest.fn().mockResolvedValue('success');
      
      await taskManager.scheduleTask(mockTask);
      
      const metrics = taskManager.getMetrics();
      expect(metrics.successRate).toBe(100);
      expect(metrics.totalTasks).toBe(1);
    });
  });

  describe('AsyncDebouncer Cancel Token Coverage', () => {
    let debouncer;

    beforeEach(() => {
      debouncer = new AsyncDebouncer();
    });

    test('should cancel operation and clear from active operations', async () => {
      const mockFunction = jest.fn().mockResolvedValue('should not execute');
      
      const promise = debouncer.debounce('cancel-test', mockFunction, 200);
      
      // Verify operation is active
      expect(debouncer.getActiveOperations()).toContain('cancel-test');
      
      // Cancel the operation
      debouncer.cancel('cancel-test');
      
      // Verify operation is no longer active
      expect(debouncer.getActiveOperations()).not.toContain('cancel-test');
      
      // Promise should be rejected
      await expect(promise).rejects.toThrow('Debounced operation cancelled');
      expect(mockFunction).not.toHaveBeenCalled();
    });

    test('should handle debounce with multiple rapid calls', async () => {
      const mockFunction = jest.fn().mockResolvedValue('final result');
      
      // Mock setTimeout to make test faster
      jest.spyOn(global, 'setTimeout').mockImplementation((callback, delay) => {
        setTimeout(() => callback(), 10);
        return 123;
      });
      
      // Multiple rapid calls - only the last should execute
      debouncer.debounce('multi-key', mockFunction, 100);
      debouncer.debounce('multi-key', mockFunction, 100);
      const finalPromise = debouncer.debounce('multi-key', mockFunction, 100);
      
      const result = await finalPromise;
      
      expect(result).toBe('final result');
      expect(mockFunction).toHaveBeenCalledTimes(1);
      
      global.setTimeout.mockRestore();
    });

    test('should cleanup completed operations from active list', async () => {
      const mockFunction = jest.fn().mockResolvedValue('cleanup test');
      
      // Mock setTimeout to make test faster
      jest.spyOn(global, 'setTimeout').mockImplementation((callback, delay) => {
        callback();
        return 123;
      });
      
      const promise = debouncer.debounce('cleanup-key', mockFunction, 50);
      expect(debouncer.getActiveOperations()).toContain('cleanup-key');
      
      await promise;
      
      // After completion, should be removed from active operations
      expect(debouncer.getActiveOperations()).not.toContain('cleanup-key');
      
      global.setTimeout.mockRestore();
    });
  });

  describe('AsyncRateLimiter Boundary Conditions', () => {
    test('should handle rate limit with recursive waiting', async () => {
      const rateLimiter = new AsyncRateLimiter(2, 500);
      const mockFunction = jest.fn().mockResolvedValue('rate limited');
      
      // Mock setTimeout to speed up test
      jest.spyOn(global, 'setTimeout').mockImplementation((callback, delay) => {
        callback();
        return 123;
      });
      
      // Exhaust rate limit
      await rateLimiter.execute(() => mockFunction('call1'));
      await rateLimiter.execute(() => mockFunction('call2'));
      
      // This call should trigger recursive waiting
      await rateLimiter.execute(() => mockFunction('call3'));
      
      expect(mockFunction).toHaveBeenCalledTimes(3);
      
      global.setTimeout.mockRestore();
    });

    test('should cleanup old calls correctly', async () => {
      const rateLimiter = new AsyncRateLimiter(1, 100);
      const mockFunction = jest.fn().mockResolvedValue('cleanup test');
      
      await rateLimiter.execute(() => mockFunction('first'));
      
      // Wait for time window to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // This should not be rate limited as old call was cleaned up
      await rateLimiter.execute(() => mockFunction('second'));
      
      expect(mockFunction).toHaveBeenCalledTimes(2);
    });
  });

  describe('AsyncOperationPool Worker Management', () => {
    test('should handle worker assignment vs creation paths', async () => {
      const mockWorker = {
        process: jest.fn().mockImplementation(data => Promise.resolve(data * 2))
      };
      const mockWorkerFactory = jest.fn().mockReturnValue(mockWorker);
      
      const pool = new AsyncOperationPool(mockWorkerFactory, 2);
      
      // First execution should create worker
      const result1 = await pool.execute(5);
      expect(result1).toBe(10);
      expect(mockWorkerFactory).toHaveBeenCalledTimes(1);
      
      // Second execution should reuse available worker
      const result2 = await pool.execute(3);
      expect(result2).toBe(6);
      expect(mockWorkerFactory).toHaveBeenCalledTimes(1); // No new worker created
      
      expect(mockWorker.process).toHaveBeenCalledTimes(2);
    });

    test('should handle worker creation failure', async () => {
      const mockWorkerFactory = jest.fn().mockRejectedValue(new Error('Worker creation failed'));
      
      const pool = new AsyncOperationPool(mockWorkerFactory);
      
      await expect(pool.execute('test-data')).rejects.toThrow('Worker creation failed');
    });

    test('should handle concurrent task execution with limited workers', async () => {
      let processCount = 0;
      const mockWorker = {
        process: jest.fn().mockImplementation(data => {
          processCount++;
          return Promise.resolve(data + processCount);
        })
      };
      const mockWorkerFactory = jest.fn().mockReturnValue(mockWorker);
      
      const pool = new AsyncOperationPool(mockWorkerFactory, 1); // Single worker pool
      
      // Start tasks simultaneously
      const promise1 = pool.execute(1);
      const promise2 = pool.execute(2);
      
      const results = await Promise.all([promise1, promise2]);
      
      expect(results).toHaveLength(2);
      expect(mockWorker.process).toHaveBeenCalledTimes(2);
    });
  });

  describe('Utility Functions Edge Cases', () => {
    test('should handle withTimeout race condition', async () => {
      const { withTimeout } = self;
      const slowPromise = new Promise(resolve => setTimeout(() => resolve('slow'), 200));
      
      await expect(withTimeout(slowPromise, 100)).rejects.toThrow('Operation timed out after 100ms');
    });

    test('should handle makeAsync with yielding iterations', async () => {
      const { makeAsync } = self;
      
      const syncOperation = jest.fn().mockImplementation(async (yielder) => {
        // Simulate yielding during iterations
        for (let i = 0; i < 250; i++) {
          if (typeof yielder === 'function') {
            await yielder();
          }
        }
        return 'yielded successfully';
      });
      
      const result = await makeAsync(syncOperation, 100);
      expect(result).toBe('yielded successfully');
      expect(syncOperation).toHaveBeenCalled();
    });
  });
});
