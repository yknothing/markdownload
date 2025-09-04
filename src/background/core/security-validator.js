/**
 * Security Validation Module for MarkDownload Extension
 * 
 * Provides comprehensive input validation, XSS prevention, and security utilities
 * for all message handling and data processing operations.
 * 
 * @author MarkDownload Security Team
 * @version 1.0.0
 * @since 2024
 */

/**
 * SecurityValidator - Core security validation and sanitization utilities
 * Implements defense-in-depth security principles for browser extension
 */
class SecurityValidator {
  constructor() {
    this.VALIDATION_PATTERNS = Object.freeze({
      // URL validation - only allow safe protocols
      SAFE_URL: /^https?:\/\//i,
      OBSIDIAN_URL: /^obsidian:\/\//i,
      
      // Message type validation - only allow alphanumeric with limited special chars
      MESSAGE_TYPE: /^[a-zA-Z][a-zA-Z0-9_-]*$/,
      
      // Filename validation - prevent directory traversal and dangerous characters
      // 修复：允许冒号(:)，因为它在标题中很常见；允许以.md结尾或字母数字结尾
      SAFE_FILENAME: /^[a-zA-Z0-9][a-zA-Z0-9._:\s-]*[a-zA-Z0-9](\.md)?$/,
      
      // Content validation - basic HTML/JS detection
      POTENTIAL_XSS: /<script|javascript:|on\w+\s*=|<iframe|<object|<embed/i,
      
      // File extension whitelist for downloads
      ALLOWED_EXTENSIONS: /\.(md|txt|html|json)$/i
    });

    this.MAX_SIZES = Object.freeze({
      MESSAGE_SIZE: 10 * 1024 * 1024, // 10MB max message size
      FILENAME_LENGTH: 255,
      URL_LENGTH: 2048,
      TITLE_LENGTH: 500,
      CONTENT_SIZE: 50 * 1024 * 1024 // 50MB max content size
    });

    this.ALLOWED_MESSAGE_TYPES = Object.freeze([
      'downloadMarkdown',
      'download',
      'getHealthStatus',
      'extractContent',
      'convertToMarkdown',
      'validateUrl',
      'systemStatus',
      'clip',
      'display.md',
      'selfTest',
      'convertArticleToMarkdown'
    ]);
  }

  /**
   * Validate incoming message structure and content
   * @param {*} message - Raw message data from content script or popup
   * @returns {Object} Validation result with success flag and sanitized data
   */
  validateMessage(message) {
    try {
      // Step 1: Basic type and structure validation
      const structureValidation = this._validateMessageStructure(message);
      if (!structureValidation.isValid) {
        return this._createValidationError('INVALID_STRUCTURE', structureValidation.error);
      }

      // Step 2: Message type validation
      const typeValidation = this._validateMessageType(message);
      if (!typeValidation.isValid) {
        return this._createValidationError('INVALID_MESSAGE_TYPE', typeValidation.error);
      }
      const messageType = message.action || message.type;

      // Step 3: Content size validation
      const sizeValidation = this._validateMessageSize(message, messageType);
      if (!sizeValidation.isValid) {
        return this._createValidationError('MESSAGE_TOO_LARGE', sizeValidation.error);
      }

      // Step 4: Content sanitization and XSS prevention
      const sanitizedMessage = this._sanitizeMessageContent(message, messageType);

      // Step 5: Specific validation based on message type
      const typeSpecificValidation = this._validateByMessageType(sanitizedMessage);
      if (!typeSpecificValidation.isValid) {
        return this._createValidationError('TYPE_SPECIFIC_VALIDATION_FAILED', typeSpecificValidation.error);
      }

      return {
        isValid: true,
        sanitizedMessage: typeSpecificValidation.sanitizedData,
        validationType: 'COMPLETE_VALIDATION'
      };

    } catch (error) {
      console.error('🚨 Security validation error:', error);
      return this._createValidationError('VALIDATION_EXCEPTION', error.message);
    }
  }

  /**
   * Validate basic message structure
   * @private
   */
  _validateMessageStructure(message) {
    if (!message || typeof message !== 'object') {
      return { isValid: false, error: 'Message must be a non-null object' };
    }

    if (Array.isArray(message)) {
      return { isValid: false, error: 'Message cannot be an array' };
    }

    // Check for required fields based on message type
    const requiredField = message.action || message.type;
    if (!requiredField) {
      return { isValid: false, error: 'Message must have either "action" or "type" field' };
    }

    return { isValid: true };
  }

  /**
   * Validate message type against whitelist
   * @private
   */
  _validateMessageType(message) {
    const messageType = message.action || message.type;
    
    if (typeof messageType !== 'string') {
      return { isValid: false, error: 'Message type must be a string' };
    }

    if (!this.VALIDATION_PATTERNS.MESSAGE_TYPE.test(messageType)) {
      return { isValid: false, error: 'Message type contains invalid characters' };
    }

    if (!this.ALLOWED_MESSAGE_TYPES.includes(messageType)) {
      return { isValid: false, error: `Message type '${messageType}' is not allowed` };
    }

    return { isValid: true };
  }

  /**
   * Validate message size limits
   * @private
   */
  _validateMessageSize(message, messageType) {
    // Allow larger or bypass size check for 'clip' messages that include full-page HTML
    if (messageType === 'clip') {
      // Still protect from extreme payloads: impose a generous upper bound
      try {
        const slimCopy = { ...message };
        // Exclude heavy HTML payloads from size calculation (handled downstream)
        delete slimCopy.dom;
        delete slimCopy.selection;
        if (slimCopy.readability) delete slimCopy.readability;
        const baseSize = new Blob([JSON.stringify(slimCopy || {})]).size;
        // Arbitrary large ceiling (100MB) to avoid abuse while permitting big pages
        const maxClipPayload = 100 * 1024 * 1024;
        if (baseSize > maxClipPayload) {
          return { isValid: false, error: `Clip base payload too large: ${baseSize} > ${maxClipPayload}` };
        }
      } catch (e) {
        // If size computation fails, allow and let downstream handle
      }
      return { isValid: true };
    }
    const messageString = JSON.stringify(message);
    const messageSize = new Blob([messageString]).size;

    if (messageSize > this.MAX_SIZES.MESSAGE_SIZE) {
      return { 
        isValid: false, 
        error: `Message size ${messageSize} exceeds limit of ${this.MAX_SIZES.MESSAGE_SIZE}` 
      };
    }

    return { isValid: true };
  }

  /**
   * Sanitize message content to prevent XSS
   * @private
   */
  _sanitizeMessageContent(message, messageType) {
    const sanitized = JSON.parse(JSON.stringify(message)); // Deep clone

    // Sanitize string fields recursively
    this._sanitizeObjectRecursively(sanitized);

    // Preserve raw HTML fields for 'clip' messages to avoid breaking extraction
    if (messageType === 'clip') {
      if (typeof message.dom === 'string') sanitized.dom = message.dom;
      if (typeof message.selection === 'string') sanitized.selection = message.selection;
      // Also preserve readability result (HTML string) without escaping
      if (message.readability && typeof message.readability === 'object') {
        const r = {};
        if (typeof message.readability.title === 'string') r.title = message.readability.title;
        if (typeof message.readability.content === 'string') r.content = message.readability.content;
        if (typeof message.readability.byline === 'string') r.byline = message.readability.byline;
        if (typeof message.readability.excerpt === 'string') r.excerpt = message.readability.excerpt;
        sanitized.readability = r;
      }
    }

    return sanitized;
  }

  /**
   * Recursively sanitize object properties
   * @private
   */
  _sanitizeObjectRecursively(obj) {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        
        if (typeof value === 'string') {
          obj[key] = this._sanitizeString(value);
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          this._sanitizeObjectRecursively(value);
        } else if (Array.isArray(value)) {
          value.forEach((item, index) => {
            if (typeof item === 'string') {
              value[index] = this._sanitizeString(item);
            } else if (typeof item === 'object' && item !== null) {
              this._sanitizeObjectRecursively(item);
            }
          });
        }
      }
    }
  }

  /**
   * Sanitize individual string values
   * @private
   */
  _sanitizeString(str) {
    if (typeof str !== 'string') return str;

    // Remove potential XSS patterns
    let sanitized = str.replace(this.VALIDATION_PATTERNS.POTENTIAL_XSS, '');
    
    // HTML entity encode dangerous characters
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');

    return sanitized;
  }

  /**
   * Validate specific message types
   * @private
   */
  _validateByMessageType(message) {
    const messageType = message.action || message.type;

    switch (messageType) {
      case 'downloadMarkdown':
      case 'download':
        return this._validateDownloadMessage(message);
        
      case 'extractContent':
        return this._validateExtractionMessage(message);
        
      case 'getHealthStatus':
      case 'systemStatus':
        return this._validateStatusMessage(message);
        
      default:
        return { isValid: true, sanitizedData: message };
    }
  }

  /**
   * Validate download-specific message content
   * @private
   */
  _validateDownloadMessage(message) {
    const errors = [];
    const sanitizedMessage = { ...message };

    // Validate URL if present
    if (message.url) {
      const urlValidation = this.validateUrl(message.url);
      if (!urlValidation.isValid) {
        errors.push(`Invalid URL: ${urlValidation.error}`);
      } else {
        sanitizedMessage.url = urlValidation.sanitizedUrl;
      }
    }

    // Validate filename if present
    if (message.filename) {
      const filenameValidation = this.validateFilename(message.filename);
      if (!filenameValidation.isValid) {
        errors.push(`Invalid filename: ${filenameValidation.error}`);
      } else {
        sanitizedMessage.filename = filenameValidation.sanitizedFilename;
      }
    }

    // Validate title length
    if (message.title && message.title.length > this.MAX_SIZES.TITLE_LENGTH) {
      sanitizedMessage.title = message.title.substring(0, this.MAX_SIZES.TITLE_LENGTH);
    }

    // Validate content size
    if (message.content) {
      const contentSize = new Blob([message.content]).size;
      if (contentSize > this.MAX_SIZES.CONTENT_SIZE) {
        errors.push(`Content size ${contentSize} exceeds limit of ${this.MAX_SIZES.CONTENT_SIZE}`);
      }
    }

    if (errors.length > 0) {
      return { isValid: false, error: errors.join('; ') };
    }

    return { isValid: true, sanitizedData: sanitizedMessage };
  }

  /**
   * Validate content extraction message
   * @private
   */
  _validateExtractionMessage(message) {
    const errors = [];

    if (message.url) {
      const urlValidation = this.validateUrl(message.url);
      if (!urlValidation.isValid) {
        errors.push(`Invalid URL: ${urlValidation.error}`);
      }
    }

    if (errors.length > 0) {
      return { isValid: false, error: errors.join('; ') };
    }

    return { isValid: true, sanitizedData: message };
  }

  /**
   * Validate status request message
   * @private
   */
  _validateStatusMessage(message) {
    // Status messages should be minimal and safe
    return { isValid: true, sanitizedData: { action: message.action || message.type } };
  }

  /**
   * Validate URL format and safety
   * @param {string} url - URL to validate
   * @returns {Object} Validation result with sanitized URL
   */
  validateUrl(url) {
    if (!url || typeof url !== 'string') {
      return { isValid: false, error: 'URL must be a non-empty string' };
    }

    if (url.length > this.MAX_SIZES.URL_LENGTH) {
      return { isValid: false, error: 'URL exceeds maximum length' };
    }

    // Check for allowed protocols
    const isHttps = this.VALIDATION_PATTERNS.SAFE_URL.test(url);
    const isObsidian = this.VALIDATION_PATTERNS.OBSIDIAN_URL.test(url);

    if (!isHttps && !isObsidian) {
      return { isValid: false, error: 'Only HTTPS and Obsidian URLs are allowed' };
    }

    try {
      // Additional validation using URL constructor
      const urlObj = new URL(url);
      
      // Sanitize the URL by reconstructing it
      const sanitizedUrl = isObsidian ? url : `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}${urlObj.search}${urlObj.hash}`;
      
      return { isValid: true, sanitizedUrl };
    } catch (error) {
      return { isValid: false, error: 'Malformed URL structure' };
    }
  }

  /**
   * Validate filename safety
   * @param {string} filename - Filename to validate
   * @returns {Object} Validation result with sanitized filename
   */
  validateFilename(filename) {
    if (!filename || typeof filename !== 'string') {
      return { isValid: false, error: 'Filename must be a non-empty string' };
    }

    if (filename.length > this.MAX_SIZES.FILENAME_LENGTH) {
      return { isValid: false, error: 'Filename exceeds maximum length' };
    }

    // Check for directory traversal attacks
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return { isValid: false, error: 'Filename contains invalid path characters' };
    }

    // Validate filename pattern
    if (!this.VALIDATION_PATTERNS.SAFE_FILENAME.test(filename)) {
      return { isValid: false, error: 'Filename contains invalid characters' };
    }

    // Validate file extension
    if (!this.VALIDATION_PATTERNS.ALLOWED_EXTENSIONS.test(filename)) {
      return { isValid: false, error: 'File extension not allowed' };
    }

    // Sanitize filename by removing any remaining dangerous characters
    // 修复：保留冒号(:)，因为它在标题中很常见
    const sanitizedFilename = filename.replace(/[<>"|?*]/g, '_');

    return { isValid: true, sanitizedFilename };
  }

  /**
   * Create standardized validation error response
   * @private
   */
  _createValidationError(errorCode, errorMessage) {
    return {
      isValid: false,
      errorCode,
      error: errorMessage,
      timestamp: Date.now(),
      securityViolation: true
    };
  }

  /**
   * Log security violations for monitoring
   * @param {Object} validationResult - Failed validation result
   * @param {Object} originalMessage - Original message that failed validation
   */
  logSecurityViolation(validationResult, originalMessage) {
    const logEntry = {
      timestamp: Date.now(),
      errorCode: validationResult.errorCode,
      error: validationResult.error,
      messageType: originalMessage?.action || originalMessage?.type || 'unknown',
      severity: 'HIGH',
      source: 'SecurityValidator'
    };

    console.error('🚨 SECURITY VIOLATION:', logEntry);

    // If ErrorHandler is available, use it for structured logging
    if (self.ErrorHandler?.logSecurityViolation) {
      self.ErrorHandler.logSecurityViolation(logEntry);
    }
  }

  /**
   * Backward-compatible runtime message validation
   * Mirrors validateMessage but includes optional sender context.
   * @param {*} message - Raw runtime message
   * @param {*} sender - Optional sender info from browser.runtime.onMessage
   * @returns {Object} Validation result
   */
  validateRuntimeMessage(message, sender) {
    // Currently delegate to validateMessage; reserved for sender-aware checks
    const result = this.validateMessage(message);
    // Optionally, enrich context-specific info in the future
    return result;
  }

  /**
   * Backward-compatible runtime security violation logger
   * Mirrors logSecurityViolation while including sender context in logs.
   * @param {Object} validationResult - Failed validation result
   * @param {Object} originalMessage - Original message that failed validation
   * @param {Object} sender - Optional sender info
   */
  logRuntimeSecurityViolation(validationResult, originalMessage, sender) {
    const augmented = {
      ...validationResult,
      sender: sender ? {
        id: sender.id,
        url: sender.url,
        origin: sender.origin,
        tabId: sender.tab?.id
      } : undefined
    };
    // Reuse existing structured logger
    this.logSecurityViolation(augmented, originalMessage);
  }
}

// ============================================================================
// SECURITY ERROR CLASSES
// ============================================================================

/**
 * Custom error class for security violations
 */
class SecurityValidationError extends Error {
  constructor(message, errorCode, originalData) {
    super(message);
    this.name = 'SecurityValidationError';
    this.errorCode = errorCode;
    this.originalData = originalData;
    this.timestamp = Date.now();
    this.securityViolation = true;
  }
}

/**
 * Error boundary for security operations
 */
class SecurityErrorBoundary {
  /**
   * Wrap security operations with error handling
   * @param {Function} operation - Security operation to wrap
   * @param {Object} context - Context information for error handling
   * @returns {*} Operation result or null on error
   */
  static wrapSecurityOperation(operation, context = {}) {
    try {
      return operation();
    } catch (error) {
      console.error('🚨 Security operation failed:', error, context);
      
      if (self.ErrorHandler?.logError) {
        self.ErrorHandler.logError(error, context, 'security-operation-boundary');
      }

      return null;
    }
  }

  /**
   * Handle security validation failures with proper error recovery
   * @param {Error} error - Security error
   * @param {Object} context - Error context
   * @returns {Object} Safe error response
   */
  static handleSecurityError(error, context = {}) {
    const safeErrorResponse = {
      success: false,
      error: 'Security validation failed',
      errorCode: error.errorCode || 'SECURITY_ERROR',
      timestamp: Date.now()
    };

    // Log the full error details internally
    console.error('🛡️ Security Error Handled:', {
      error: error.message,
      errorCode: error.errorCode,
      context,
      stack: error.stack
    });

    return safeErrorResponse;
  }
}

// ============================================================================
// MODULE EXPORTS
// ============================================================================

// Make SecurityValidator available globally in service worker context
self.SecurityValidator = SecurityValidator;
self.SecurityValidationError = SecurityValidationError;
self.SecurityErrorBoundary = SecurityErrorBoundary;

console.log('🛡️ SecurityValidator module loaded and available');
