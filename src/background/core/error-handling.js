// Error Handling Module for Service Worker
// Centralizes error handling, logging, and recovery mechanisms

(function() {
  'use strict';

  console.log('🔧 Loading Error Handling module...');

  // Error tracking and reporting
  const errorLog = [];
  const maxErrors = 100; // Maximum errors to keep in memory

  /**
   * Error severity levels
   */
  const ERROR_LEVELS = {
    DEBUG: 'debug',
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error',
    CRITICAL: 'critical'
  };

  /**
   * Error categories
   */
  const ERROR_CATEGORIES = {
    NETWORK: 'network',
    DOM: 'dom',
    TURNDOWN: 'turndown',
    STORAGE: 'storage',
    DOWNLOAD: 'download',
    INITIALIZATION: 'initialization',
    VALIDATION: 'validation',
    UNKNOWN: 'unknown'
  };

  /**
   * Log error with structured information
   */
  function logError(error, context = {}, category = ERROR_CATEGORIES.UNKNOWN, level = ERROR_LEVELS.ERROR) {
    const errorEntry = {
      timestamp: Date.now(),
      level: level,
      category: category,
      message: error?.message || String(error),
      stack: error?.stack,
      name: error?.name || 'UnknownError',
      context: context,
      userAgent: navigator?.userAgent,
      url: self?.location?.href
    };

    // Add to in-memory log
    errorLog.push(errorEntry);
    if (errorLog.length > maxErrors) {
      errorLog.shift(); // Remove oldest error
    }

    // Console logging with appropriate level
    const logMessage = `[${level.toUpperCase()}] ${category}: ${errorEntry.message}`;
    switch (level) {
      case ERROR_LEVELS.DEBUG:
        console.debug(logMessage, errorEntry);
        break;
      case ERROR_LEVELS.INFO:
        console.info(logMessage, errorEntry);
        break;
      case ERROR_LEVELS.WARN:
        console.warn(logMessage, errorEntry);
        break;
      case ERROR_LEVELS.ERROR:
      case ERROR_LEVELS.CRITICAL:
        console.error(logMessage, errorEntry);
        break;
    }

    return errorEntry;
  }

  /**
   * Handle unhandled promise rejections
   */
  function handleUnhandledRejection(event) {
    const error = logError(
      event.reason,
      { type: 'unhandledrejection', promise: event.promise },
      ERROR_CATEGORIES.UNKNOWN,
      ERROR_LEVELS.CRITICAL
    );

    // Prevent the default handler (which terminates the worker)
    event.preventDefault();

    // Attempt recovery if possible
    attemptRecovery(error);
  }

  /**
   * Handle global errors
   */
  function handleGlobalError(event) {
    const error = logError(
      event.error,
      {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        type: 'global-error'
      },
      ERROR_CATEGORIES.UNKNOWN,
      ERROR_LEVELS.CRITICAL
    );

    // Don't prevent default - let it propagate
    attemptRecovery(error);
  }

  /**
   * Handle service worker specific errors
   */
  function handleServiceWorkerError(error, operation = 'unknown') {
    return logError(
      error,
      { operation: operation, type: 'service-worker-error' },
      ERROR_CATEGORIES.INITIALIZATION,
      ERROR_LEVELS.ERROR
    );
  }

  /**
   * Handle network errors
   */
  function handleNetworkError(error, url = '', operation = 'network-request') {
    return logError(
      error,
      { url: url, operation: operation, type: 'network-error' },
      ERROR_CATEGORIES.NETWORK,
      ERROR_LEVELS.ERROR
    );
  }

  /**
   * Handle DOM-related errors
   */
  function handleDOMError(error, operation = 'dom-manipulation') {
    return logError(
      error,
      { operation: operation, type: 'dom-error' },
      ERROR_CATEGORIES.DOM,
      ERROR_LEVELS.ERROR
    );
  }

  /**
   * Handle Turndown conversion errors
   */
  function handleTurndownError(error, content = '', operation = 'content-conversion') {
    return logError(
      error,
      {
        operation: operation,
        contentLength: content?.length || 0,
        type: 'turndown-error'
      },
      ERROR_CATEGORIES.TURNDOWN,
      ERROR_LEVELS.ERROR
    );
  }

  /**
   * Handle download errors
   */
  function handleDownloadError(error, filename = '', operation = 'file-download') {
    return logError(
      error,
      {
        filename: filename,
        operation: operation,
        type: 'download-error'
      },
      ERROR_CATEGORIES.DOWNLOAD,
      ERROR_LEVELS.ERROR
    );
  }

  /**
   * Attempt error recovery
   */
  function attemptRecovery(errorEntry) {
    console.log('🔧 Attempting error recovery for:', errorEntry.category);

    switch (errorEntry.category) {
      case ERROR_CATEGORIES.DOM:
        // Try to reinitialize DOM polyfill
        if (self.DOMPolyfill && typeof self.DOMPolyfill.install === 'function') {
          try {
            self.DOMPolyfill.install();
            console.log('✅ DOM polyfill reinstalled after error');
          } catch (recoveryError) {
            console.error('❌ DOM polyfill recovery failed:', recoveryError);
          }
        }
        break;

      case ERROR_CATEGORIES.NETWORK:
        // Network errors are usually transient, log and continue
        console.log('ℹ️ Network error logged, continuing operation');
        break;

      case ERROR_CATEGORIES.TURNDOWN:
        // Turndown errors might require fallback strategies
        console.log('⚠️ Turndown error - consider implementing fallback conversion');
        break;

      default:
        console.log('ℹ️ Error logged, no specific recovery action available');
    }
  }

  /**
   * Get error statistics
   */
  function getErrorStats() {
    const stats = {
      total: errorLog.length,
      byLevel: {},
      byCategory: {},
      recent: errorLog.slice(-10) // Last 10 errors
    };

    // Count by level and category
    errorLog.forEach(entry => {
      stats.byLevel[entry.level] = (stats.byLevel[entry.level] || 0) + 1;
      stats.byCategory[entry.category] = (stats.byCategory[entry.category] || 0) + 1;
    });

    return stats;
  }

  /**
   * Clear error log
   */
  function clearErrorLog() {
    errorLog.length = 0;
    console.log('🧹 Error log cleared');
  }

  /**
   * Export error log for debugging
   */
  function exportErrorLog() {
    return JSON.stringify(errorLog, null, 2);
  }

  /**
   * Initialize error handling
   */
  function initializeErrorHandling() {
    console.log('🔧 Initializing error handling...');

    // Set up global error handlers
    self.addEventListener('error', handleGlobalError);
    self.addEventListener('unhandledrejection', handleUnhandledRejection);

    console.log('✅ Error handling initialized');
  }

  // Export module interface
  self.ErrorHandler = {
    // Constants
    LEVELS: ERROR_LEVELS,
    CATEGORIES: ERROR_CATEGORIES,

    // Core functions
    logError: logError,
    handleServiceWorkerError: handleServiceWorkerError,
    handleNetworkError: handleNetworkError,
    handleDOMError: handleDOMError,
    handleTurndownError: handleTurndownError,
    handleDownloadError: handleDownloadError,

    // Utility functions
    getStats: getErrorStats,
    clearLog: clearErrorLog,
    exportLog: exportErrorLog,
    initialize: initializeErrorHandling,

    // Direct access to error log
    getLog: () => errorLog.slice() // Return copy to prevent external modification
  };

  // Auto-initialize
  initializeErrorHandling();

  console.log('✅ Error Handling module loaded');

})();
