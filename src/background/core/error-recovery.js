/**
 * Error Recovery and Fallback Management Module
 * 
 * Provides comprehensive error recovery mechanisms, circuit breaker patterns,
 * and graceful degradation strategies for the MarkDownload extension.
 * 
 * @author MarkDownload Recovery Team
 * @version 1.0.0
 * @since 2024
 */

/**
 * CircuitBreaker - Implements circuit breaker pattern to prevent cascade failures
 */
class CircuitBreaker {
  constructor(options = {}) {
    this.name = options.name || 'UnnamedCircuitBreaker';
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000; // 1 minute
    this.monitoringWindow = options.monitoringWindow || 60000; // 1 minute
    
    // Circuit state management
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
    
    // Monitoring
    this.callHistory = [];
    this.lastStateChange = Date.now();
    
    console.log(`🔌 Circuit breaker '${this.name}' initialized`);
  }

  /**
   * Execute operation through circuit breaker
   * @param {Function} operation - Operation to execute
   * @param {*} fallbackValue - Value to return when circuit is open
   * @returns {Promise<*>} Operation result or fallback value
   */
  async execute(operation, fallbackValue = null) {
    // Check circuit state before execution
    this._updateCircuitState();

    if (this.state === 'OPEN') {
      console.warn(`⚡ Circuit breaker '${this.name}' is OPEN - returning fallback`);
      return fallbackValue;
    }

    try {
      const startTime = Date.now();
      const result = await operation();
      const executionTime = Date.now() - startTime;
      
      // Record successful execution
      this._recordSuccess(executionTime);
      return result;
      
    } catch (error) {
      // Record failure and potentially open circuit
      this._recordFailure(error);
      
      if (this.state === 'OPEN') {
        console.warn(`⚡ Circuit breaker '${this.name}' opened due to failures`);
        return fallbackValue;
      }
      
      throw error;
    }
  }

  /**
   * Update circuit state based on current conditions
   * @private
   */
  _updateCircuitState() {
    const now = Date.now();
    
    // Clean old call history
    this.callHistory = this.callHistory.filter(call => 
      now - call.timestamp < this.monitoringWindow
    );

    switch (this.state) {
      case 'CLOSED':
        if (this.failureCount >= this.failureThreshold) {
          this._openCircuit();
        }
        break;
        
      case 'OPEN':
        if (now - this.lastFailureTime >= this.resetTimeout) {
          this._halfOpenCircuit();
        }
        break;
        
      case 'HALF_OPEN':
        // Will be handled by success/failure recording
        break;
    }
  }

  /**
   * Record successful operation
   * @private
   */
  _recordSuccess(executionTime) {
    this.callHistory.push({
      timestamp: Date.now(),
      success: true,
      executionTime
    });

    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= 2) { // Require 2 successes to close
        this._closeCircuit();
      }
    } else {
      this.failureCount = Math.max(0, this.failureCount - 1); // Gradually reduce failure count
    }
  }

  /**
   * Record failed operation
   * @private
   */
  _recordFailure(error) {
    this.callHistory.push({
      timestamp: Date.now(),
      success: false,
      error: error.message
    });

    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN' || this.failureCount >= this.failureThreshold) {
      this._openCircuit();
    }
  }

  /**
   * Open the circuit breaker
   * @private
   */
  _openCircuit() {
    this.state = 'OPEN';
    this.lastStateChange = Date.now();
    console.warn(`🚨 Circuit breaker '${this.name}' OPENED`);
  }

  /**
   * Half-open the circuit breaker for testing
   * @private
   */
  _halfOpenCircuit() {
    this.state = 'HALF_OPEN';
    this.successCount = 0;
    this.lastStateChange = Date.now();
    console.log(`🔄 Circuit breaker '${this.name}' HALF-OPEN (testing recovery)`);
  }

  /**
   * Close the circuit breaker
   * @private
   */
  _closeCircuit() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastStateChange = Date.now();
    console.log(`✅ Circuit breaker '${this.name}' CLOSED (recovered)`);
  }

  /**
   * Get current circuit breaker status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastStateChange: this.lastStateChange,
      recentCalls: this.callHistory.length
    };
  }
}

/**
 * ErrorRecoveryManager - Centralized error recovery and fallback coordination
 */
class ErrorRecoveryManager {
  constructor() {
    this.circuitBreakers = new Map();
    this.recoveryStrategies = new Map();
    this.fallbackChains = new Map();
    
    // Initialize common circuit breakers
    this._initializeCircuitBreakers();
    
    // Initialize recovery strategies
    this._initializeRecoveryStrategies();
    
    console.log('🛠️ ErrorRecoveryManager initialized');
  }

  /**
   * Initialize common circuit breakers
   * @private
   */
  _initializeCircuitBreakers() {
    // Download operations circuit breaker
    this.circuitBreakers.set('download', new CircuitBreaker({
      name: 'DownloadOperations',
      failureThreshold: 3,
      resetTimeout: 30000, // 30 seconds
      monitoringWindow: 120000 // 2 minutes
    }));

    // Content extraction circuit breaker
    this.circuitBreakers.set('contentExtraction', new CircuitBreaker({
      name: 'ContentExtraction',
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      monitoringWindow: 300000 // 5 minutes
    }));

    // Message processing circuit breaker
    this.circuitBreakers.set('messageProcessing', new CircuitBreaker({
      name: 'MessageProcessing',
      failureThreshold: 10,
      resetTimeout: 30000, // 30 seconds
      monitoringWindow: 60000 // 1 minute
    }));
  }

  /**
   * Initialize recovery strategies
   * @private
   */
  _initializeRecoveryStrategies() {
    // Download recovery strategy
    this.recoveryStrategies.set('download', {
      name: 'Download Recovery',
      steps: [
        'retry_with_exponential_backoff',
        'fallback_to_basic_download',
        'fallback_to_clipboard_copy',
        'graceful_failure_with_user_notification'
      ],
      maxRetries: 3,
      baseDelay: 1000
    });

    // Content extraction recovery strategy  
    this.recoveryStrategies.set('contentExtraction', {
      name: 'Content Extraction Recovery',
      steps: [
        'retry_with_different_extractor',
        'fallback_to_basic_text_extraction',
        'fallback_to_manual_selection',
        'graceful_failure_with_partial_content'
      ],
      maxRetries: 2,
      baseDelay: 500
    });

    // Message processing recovery strategy
    this.recoveryStrategies.set('messageProcessing', {
      name: 'Message Processing Recovery',
      steps: [
        'validate_and_sanitize_message',
        'retry_with_basic_processing',
        'fallback_to_error_response',
        'log_and_ignore'
      ],
      maxRetries: 2,
      baseDelay: 100
    });
  }

  /**
   * Execute operation with comprehensive error recovery
   * @param {string} operationType - Type of operation (download, contentExtraction, etc.)
   * @param {Function} operation - Primary operation to execute
   * @param {Object} options - Recovery options
   * @returns {Promise<*>} Operation result or recovered result
   */
  async executeWithRecovery(operationType, operation, options = {}) {
    const circuitBreaker = this.circuitBreakers.get(operationType);
    const recoveryStrategy = this.recoveryStrategies.get(operationType);

    if (!circuitBreaker || !recoveryStrategy) {
      console.warn(`⚠️ No recovery strategy found for operation type: ${operationType}`);
      return await operation();
    }

    // Execute through circuit breaker with fallback chain
    return await circuitBreaker.execute(async () => {
      return await this._executeWithFallbackChain(operation, recoveryStrategy, options);
    }, options.ultimateFallback || null);
  }

  /**
   * Execute operation with fallback chain
   * @private
   */
  async _executeWithFallbackChain(operation, strategy, options) {
    let lastError;
    let attempt = 0;

    // Primary operation attempt
    try {
      return await operation();
    } catch (primaryError) {
      lastError = primaryError;
      console.warn(`⚠️ Primary operation failed for ${strategy.name}:`, primaryError.message);
    }

    // Execute recovery steps
    for (const step of strategy.steps) {
      if (attempt >= strategy.maxRetries) {
        break;
      }

      try {
        const delay = strategy.baseDelay * Math.pow(2, attempt); // Exponential backoff
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        const recoveryResult = await this._executeRecoveryStep(step, lastError, options);
        if (recoveryResult.success) {
          console.log(`✅ Recovery successful using step: ${step}`);
          return recoveryResult.data;
        }

      } catch (recoveryError) {
        console.warn(`⚠️ Recovery step '${step}' failed:`, recoveryError.message);
        lastError = recoveryError;
      }

      attempt++;
    }

    // All recovery attempts failed
    throw new ErrorRecoveryFailure(
      `All recovery attempts failed for ${strategy.name}`,
      'RECOVERY_EXHAUSTED',
      lastError
    );
  }

  /**
   * Execute individual recovery step
   * @private
   */
  async _executeRecoveryStep(step, originalError, options) {
    switch (step) {
      case 'retry_with_exponential_backoff':
        return { success: false }; // Handled by delay mechanism
        
      case 'fallback_to_basic_download':
        return await this._basicDownloadFallback(options);
        
      case 'fallback_to_clipboard_copy':
        return await this._clipboardCopyFallback(options);
        
      case 'fallback_to_basic_text_extraction':
        return await this._basicTextExtractionFallback(options);
        
      case 'validate_and_sanitize_message':
        return await this._validateAndSanitizeFallback(options);
        
      case 'graceful_failure_with_user_notification':
        return await this._gracefulFailureWithNotification(originalError, options);
        
      default:
        return { success: false };
    }
  }

  /**
   * Basic download fallback
   * @private
   */
  async _basicDownloadFallback(options) {
    try {
      // Use basic browser download API without advanced features
      if (options.content && options.filename) {
        const blob = new Blob([options.content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        
        // Use basic browser download
        if (self.chrome?.downloads?.download) {
          await new Promise((resolve, reject) => {
            self.chrome.downloads.download({
              url: url,
              filename: options.filename,
              saveAs: false
            }, (downloadId) => {
              if (self.chrome.runtime.lastError) {
                reject(new Error(self.chrome.runtime.lastError.message));
              } else {
                resolve(downloadId);
              }
            });
          });
          
          return { success: true, data: { method: 'basic_download', filename: options.filename } };
        }
      }
      
      return { success: false };
    } catch (error) {
      return { success: false };
    }
  }

  /**
   * Clipboard copy fallback
   * @private
   */
  async _clipboardCopyFallback(options) {
    try {
      if (options.content) {
        // Copy content to clipboard as fallback
        await navigator.clipboard.writeText(options.content);
        return { 
          success: true, 
          data: { 
            method: 'clipboard_copy',
            message: 'Content copied to clipboard due to download failure'
          } 
        };
      }
      return { success: false };
    } catch (error) {
      return { success: false };
    }
  }

  /**
   * Basic text extraction fallback
   * @private
   */
  async _basicTextExtractionFallback(options) {
    try {
      if (options.htmlContent) {
        // Basic text extraction without complex processing
        const textContent = options.htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        return { 
          success: true, 
          data: { 
            content: textContent,
            method: 'basic_text_extraction'
          } 
        };
      }
      return { success: false };
    } catch (error) {
      return { success: false };
    }
  }

  /**
   * Message validation and sanitization fallback
   * @private
   */
  async _validateAndSanitizeFallback(options) {
    try {
      if (self.SecurityValidator && options.message) {
        const validation = self.SecurityValidator.prototype.validateMessage.call(
          new self.SecurityValidator(), 
          options.message
        );
        
        if (validation.isValid) {
          return { 
            success: true, 
            data: validation.sanitizedMessage 
          };
        }
      }
      return { success: false };
    } catch (error) {
      return { success: false };
    }
  }

  /**
   * Graceful failure with user notification
   * @private
   */
  async _gracefulFailureWithNotification(originalError, options) {
    try {
      const userFriendlyMessage = this._generateUserFriendlyErrorMessage(originalError);
      
      // Log error for debugging
      console.error('🚨 Operation failed after all recovery attempts:', {
        originalError: originalError.message,
        userMessage: userFriendlyMessage,
        timestamp: Date.now()
      });

      return { 
        success: true, 
        data: { 
          error: true,
          userMessage: userFriendlyMessage,
          method: 'graceful_failure'
        } 
      };
    } catch (error) {
      return { success: false };
    }
  }

  /**
   * Generate user-friendly error message
   * @private
   */
  _generateUserFriendlyErrorMessage(error) {
    const errorPatterns = {
      'network': 'Network connection issue. Please check your internet connection and try again.',
      'timeout': 'The operation took too long. Please try again.',
      'permission': 'Permission denied. Please check your browser settings.',
      'storage': 'Storage issue. Please check available space and try again.',
      'security': 'Security restriction encountered. Please try a different approach.',
      'default': 'An unexpected error occurred. Please try again or contact support.'
    };

    const errorMessage = error.message?.toLowerCase() || '';
    
    for (const [pattern, message] of Object.entries(errorPatterns)) {
      if (errorMessage.includes(pattern)) {
        return message;
      }
    }

    return errorPatterns.default;
  }

  /**
   * Get system recovery status
   * @returns {Object} Recovery system status
   */
  getRecoveryStatus() {
    const circuitBreakerStatus = {};
    for (const [name, breaker] of this.circuitBreakers) {
      circuitBreakerStatus[name] = breaker.getStatus();
    }

    return {
      circuitBreakers: circuitBreakerStatus,
      strategiesAvailable: Array.from(this.recoveryStrategies.keys()),
      timestamp: Date.now()
    };
  }

  /**
   * Reset all circuit breakers (for testing or manual recovery)
   */
  resetAllCircuitBreakers() {
    for (const [name, breaker] of this.circuitBreakers) {
      breaker._closeCircuit();
      console.log(`🔄 Reset circuit breaker: ${name}`);
    }
  }
}

/**
 * Custom error class for recovery failures
 */
class ErrorRecoveryFailure extends Error {
  constructor(message, code, originalError) {
    super(message);
    this.name = 'ErrorRecoveryFailure';
    this.code = code;
    this.originalError = originalError;
    this.timestamp = Date.now();
  }
}

/**
 * Async error boundary for promise-based operations
 */
class AsyncErrorBoundary {
  /**
   * Wrap async operations with comprehensive error handling
   * @param {Function} asyncOperation - Async operation to wrap
   * @param {Object} options - Error handling options
   * @returns {Promise<*>} Operation result or handled error
   */
  static async wrapAsync(asyncOperation, options = {}) {
    const {
      operationType = 'generic',
      timeout = 30000,
      retries = 1,
      fallbackValue = null
    } = options;

    try {
      // Add timeout wrapper
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Operation timeout')), timeout);
      });

      const result = await Promise.race([
        asyncOperation(),
        timeoutPromise
      ]);

      return result;

    } catch (error) {
      console.error(`🛡️ AsyncErrorBoundary caught error in ${operationType}:`, error);

      // If ErrorRecoveryManager is available, use it for recovery
      if (self.ErrorRecoveryManager) {
        try {
          return await self.ErrorRecoveryManager.executeWithRecovery(
            operationType,
            asyncOperation,
            { ...options, ultimateFallback: fallbackValue }
          );
        } catch (recoveryError) {
          console.error('🚨 Recovery also failed:', recoveryError);
        }
      }

      // Ultimate fallback
      return fallbackValue;
    }
  }
}

// ============================================================================
// MODULE EXPORTS
// ============================================================================

self.CircuitBreaker = CircuitBreaker;
self.ErrorRecoveryManager = ErrorRecoveryManager;
self.ErrorRecoveryFailure = ErrorRecoveryFailure;
self.AsyncErrorBoundary = AsyncErrorBoundary;

console.log('🛠️ Error Recovery module loaded and available');