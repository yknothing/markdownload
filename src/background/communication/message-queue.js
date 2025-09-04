/**
 * Message Queue Manager
 * Handles robust message processing with retry logic and connection management
 * Follows SRP: Single responsibility - manage message queue only
 */

// Message Queue Manager Module
(function() {
  'use strict';

  console.log('🔧 Loading Message Queue Manager module...');

  // Queue states
  const QUEUE_STATES = {
    IDLE: 'idle',
    PROCESSING: 'processing',
    PAUSED: 'paused',
    ERROR: 'error'
  };

  // Connection states
  const CONNECTION_STATES = {
    UNKNOWN: 'unknown',
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',
    RECONNECTING: 'reconnecting'
  };

  /**
   * Message Queue for robust communication
   */
  class MessageQueue {
    constructor(options = {}) {
      this.queue = [];
      this.state = QUEUE_STATES.IDLE;
      this.connectionState = CONNECTION_STATES.UNKNOWN;
      this.maxRetries = options.maxRetries || 3;
      this.retryDelay = options.retryDelay || 1000;
      this.maxQueueSize = options.maxQueueSize || 100;
      this.processingTimeout = options.processingTimeout || 30000;

      // Metrics
      this.metrics = {
        totalProcessed: 0,
        totalFailed: 0,
        totalRetries: 0,
        averageProcessingTime: 0
      };

      console.log('📨 Message Queue initialized with config:', {
        maxRetries: this.maxRetries,
        retryDelay: this.retryDelay,
        maxQueueSize: this.maxQueueSize
      });
    }

    /**
     * Send message with automatic retry and queue management
     */
    async sendMessage(message, ports) {
      return new Promise((resolve, reject) => {
        // Check queue size limits
        if (this.queue.length >= this.maxQueueSize) {
          const error = new Error(`Queue size limit exceeded: ${this.maxQueueSize}`);
          console.error('🚨', error.message);
          reject(error);
          return;
        }

        const messageItem = {
          message,
          ports,
          resolve,
          reject,
          attempts: 0,
          timestamp: Date.now(),
          processingStartTime: null,
          processingEndTime: null
        };

        this.queue.push(messageItem);
        this.processQueue();
      });
    }

    /**
     * Process message queue
     */
    async processQueue() {
      if (this.state === QUEUE_STATES.PROCESSING || this.queue.length === 0) {
        return;
      }

      this.state = QUEUE_STATES.PROCESSING;
      console.log(`📨 Processing queue (${this.queue.length} messages)`);

      while (this.queue.length > 0) {
        const item = this.queue.shift();
        item.processingStartTime = Date.now();

        try {
          const result = await this.processMessageWithTimeout(item);
          item.processingEndTime = Date.now();

          // Update metrics
          this.updateMetrics(item, true);

          item.resolve(result);
          console.log(`✅ Message processed successfully in ${item.processingEndTime - item.processingStartTime}ms`);

        } catch (error) {
          item.processingEndTime = Date.now();

          if (item.attempts < this.maxRetries) {
            // Retry with exponential backoff
            await this.scheduleRetry(item);
          } else {
            console.error(`❌ Message failed after ${this.maxRetries} attempts:`, error);
            this.updateMetrics(item, false);
            item.reject(error);
          }
        }
      }

      this.state = QUEUE_STATES.IDLE;
      console.log('📨 Queue processing completed');
    }

    /**
     * Process individual message with timeout
     */
    async processMessageWithTimeout(item) {
      return new Promise(async (resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Message processing timeout after ${this.processingTimeout}ms`));
        }, this.processingTimeout);

        try {
          const result = await this.processMessage(item);
          clearTimeout(timeout);
          resolve(result);
        } catch (error) {
          clearTimeout(timeout);
          reject(error);
        }
      });
    }

    /**
     * Process individual message
     */
    async processMessage(item) {
      const { message, ports } = item;
      const { action, type, data } = message;
      const messageType = action || type;

      console.log(`📨 Processing message: ${messageType}`);

      // Ensure service worker is ready
      await this.waitForServiceWorkerReady();

      switch (messageType) {
        case 'downloadMarkdown':
          return await this.handleDownloadMarkdown(data, ports);

        case 'download':
          return await this.handleLegacyDownload(message);

        case 'getHealthStatus':
          return this.handleHealthStatus(ports);

        case 'getErrorLog':
          return this.handleErrorLog(ports);

        case 'ping':
          return this.handlePing(ports);

        default:
          throw new Error(`Unknown message type: ${messageType}`);
      }
    }

    /**
     * Wait for service worker to be ready
     */
    async waitForServiceWorkerReady() {
      // Check if lifecycle manager indicates readiness
      if (self.LifecycleManager && self.LifecycleManager.isReady()) {
        return;
      }

      // Fallback: wait for initialization to complete
      if (self.ServiceWorkerInit && typeof self.ServiceWorkerInit.waitForReady === 'function') {
        await self.ServiceWorkerInit.waitForReady();
      }

      // Simple timeout-based fallback
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    /**
     * Handle download markdown message
     */
    async handleDownloadMarkdown(data, ports) {
      if (self.DownloadManager && typeof self.DownloadManager.download === 'function') {
        const result = await self.DownloadManager.download(data);
        if (ports && ports[0]) {
          ports[0].postMessage({ success: true, result });
        }
        return result;
      } else {
        // Fallback to legacy implementation
        const result = await this.legacyDownloadMarkdown(data);
        if (ports && ports[0]) {
          ports[0].postMessage({ success: true, result });
        }
        return result;
      }
    }

    /**
     * Handle legacy download message
     */
    async handleLegacyDownload(message) {
      const downloadData = {
        markdown: message.markdown,
        title: message.title,
        tabId: message.tab?.id,
        imageList: message.imageList,
        mdClipsFolder: message.mdClipsFolder,
        options: {
          includeTemplate: message.includeTemplate,
          downloadImages: message.downloadImages,
          clipSelection: message.clipSelection
        }
      };

      if (self.DownloadManager && typeof self.DownloadManager.download === 'function') {
        return await self.DownloadManager.download(downloadData);
      } else {
        return await this.legacyDownloadMarkdown(downloadData);
      }
    }

    /**
     * Handle health status request
     */
    handleHealthStatus(ports) {
      const status = {
        queueState: this.state,
        connectionState: this.connectionState,
        queueLength: this.queue.length,
        maxRetries: this.maxRetries,
        metrics: this.metrics,
        timestamp: Date.now()
      };

      if (self.ServiceWorkerInit && typeof self.ServiceWorkerInit.getStatus === 'function') {
        const initStatus = self.ServiceWorkerInit.getStatus();
        status.initializationStatus = initStatus;
      }

      if (ports && ports[0]) {
        ports[0].postMessage({
          success: true,
          status
        });
      }

      return status;
    }

    /**
     * Handle error log request
     */
    handleErrorLog(ports) {
      if (self.ErrorHandler && ports && ports[0]) {
        ports[0].postMessage({
          success: true,
          errors: self.ErrorHandler.getLog()
        });
      }
    }

    /**
     * Handle ping message for connectivity testing
     */
    handlePing(ports) {
      const response = {
        pong: true,
        timestamp: Date.now(),
        queueLength: this.queue.length
      };

      if (ports && ports[0]) {
        ports[0].postMessage({
          success: true,
          response
        });
      }

      return response;
    }

    /**
     * Legacy download function (should be removed once modularized)
     */
    async legacyDownloadMarkdown(data) {
      console.log('⚠️ Using legacy download implementation');
      throw new Error('Download functionality not yet modularized');
    }

    /**
     * Schedule retry with exponential backoff
     */
    async scheduleRetry(item) {
      item.attempts++;
      const delay = this.retryDelay * Math.pow(2, item.attempts - 1);

      console.warn(`🔄 Retrying message (attempt ${item.attempts}/${this.maxRetries}) after ${delay}ms`);

      // Update metrics
      this.metrics.totalRetries++;

      setTimeout(() => {
        this.queue.unshift(item); // Put back at front
        this.processQueue();
      }, delay);
    }

    /**
     * Update processing metrics
     */
    updateMetrics(item, success) {
      if (success) {
        this.metrics.totalProcessed++;
      } else {
        this.metrics.totalFailed++;
      }

      if (item.processingStartTime && item.processingEndTime) {
        const processingTime = item.processingEndTime - item.processingStartTime;
        this.metrics.averageProcessingTime =
          (this.metrics.averageProcessingTime * (this.metrics.totalProcessed + this.metrics.totalFailed - 1) + processingTime) /
          (this.metrics.totalProcessed + this.metrics.totalFailed);
      }
    }

    /**
     * Get queue statistics
     */
    getStats() {
      return {
        state: this.state,
        connectionState: this.connectionState,
        queueLength: this.queue.length,
        maxQueueSize: this.maxQueueSize,
        metrics: this.metrics,
        oldestMessage: this.queue.length > 0 ? this.queue[0].timestamp : null
      };
    }

    /**
     * Pause queue processing
     */
    pause() {
      this.state = QUEUE_STATES.PAUSED;
      console.log('⏸️ Message queue paused');
    }

    /**
     * Resume queue processing
     */
    resume() {
      if (this.state === QUEUE_STATES.PAUSED) {
        this.state = QUEUE_STATES.IDLE;
        this.processQueue();
        console.log('▶️ Message queue resumed');
      }
    }

    /**
     * Clear queue
     */
    clear() {
      const clearedCount = this.queue.length;
      this.queue = [];
      console.log(`🗑️ Cleared ${clearedCount} messages from queue`);
    }
  }

  // Export public API
  self.MessageQueueManager = {
    MessageQueue,
    QUEUE_STATES,
    CONNECTION_STATES
  };

  console.log('✅ Message Queue Manager module loaded');

})();
