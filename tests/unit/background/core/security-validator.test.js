/**
 * Security Validator Test Suite
 * 
 * Comprehensive tests targeting 25% branch coverage (37 of 149 branches)
 * Focus on critical security validation pathways and error conditions
 * 
 * @coverage-target 25% branches (37/149)
 * @priority A-group (0% baseline)
 */

describe('SecurityValidator', () => {
  let securityValidator;

  beforeEach(() => {
    // Mock console methods
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    
    // Load the SecurityValidator module
    require('../../../../src/background/core/security-validator.js');
    securityValidator = new SecurityValidator();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Constructor and Initialization', () => {
    test('should initialize with correct validation patterns', () => {
      expect(securityValidator.VALIDATION_PATTERNS.SAFE_URL).toBeInstanceOf(RegExp);
      expect(securityValidator.VALIDATION_PATTERNS.MESSAGE_TYPE).toBeInstanceOf(RegExp);
      expect(securityValidator.VALIDATION_PATTERNS.SAFE_FILENAME).toBeInstanceOf(RegExp);
      expect(securityValidator.MAX_SIZES.MESSAGE_SIZE).toBe(10 * 1024 * 1024);
    });

    test('should have frozen configuration objects', () => {
      expect(Object.isFrozen(securityValidator.VALIDATION_PATTERNS)).toBe(true);
      expect(Object.isFrozen(securityValidator.MAX_SIZES)).toBe(true);
      expect(Object.isFrozen(securityValidator.ALLOWED_MESSAGE_TYPES)).toBe(true);
    });
  });

  describe('Message Structure Validation', () => {
    test('should reject null message', () => {
      const result = securityValidator.validateMessage(null);
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('INVALID_STRUCTURE');
      expect(result.error).toContain('Message must be a non-null object');
    });

    test('should reject undefined message', () => {
      const result = securityValidator.validateMessage(undefined);
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('INVALID_STRUCTURE');
    });

    test('should reject array message', () => {
      const result = securityValidator.validateMessage([]);
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('INVALID_STRUCTURE');
      expect(result.error).toContain('Message cannot be an array');
    });

    test('should reject message without action or type field', () => {
      const result = securityValidator.validateMessage({});
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('INVALID_STRUCTURE');
      expect(result.error).toContain('Message must have either "action" or "type" field');
    });

    test('should accept message with action field', () => {
      const result = securityValidator.validateMessage({ action: 'downloadMarkdown' });
      expect(result.isValid).toBe(true);
    });

    test('should accept message with type field', () => {
      const result = securityValidator.validateMessage({ type: 'getHealthStatus' });
      expect(result.isValid).toBe(true);
    });
  });

  describe('Message Type Validation', () => {
    test('should reject non-string message type', () => {
      const result = securityValidator.validateMessage({ action: 123 });
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('INVALID_MESSAGE_TYPE');
      expect(result.error).toContain('Message type must be a string');
    });

    test('should reject message type with invalid characters', () => {
      const result = securityValidator.validateMessage({ action: 'invalid@type' });
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('INVALID_MESSAGE_TYPE');
      expect(result.error).toContain('Message type contains invalid characters');
    });

    test('should reject disallowed message type', () => {
      const result = securityValidator.validateMessage({ action: 'maliciousAction' });
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('INVALID_MESSAGE_TYPE');
      expect(result.error).toContain("Message type 'maliciousAction' is not allowed");
    });

    test('should accept allowed message types', () => {
      const allowedTypes = ['downloadMarkdown', 'getHealthStatus', 'extractContent'];
      allowedTypes.forEach(type => {
        const result = securityValidator.validateMessage({ action: type });
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('URL Validation', () => {
    test('should reject null URL', () => {
      const result = securityValidator.validateUrl(null);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('URL must be a non-empty string');
    });

    test('should reject empty URL', () => {
      const result = securityValidator.validateUrl('');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('URL must be a non-empty string');
    });

    test('should reject non-string URL', () => {
      const result = securityValidator.validateUrl(123);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('URL must be a non-empty string');
    });

    test('should reject URL exceeding maximum length', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2048);
      const result = securityValidator.validateUrl(longUrl);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('URL exceeds maximum length');
    });

    test('should accept HTTP URLs (current pattern allows both)', () => {
      const result = securityValidator.validateUrl('http://example.com');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedUrl).toBe('http://example.com/');
    });

    test('should accept HTTPS URLs', () => {
      const result = securityValidator.validateUrl('https://example.com/path');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedUrl).toBe('https://example.com/path');
    });

    test('should accept Obsidian URLs', () => {
      const obsidianUrl = 'obsidian://vault/note';
      const result = securityValidator.validateUrl(obsidianUrl);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedUrl).toBe(obsidianUrl);
    });

    test('should handle malformed URLs', () => {
      const result = securityValidator.validateUrl('https://malformed url with spaces');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Malformed URL structure');
    });

    test('should sanitize HTTPS URLs by reconstructing', () => {
      const result = securityValidator.validateUrl('https://example.com:8080/path?query=1#fragment');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedUrl).toBe('https://example.com:8080/path?query=1#fragment');
    });
  });

  describe('Filename Validation', () => {
    test('should reject null filename', () => {
      const result = securityValidator.validateFilename(null);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Filename must be a non-empty string');
    });

    test('should reject empty filename', () => {
      const result = securityValidator.validateFilename('');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Filename must be a non-empty string');
    });

    test('should reject filename exceeding maximum length', () => {
      const longFilename = 'a'.repeat(256) + '.md';
      const result = securityValidator.validateFilename(longFilename);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Filename exceeds maximum length');
    });

    test('should reject filename with directory traversal', () => {
      const traversalFilenames = ['../test.md', 'test/../file.md', 'test\\file.md'];
      traversalFilenames.forEach(filename => {
        const result = securityValidator.validateFilename(filename);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Filename contains invalid path characters');
      });
    });

    test('should reject filename with disallowed extension', () => {
      const result = securityValidator.validateFilename('test.exe');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('File extension not allowed');
    });

    test('should accept valid markdown filename', () => {
      const result = securityValidator.validateFilename('test-file.md');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedFilename).toBe('test-file.md');
    });

    test('should accept filename with colons (common in titles)', () => {
      const result = securityValidator.validateFilename('Article: Important Topic.md');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedFilename).toBe('Article: Important Topic.md');
    });

    test('should reject filename with dangerous characters', () => {
      const result = securityValidator.validateFilename('test<>"|?*file.md');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Filename contains invalid characters');
    });
  });

  describe('Message Size Validation', () => {
    test('should accept normal sized messages', () => {
      const message = { action: 'downloadMarkdown', title: 'Test' };
      const result = securityValidator.validateMessage(message);
      expect(result.isValid).toBe(true);
    });

    test('should handle clip messages with special size rules', () => {
      const clipMessage = {
        action: 'clip',
        dom: '<html><body>Large DOM content</body></html>',
        selection: 'Selected text content',
        readability: {
          title: 'Article Title',
          content: 'Article content',
          byline: 'Author',
          excerpt: 'Article excerpt'
        }
      };
      const result = securityValidator.validateMessage(clipMessage);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Content Sanitization', () => {
    test('should sanitize string values to prevent XSS', () => {
      const message = {
        action: 'downloadMarkdown',
        title: '<script>alert("xss")</script>Test Title',
        content: 'Safe content with <b>bold</b> text'
      };
      const result = securityValidator.validateMessage(message);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedMessage.title).not.toContain('<script>');
      expect(result.sanitizedMessage.title).toContain('&lt;');
    });

    test('should preserve HTML in clip message DOM field', () => {
      const clipMessage = {
        action: 'clip',
        dom: '<div><p>Article content with <strong>formatting</strong></p></div>',
        title: 'Should be sanitized'
      };
      const result = securityValidator.validateMessage(clipMessage);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedMessage.dom).toContain('<div><p>');
      expect(result.sanitizedMessage.title).not.toContain('<');
    });
  });

  describe('Error Handling and Validation Exceptions', () => {
    test('should handle validation exceptions gracefully', () => {
      // Mock JSON.stringify to throw an error
      const originalStringify = JSON.stringify;
      JSON.stringify = jest.fn(() => {
        throw new Error('Stringify error');
      });

      const result = securityValidator.validateMessage({ action: 'downloadMarkdown' });
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_EXCEPTION');
      
      JSON.stringify = originalStringify;
    });

    test('should create proper validation error objects', () => {
      const result = securityValidator.validateMessage(null);
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('INVALID_STRUCTURE');
      expect(result.error).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.securityViolation).toBe(true);
    });
  });

  describe('Runtime Message Validation (Backward Compatibility)', () => {
    test('should validate runtime messages', () => {
      const message = { action: 'downloadMarkdown' };
      const sender = { id: 'extension-id', url: 'https://example.com' };
      
      const result = securityValidator.validateRuntimeMessage(message, sender);
      expect(result.isValid).toBe(true);
    });

    test('should handle runtime security violations with sender context', () => {
      const validationResult = {
        isValid: false,
        errorCode: 'TEST_ERROR',
        error: 'Test error message'
      };
      const originalMessage = { action: 'invalidAction' };
      const sender = { id: 'ext-id', url: 'https://test.com', tab: { id: 123 } };

      securityValidator.logRuntimeSecurityViolation(validationResult, originalMessage, sender);
      
      expect(console.error).toHaveBeenCalled();
    });
  });
});

describe('SecurityValidationError', () => {
  test('should create proper error instances', () => {
    const error = new SecurityValidationError('Test message', 'TEST_CODE', { data: 'test' });
    
    expect(error.name).toBe('SecurityValidationError');
    expect(error.message).toBe('Test message');
    expect(error.errorCode).toBe('TEST_CODE');
    expect(error.originalData).toEqual({ data: 'test' });
    expect(error.timestamp).toBeDefined();
    expect(error.securityViolation).toBe(true);
  });
});

describe('SecurityErrorBoundary', () => {
  test('should wrap operations and return results', () => {
    const operation = jest.fn(() => 'success');
    const result = SecurityErrorBoundary.wrapSecurityOperation(operation);
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalled();
  });

  test('should handle operation failures', () => {
    const operation = jest.fn(() => {
      throw new Error('Operation failed');
    });
    const result = SecurityErrorBoundary.wrapSecurityOperation(operation);
    
    expect(result).toBe(null);
    expect(console.error).toHaveBeenCalled();
  });

  test('should create safe error responses', () => {
    const error = new SecurityValidationError('Test error', 'TEST_CODE');
    const response = SecurityErrorBoundary.handleSecurityError(error);
    
    expect(response.success).toBe(false);
    expect(response.error).toBe('Security validation failed');
    expect(response.errorCode).toBe('TEST_CODE');
    expect(response.timestamp).toBeDefined();
  });
});
