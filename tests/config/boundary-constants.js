/**
 * Boundary Constants for MarkDownload Testing
 * 
 * This file defines constants for boundary conditions and edge cases testing.
 * It centralizes magic numbers found in the codebase and provides configurable
 * limits for security and performance testing.
 * 
 * 🛡️ Magic Number Guardian - Configuration Security Constants
 */

// 📊 Numeric Boundary Constants
const BOUNDARIES = {
  // File Processing Limits
  MAX_FILE_SIZE_BYTES: 50 * 1024 * 1024, // 50MB max file size
  MIN_FILE_SIZE_BYTES: 0, // Empty file minimum
  MAX_FILENAME_LENGTH: 255, // Maximum filename length
  MIN_FILENAME_LENGTH: 1, // Minimum filename length
  
  // Content Processing Limits  
  MAX_HTML_DEPTH: 100, // Maximum nested HTML element depth
  MAX_IMAGE_COUNT: 500, // Maximum images per document
  MAX_LINK_COUNT: 1000, // Maximum links per document
  MAX_TEXT_LENGTH: 10 * 1024 * 1024, // 10MB max text content
  MIN_TEXT_LENGTH: 0, // Empty content minimum
  
  // Network and Performance Limits
  NETWORK_TIMEOUT_MS: 30000, // 30 second timeout
  MAX_RETRY_ATTEMPTS: 3, // Maximum retry attempts
  CONCURRENT_DOWNLOAD_LIMIT: 10, // Maximum concurrent downloads
  
  // String Processing Boundaries
  FENCE_SIZE_INCREMENT: 1, // Code fence size increment (from background.js:159)
  IMAGE_FILENAME_COUNTER_START: 1, // Image filename counter start (from background.js:44)
  MIN_FENCE_SIZE: 3, // Minimum code fence size
  MAX_FENCE_SIZE: 20, // Maximum code fence size for safety
  
  // Template Processing Limits
  MAX_TEMPLATE_DEPTH: 10, // Maximum template nesting depth
  MAX_VARIABLE_SUBSTITUTIONS: 100, // Maximum variable substitutions
  MAX_REGEX_REPLACEMENTS: 1000, // Maximum regex replacement operations
  
  // Browser API Limits
  MAX_TABS_PROCESSED: 50, // Maximum tabs processed at once
  MAX_CONTEXT_MENU_ITEMS: 20, // Maximum context menu items
  
  // Memory and Resource Limits
  MAX_MEMORY_USAGE_MB: 256, // Maximum memory usage
  MAX_PROCESSING_TIME_MS: 60000, // Maximum processing time (1 minute)
  
  // Unicode and Character Limits
  MIN_UNICODE_CODEPOINT: 0x0000, // Minimum valid Unicode
  MAX_UNICODE_CODEPOINT: 0x10FFFF, // Maximum valid Unicode
  CONTROL_CHAR_RANGES: [
    [0x0000, 0x0008], // C0 control characters (partial)
    [0x000B, 0x000C], // Vertical tab, form feed  
    [0x000E, 0x001F], // C0 control characters (continued)
    [0x007F, 0x009F], // DEL + C1 control characters
    [0x00AD, 0x00AD], // Soft hyphen
    [0x061C, 0x061C], // Arabic letter mark
    [0x200B, 0x200F], // Zero width spaces and marks
    [0x2028, 0x2029], // Line/paragraph separators
    [0xFEFF, 0xFEFF], // Byte order mark
    [0xFFF9, 0xFFFC]  // Interlinear annotation characters
  ]
};

// 🎯 Edge Case Test Values
const EDGE_CASES = {
  // Empty/Null/Undefined Values
  EMPTY_VALUES: [null, undefined, '', 0, [], {}],
  
  // Extreme String Values
  EMPTY_STRING: '',
  WHITESPACE_ONLY: '   \t\n\r   ',
  VERY_LONG_STRING: 'a'.repeat(10000),
  UNICODE_STRING: '🌟🔥💯✨🚀💎🎯🌈💡⚡',
  MIXED_UNICODE: 'Hello 世界 🌍 مرحبا नमस्ते',
  
  // Extreme Numeric Values  
  ZERO: 0,
  NEGATIVE_ONE: -1,
  MAX_SAFE_INTEGER: Number.MAX_SAFE_INTEGER,
  MIN_SAFE_INTEGER: Number.MIN_SAFE_INTEGER,
  INFINITY: Infinity,
  NEGATIVE_INFINITY: -Infinity,
  NAN: NaN,
  
  // Dangerous Strings (for security testing)
  XSS_PAYLOADS: [
    '<script>alert("xss")</script>',
    'javascript:alert("xss")',
    'data:text/html,<script>alert("xss")</script>',
    '<img src="x" onerror="alert(1)">',
    '<iframe src="javascript:alert(1)"></iframe>'
  ],
  
  // File Path Edge Cases
  DANGEROUS_PATHS: [
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32\\config\\sam',  
    '/dev/null',
    'CON', 'PRN', 'AUX', 'NUL', // Windows reserved names
    'com1', 'lpt1', // More Windows reserved names
  ],
  
  // Malformed HTML/Content
  MALFORMED_HTML: [
    '<div><p>Unclosed tags',
    '<script>incomplete',
    '<<>><>',
    '<div class="unclosed">',
    '<img src="missing quote>',
    '&lt;encoded&gt; &amp; &quot;mixed&quot;'
  ],
  
  // Invalid URLs
  INVALID_URLS: [
    'not-a-url',
    'http://',
    'https://',
    'ftp://incomplete',
    'javascript:void(0)',
    'data:,',
    'about:blank'
  ],
  
  // Problematic Characters in Filenames
  ILLEGAL_FILENAME_CHARS: ['/', '\\', '?', '<', '>', '\\', ':', '*', '|', '"'],
  
  // Large Content Samples
  LARGE_HTML: '<div>' + '<p>Content</p>'.repeat(10000) + '</div>',
  DEEPLY_NESTED_HTML: '<div>'.repeat(200) + 'content' + '</div>'.repeat(200),
  MANY_IMAGES_HTML: Array.from({length: 100}, (_, i) => 
    `<img src="image${i}.jpg" alt="Image ${i}">`
  ).join(''),
};

// ⚙️ Test Configuration
const TEST_CONFIG = {
  // Timeout configurations for different test types
  TIMEOUTS: {
    UNIT_TEST_MS: 5000,      // 5 seconds for unit tests
    INTEGRATION_TEST_MS: 15000, // 15 seconds for integration tests  
    STRESS_TEST_MS: 60000,   // 1 minute for stress tests
    BOUNDARY_TEST_MS: 10000, // 10 seconds for boundary tests
  },
  
  // Memory usage thresholds
  MEMORY_THRESHOLDS: {
    WARNING_MB: 100,
    ERROR_MB: 200,
    CRITICAL_MB: 256,
  },
  
  // Performance benchmarks
  PERFORMANCE_TARGETS: {
    SMALL_DOCUMENT_MS: 100,   // < 100ms for small documents
    MEDIUM_DOCUMENT_MS: 500,  // < 500ms for medium documents  
    LARGE_DOCUMENT_MS: 2000,  // < 2s for large documents
  },
  
  // Test data sizes
  DATA_SIZES: {
    SMALL_DOCUMENT_CHARS: 1000,
    MEDIUM_DOCUMENT_CHARS: 50000,
    LARGE_DOCUMENT_CHARS: 500000,
    STRESS_DOCUMENT_CHARS: 2000000,
  }
};

// 🔒 Security Test Configurations
const SECURITY_CONFIG = {
  // Content Security Policy violations
  CSP_VIOLATIONS: [
    "script-src 'unsafe-inline'",
    "object-src data:",
    "base-uri data:",
  ],
  
  // Sanitization test patterns
  SANITIZATION_TESTS: [
    { input: '<script>alert(1)</script>', expected: '' },
    { input: '<img src="x" onerror="alert(1)">', expected: '<img src="x">' },
    { input: 'javascript:alert(1)', expected: '' },
    { input: 'data:text/html,<script>alert(1)</script>', expected: '' },
  ],
  
  // Directory traversal patterns
  DIRECTORY_TRAVERSAL: [
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32\\hosts',
    '/etc/passwd',
    'C:\\windows\\system32\\config\\sam',
  ],
};

// Helper functions
const isWithinBounds = (value, min, max) => value >= min && value <= max;
const isValidFileSize = (size) => isWithinBounds(size, BOUNDARIES.MIN_FILE_SIZE_BYTES, BOUNDARIES.MAX_FILE_SIZE_BYTES);
const isValidFilename = (filename) => Boolean(filename && typeof filename === 'string' && filename.length > 0 && filename.length <= BOUNDARIES.MAX_FILENAME_LENGTH);
const containsIllegalChars = (filename) => EDGE_CASES.ILLEGAL_FILENAME_CHARS.some(char => filename.includes(char));

// Test data generators
const generateLargeString = (size) => 'a'.repeat(size);
const generateNestedHTML = (depth) => '<div>'.repeat(depth) + 'content' + '</div>'.repeat(depth);
const generateManyImages = (count) => Array.from({length: count}, (_, i) => `<img src="img${i}.jpg">`).join('');

module.exports = {
  BOUNDARIES,
  EDGE_CASES,
  TEST_CONFIG,
  SECURITY_CONFIG,
  
  // Helper functions
  isWithinBounds,
  isValidFileSize,
  isValidFilename,
  containsIllegalChars,
  
  // Test data generators
  generateLargeString,
  generateNestedHTML,
  generateManyImages,
};