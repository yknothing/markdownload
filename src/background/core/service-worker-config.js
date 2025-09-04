/**
 * Service Worker Configuration Constants
 *
 * This module centralizes all configuration constants used throughout the service worker
 * to eliminate magic numbers and improve maintainability.
 *
 * @author MarkDownload Team
 * @version 2.0.0
 */

// Service Worker Configuration Module
(function() {
  'use strict';

  console.log('🔧 Loading Service Worker Configuration module...');

  // ============================================================================
  // TIMING CONSTANTS
  // ============================================================================

  /**
   * Timing-related configuration constants
   */
  const TIMING_CONFIG = Object.freeze({
    /** Default debounce time for download operations (milliseconds) */
    DEFAULT_DOWNLOAD_DEBOUNCE_TIME: 1000,

    /** Message processing timeout (milliseconds) */
    MESSAGE_PROCESSING_TIMEOUT: 30000,

    /** Default retry delay for failed operations (milliseconds) */
    DEFAULT_RETRY_DELAY: 1000,

    /** Maximum time to wait for service worker initialization (milliseconds) */
    INITIALIZATION_TIMEOUT: 10000,

    /** Health check interval (milliseconds) */
    HEALTH_CHECK_INTERVAL: 60000
  });

  // ============================================================================
  // RETRY AND RESILIENCE CONSTANTS
  // ============================================================================

  /**
   * Retry and resilience configuration constants
   */
  const RESILIENCE_CONFIG = Object.freeze({
    /** Maximum number of retry attempts for failed operations */
    MAX_RETRY_ATTEMPTS: 3,

    /** Base multiplier for exponential backoff */
    EXPONENTIAL_BACKOFF_BASE: 2,

    /** Maximum queue size for message processing */
    MAX_MESSAGE_QUEUE_SIZE: 100,

    /** Maximum concurrent download operations */
    MAX_CONCURRENT_DOWNLOADS: 5,

    /** Circuit breaker failure threshold */
    CIRCUIT_BREAKER_THRESHOLD: 5,

    /** Circuit breaker recovery timeout (milliseconds) */
    CIRCUIT_BREAKER_RECOVERY_TIMEOUT: 60000
  });

  // ============================================================================
  // SIZE AND LIMIT CONSTANTS
  // ============================================================================

  /**
   * Size and limit configuration constants
   */
  const SIZE_LIMITS = Object.freeze({
    /** Maximum file size for downloads (bytes) - 10MB */
    MAX_DOWNLOAD_FILE_SIZE: 10 * 1024 * 1024,

    /** Maximum markdown content length (characters) */
    MAX_MARKDOWN_CONTENT_LENGTH: 500000,

    /** Maximum title length (characters) */
    MAX_TITLE_LENGTH: 1000,

    /** Maximum filename length (characters) */
    MAX_FILENAME_LENGTH: 255,

    /** Maximum URL length (characters) */
    MAX_URL_LENGTH: 4096,

    /** Maximum number of image downloads per page */
    MAX_IMAGES_PER_PAGE: 50
  });

  // ============================================================================
  // VERSION AND METADATA CONSTANTS
  // ============================================================================

  /**
   * Version and metadata constants
   */
  const VERSION_INFO = Object.freeze({
    /** Current version of the service worker */
    VERSION: '4.0.0',

    /** Build timestamp (will be set during build process) */
    BUILD_TIMESTAMP: new Date().toISOString(),

    /** Supported browser protocols */
    SUPPORTED_PROTOCOLS: Object.freeze(['http:', 'https:', 'obsidian:']),

    /** Supported file extensions */
    SUPPORTED_EXTENSIONS: Object.freeze(['.md', '.markdown'])
  });

  // ============================================================================
  // MODULE REGISTRATION CONSTANTS
  // ============================================================================

  /**
   * Module registration configuration
   */
  const MODULE_CONFIG = Object.freeze({
    /** Critical modules that must be available */
    CRITICAL_MODULES: Object.freeze([
      'ErrorHandler',
      'LifecycleManager',
      'MessageQueueManager'
    ]),

    /** Optional modules that enhance functionality */
    OPTIONAL_MODULES: Object.freeze([
      'ContentExtractor',
      'TurndownManager',
      'DownloadManager'
    ]),

    /** Module loading priority order */
    LOADING_PRIORITY: Object.freeze([
      'ErrorHandler',
      'LifecycleManager',
      'BrowserAPI',
      'ServiceWorkerInit',
      'ContentExtractor',
      'TurndownManager',
      'DownloadManager',
      'MessageQueueManager',
      'DownloadProcessor'
    ])
  });

  // ============================================================================
  // ERROR HANDLING CONSTANTS
  // ============================================================================

  /**
   * Error handling and logging constants
   */
  const ERROR_CONFIG = Object.freeze({
    /** Error severity levels */
    SEVERITY_LEVELS: Object.freeze({
      LOW: 'low',
      MEDIUM: 'medium',
      HIGH: 'high',
      CRITICAL: 'critical'
    }),

    /** Error categories for classification */
    ERROR_CATEGORIES: Object.freeze({
      NETWORK: 'network',
      SECURITY: 'security',
      VALIDATION: 'validation',
      INITIALIZATION: 'initialization',
      PROCESSING: 'processing'
    }),

    /** Maximum number of errors to keep in memory */
    MAX_ERROR_LOG_SIZE: 100,

    /** Error reporting endpoint (if enabled) */
    ERROR_REPORTING_ENDPOINT: null
  });

  // ============================================================================
  // SECURITY CONSTANTS
  // ============================================================================

  /**
   * Security-related configuration constants
   */
  const SECURITY_CONFIG = Object.freeze({
    /** Dangerous protocols to block */
    DANGEROUS_PROTOCOLS: Object.freeze([
      'javascript:',
      'vbscript:',
      'data:',
      'file:',
      'ftp:',
      'mailto:'
    ]),

    /** Suspicious domains to block */
    SUSPICIOUS_DOMAINS: Object.freeze([
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '10.0.0.0',
      '172.16.0.0',
      '192.168.0.0'
    ]),

    /** Allowed HTML tags for sanitization */
    ALLOWED_HTML_TAGS: Object.freeze([
      'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'a', 'strong', 'em', 'b', 'i', 'code',
      'pre', 'blockquote', 'br', 'img', 'table', 'thead', 'tbody',
      'tr', 'th', 'td', 'caption'
    ]),

    /** Allowed HTML attributes for sanitization */
    ALLOWED_HTML_ATTRIBUTES: Object.freeze([
      'href', 'src', 'alt', 'title', 'class', 'id', 'colspan', 'rowspan'
    ]),

    /** Reserved filenames that should not be used */
    RESERVED_FILENAMES: Object.freeze([
      'CON', 'PRN', 'AUX', 'NUL',
      'COM1', 'COM2', 'COM3', 'COM4',
      'LPT1', 'LPT2', 'LPT3'
    ])
  });

  // ============================================================================
  // EXPORT CONFIGURATION OBJECT
  // ============================================================================

  /**
   * Complete configuration object with all constants
   */
  const SERVICE_WORKER_CONFIG = Object.freeze({
    TIMING: TIMING_CONFIG,
    RESILIENCE: RESILIENCE_CONFIG,
    SIZE_LIMITS: SIZE_LIMITS,
    VERSION: VERSION_INFO,
    MODULES: MODULE_CONFIG,
    ERRORS: ERROR_CONFIG,
    SECURITY: SECURITY_CONFIG
  });

  // Export to global scope
  self.ServiceWorkerConfig = SERVICE_WORKER_CONFIG;

  console.log('✅ Service Worker Configuration module loaded');

  // Log configuration summary for debugging
  console.log('📋 Configuration loaded:', {
    version: SERVICE_WORKER_CONFIG.VERSION.VERSION,
    maxRetries: SERVICE_WORKER_CONFIG.RESILIENCE.MAX_RETRY_ATTEMPTS,
    maxFileSize: `${SERVICE_WORKER_CONFIG.SIZE_LIMITS.MAX_DOWNLOAD_FILE_SIZE / (1024 * 1024)}MB`,
    criticalModules: SERVICE_WORKER_CONFIG.MODULES.CRITICAL_MODULES.length
  });

})();
