/**
 * Test utility functions for MarkDownload testing
 */

/**
 * Creates a complete test environment with all mocks
 */
function setupTestEnvironment() {
  // Browser mocks are already set up globally
  const browserMock = global.browser;
  
  // Ensure TurndownService is properly available as a constructor
  const TurndownService = global.TurndownService || require('../mocks/turndownServiceMocks.js').TurndownService;
  const Readability = global.Readability || jest.fn();
  
  return {
    browser: browserMock,
    TurndownService: TurndownService,
    Readability: Readability
  };
}

/**
 * Resets all mocks between tests
 */
function resetTestEnvironment() {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Reset browser mocks if helper available
  if (global.mockBrowserHelpers && global.mockBrowserHelpers.reset) {
    global.mockBrowserHelpers.reset();
  }
  
  // Reset DOM
  if (global.document) {
    global.document.body.innerHTML = '';
    global.document.head.innerHTML = '';
  }
}

/**
 * Creates a mock article object with default values
 */
function createMockArticle(overrides = {}) {
  return {
    title: 'Test Article',
    content: '<p>Test content</p>',
    textContent: 'Test content',
    length: 100,
    excerpt: 'Test excerpt',
    byline: 'Test Author',
    dir: 'ltr',
    baseURI: 'https://example.com',
    pageTitle: 'Test Article',
    hash: '',
    host: 'example.com',
    origin: 'https://example.com',
    hostname: 'example.com',
    pathname: '/',
    port: '',
    protocol: 'https:',
    search: '',
    keywords: ['test', 'article'],
    math: {},
    ...overrides
  };
}

/**
 * Creates a mock DOM document for testing
 */
function createMockDocument(htmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  
  // Add missing properties for testing using defineProperty
  try {
    Object.defineProperty(doc, 'baseURI', {
      value: 'https://example.com',
      writable: true,
      configurable: true
    });
  } catch (e) {
    // Ignore if baseURI can't be set
  }
  
  if (!doc.title) {
    try {
      doc.title = 'Test Document';
    } catch (e) {
      // Ignore if title can't be set
    }
  }
  
  return doc;
}

/**
 * Creates mock browser tab for testing
 */
function createMockTab(overrides = {}) {
  return {
    id: 1,
    index: 0,
    windowId: 1,
    highlighted: false,
    active: true,
    pinned: false,
    url: 'https://example.com/test',
    title: 'Test Page',
    favIconUrl: 'https://example.com/favicon.ico',
    status: 'complete',
    incognito: false,
    width: 1200,
    height: 800,
    ...overrides
  };
}

/**
 * Creates mock options with default values
 */
function createMockOptions(overrides = {}) {
  return {
    headingStyle: "atx",
    hr: "___",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    fence: "```",
    emDelimiter: "_",
    strongDelimiter: "**",
    linkStyle: "inlined",
    linkReferenceStyle: "full",
    imageStyle: "markdown",
    imageRefStyle: "inlined",
    frontmatter: "---\\ncreated: {date:YYYY-MM-DDTHH:mm:ss}\\ntags: [{keywords}]\\nsource: {baseURI}\\nauthor: {byline}\\n---\\n\\n# {pageTitle}\\n\\n> ## Excerpt\\n> {excerpt}\\n\\n---",
    backmatter: "",
    title: "{pageTitle}",
    includeTemplate: false,
    saveAs: false,
    downloadImages: false,
    imagePrefix: '{pageTitle}/',
    mdClipsFolder: null,
    disallowedChars: '[]#^',
    downloadMode: 'downloadsApi',
    turndownEscape: true,
    contextMenus: true,
    obsidianIntegration: false,
    obsidianVault: "",
    obsidianFolder: "",
    ...overrides
  };
}

/**
 * Simulates content script execution result
 */
function createContentScriptResult(overrides = {}) {
  return {
    dom: '<!DOCTYPE html><html><head><title>Test</title></head><body><h1>Test Article</h1><p>Test content</p></body></html>',
    selection: '',
    ...overrides
  };
}

/**
 * Waits for async operations to complete
 */
function waitForAsync(timeout = 0) {
  return new Promise(resolve => setTimeout(resolve, timeout));
}

/**
 * Simulates file download completion
 */
function simulateDownloadComplete(downloadId, success = true) {
  const listener = global.browser.downloads.onChanged.addListener.mock.calls
    .find(call => call[0])?.pop();
  
  if (listener) {
    listener({
      id: downloadId,
      state: { current: success ? 'complete' : 'interrupted' },
      error: success ? undefined : { current: 'NETWORK_FAILED' }
    });
  }
}

/**
 * Creates a mock blob URL for testing
 */
function createMockBlobURL(content = 'mock content') {
  const url = 'blob:mock-url-' + Math.random().toString(36).substr(2, 9);
  global.URL.createObjectURL.mockReturnValue(url);
  return url;
}

/**
 * Verifies that markdown output contains expected elements
 */
function verifyMarkdownOutput(markdown, expectations) {
  const checks = {
    hasHeaders: (level) => new RegExp(`^#{${level}} `).test(markdown),
    hasLinks: () => /\[.*?\]\(.*?\)/.test(markdown),
    hasImages: () => /!\[.*?\]\(.*?\)/.test(markdown),
    hasCodeBlocks: () => /```[\s\S]*?```/.test(markdown),
    hasInlineCode: () => /`[^`]+`/.test(markdown),
    hasListItems: () => /^[-*+] /m.test(markdown),
    hasBold: () => /\*\*.*?\*\*/.test(markdown),
    hasItalic: () => /\*.*?\*/.test(markdown),
    containsText: (text) => markdown.includes(text),
    hasTemplate: () => /^---[\s\S]*?---/m.test(markdown)
  };

  const results = {};
  Object.keys(expectations).forEach(check => {
    if (checks[check]) {
      results[check] = checks[check](expectations[check]);
    }
  });

  return results;
}

/**
 * Mock context menu info objects
 */
function createMockContextMenuInfo(overrides = {}) {
  return {
    menuItemId: 'copy-markdown-all',
    editable: false,
    frameId: 0,
    frameUrl: 'https://example.com',
    pageUrl: 'https://example.com',
    selectionText: '',
    wasChecked: false,
    ...overrides
  };
}

/**
 * Simulates keyboard command execution
 */
function simulateKeyboardCommand(command) {
  const listener = global.browser.commands.onCommand.addListener.mock.calls[0]?.[0];
  if (listener) {
    listener(command);
  }
}

/**
 * Creates a test image blob
 */
function createTestImageBlob() {
  return new Blob(['mock image data'], { type: 'image/png' });
}

/**
 * Validates that a filename is safe and valid
 */
function validateFileName(filename) {
  const illegalChars = /[\/\?<>\\:\*\|":]/g;
  const hasIllegalChars = illegalChars.test(filename);
  const isEmpty = !filename || filename.trim() === '';
  const tooLong = filename.length > 255;
  
  return {
    isValid: !hasIllegalChars && !isEmpty && !tooLong,
    hasIllegalChars,
    isEmpty,
    tooLong,
    cleanFilename: filename.replace(illegalChars, '').trim()
  };
}

/**
 * Creates a mock clipboard API
 */
function mockClipboard() {
  const clipboard = {
    writeText: jest.fn().mockResolvedValue(),
    readText: jest.fn().mockResolvedValue('clipboard content')
  };
  
  Object.defineProperty(global.navigator, 'clipboard', {
    value: clipboard,
    writable: true
  });
  
  return clipboard;
}

/**
 * Simulates network failure for testing error handling
 */
function simulateNetworkFailure(mockFunction) {
  mockFunction.mockRejectedValueOnce(new Error('Network request failed'));
}

/**
 * Creates test data for template variable replacement
 */
function createTemplateTestData() {
  return {
    pageTitle: 'Test Article Title',
    baseURI: 'https://example.com/article',
    byline: 'Test Author',
    excerpt: 'This is a test excerpt',
    keywords: ['javascript', 'testing', 'tutorial'],
    host: 'example.com',
    pathname: '/article',
    date: '2024-01-15T10:30:00'
  };
}

/**
 * Validates template variable replacement
 */
function validateTemplateReplacement(template, data, result) {
  const expectations = {};
  
  // Check for variable replacements
  Object.keys(data).forEach(key => {
    const pattern = new RegExp(`{${key}}`, 'g');
    if (template.includes(`{${key}}`)) {
      expectations[key] = result.includes(data[key]);
    }
  });
  
  // Check for date formatting
  const datePatterns = template.match(/{date:([^}]+)}/g) || [];
  datePatterns.forEach(pattern => {
    const format = pattern.replace(/{date:([^}]+)}/, '$1');
    expectations[`date_${format}`] = !result.includes(pattern);
  });
  
  return expectations;
}

/**
 * Setup test environment before each test
 */
function setupEach() {
  setupTestEnvironment();
}

/**
 * Cleanup test environment after each test
 */
function teardownEach() {
  resetTestEnvironment();
}

/**
 * Enhanced Mock Functions for Boundary Testing
 * Magic Number Guardian - Test Function Mocks
 */

// REMOVED: mockGenerateValidFileName - Use real implementation from background.js

// REMOVED: mockTextReplace - Use real implementation from background.js

/**
 * Mock implementation of turndown for testing
 */
function mockTurndown(content, options, article) {
  if (!content) return { markdown: '', imageList: {} };
  
  // Basic HTML to Markdown conversion for testing
  let markdown = content;

  // Handle ordered lists first
  markdown = markdown.replace(/<ol[^>]*>(.*?)<\/ol>/gis, (match, listContent) => {
    let counter = 1;
    return listContent.replace(/<li[^>]*>(.*?)<\/li>/gi, (liMatch, liContent) => {
      return `${counter++}. ${liContent.trim()}\n`;
    }) + '\n';
  });

  // Handle unordered lists
  markdown = markdown.replace(/<ul[^>]*>(.*?)<\/ul>/gis, (match, listContent) => {
    return listContent.replace(/<li[^>]*>(.*?)<\/li>/gi, (liMatch, liContent) => {
      return `- ${liContent.trim()}\n`;
    }) + '\n';
  });

  // Apply other conversions
  markdown = markdown
    .replace(/<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi, (match, level, text) => '#'.repeat(parseInt(level)) + ' ' + text + '\n\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)')
    .replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*>/gi, '![$1]($2)')
    .replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '![]($1)')
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    .replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis, '```\n$1\n```')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '') // Remove remaining HTML tags
    .replace(/\n{3,}/g, '\n\n'); // Normalize multiple newlines

  // Add frontmatter and backmatter if configured
  if (options.includeTemplate) {
    markdown = (options.frontmatter || '') + markdown + (options.backmatter || '');
  }

  return { 
    markdown: markdown.trim(), 
    imageList: {} 
  };
}

/**
 * Mock implementation of convertArticleToMarkdown for testing
 */
function mockConvertArticleToMarkdown(article, downloadImages = null) {
  const options = createMockOptions({ downloadImages: downloadImages || false });
  const result = mockTurndown(article.content, options, article);
  return Promise.resolve(result);
}

/**
 * Load source module with error handling for testing
 */
function loadSourceModule(modulePath) {
  try {
    const path = require('path');
    const fs = require('fs');
    const fullPath = path.join(__dirname, '../../src', modulePath);
    
    // Special handling for browser extension files that can't be directly required
    if (modulePath.includes('background/background.js') || 
        modulePath.includes('background/service-worker.js') ||
        modulePath.includes('contentScript/')) {
      
      // Silently loading browser extension file: ${modulePath}
      
      // For background scripts, we need to simulate the environment
      if (modulePath.includes('background/')) {
        // Ensure all global dependencies are available before loading
        if (typeof global.TurndownService === 'undefined') {
          // TurndownService not available, loading should be handled by mocks
        }
        
        // Read the file and evaluate it in the current context
        const fileContent = fs.readFileSync(fullPath, 'utf8');
        
        // Create a safe execution context
        const context = {
          ...global,
          __filename: fullPath,
          __dirname: path.dirname(fullPath),
          module: { exports: {} },
          exports: {},
          console: console,
          // Browser globals should already be mocked
          browser: global.browser,
          chrome: global.chrome,
          TurndownService: global.TurndownService,
          turndownPluginGfm: global.turndownPluginGfm,
          turndown: global.turndown,
          importScripts: global.importScripts || (() => {}),
          // Service worker specific globals
          self: global,
          // Mock other potential dependencies
          Readability: global.Readability,
          moment: global.moment
        };
        
        try {
          // Use VM to run the code in a controlled context
          const vm = require('vm');
          vm.runInNewContext(fileContent, context, { filename: fullPath });
          
          // Extract exports or create a mock module
          const moduleExports = context.module.exports || context.exports || {};
          
          // If the file defines functions globally, try to extract them
          const extractedFunctions = {};
          [
            'turndown', 'convertArticleToMarkdown', 'processPage', 'notify',
            'generateValidFileName', 'textReplace', 'downloadFile', 
            'processDocument', 'extractArticleContent', 'sanitizeFilename'
          ].forEach(funcName => {
            if (typeof context[funcName] === 'function') {
              extractedFunctions[funcName] = context[funcName];
            }
          });
          
          // Make key functions available globally for tests
          if (extractedFunctions.generateValidFileName) {
            global.generateValidFileName = extractedFunctions.generateValidFileName;
          }
          if (extractedFunctions.turndown) {
            global.turndown = extractedFunctions.turndown;
          }
          if (extractedFunctions.textReplace) {
            global.textReplace = extractedFunctions.textReplace;
          }

          return {
            ...moduleExports,
            ...extractedFunctions,
            __moduleLoaded: true,
            __modulePath: modulePath
          };
        } catch (vmError) {
          // Could not execute ${modulePath} in VM: ${vmError.message}
          // Return a mock module for testing and set global fallbacks
          const mockModule = createMockModule(modulePath);
          
          // Ensure critical functions are available globally as fallbacks
          if (!global.generateValidFileName && mockModule.generateValidFileName) {
            global.generateValidFileName = mockModule.generateValidFileName;
          }
          if (!global.turndown && mockModule.turndown) {
            global.turndown = mockModule.turndown;
          }
          
          return mockModule;
        }
      }
      
      // For content scripts or other files that can't be loaded directly
      return createMockModule(modulePath);
    }
    
    // For regular modules that can be required
    return require(fullPath);
    
  } catch (error) {
    // Could not load source module ${modulePath}: ${error.message}
    return createMockModule(modulePath);
  }
}

/**
 * Create a mock module for testing when real module can't be loaded
 */
function createMockModule(modulePath) {
  const mockModule = {
    __isMock: true,
    __modulePath: modulePath
  };
  
  // Create mock functions based on the module type
  if (modulePath.includes('background/')) {
    mockModule.turndown = global.turndown || jest.fn();
    mockModule.convertArticleToMarkdown = jest.fn().mockResolvedValue('# Mock Markdown');
    mockModule.processPage = jest.fn().mockResolvedValue({ success: true });
    mockModule.notify = jest.fn();
    mockModule.generateValidFileName = function(title) {
      throw new Error('generateValidFileName not available: load real module from src/background/background.js');
    };
    mockModule.textReplace = function(content, replacements) {
      throw new Error('textReplace not available: load real module from src/background/background.js');
    };
    mockModule.downloadFile = jest.fn().mockResolvedValue({ success: true });
  }
  
  if (modulePath.includes('contentScript/')) {
    mockModule.extractContent = jest.fn();
    mockModule.processPage = jest.fn();
  }
  
  return mockModule;
}

/**
 * Process document mock for performance testing
 */
function processDocument(content) {
  return new Promise((resolve) => {
    // Simulate processing time based on content length
    const processingTime = Math.min(content.length / 1000, 1000);
    setTimeout(() => {
      resolve(mockTurndown(content, createMockOptions(), { baseURI: 'https://example.com' }));
    }, processingTime);
  });
}

/**
 * URL validation mock for testing
 */
function isValidUrl(url) {
  if (!url || typeof url !== 'string') return false;
  
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Memory usage monitoring for testing
 */
function getMemoryUsage() {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const usage = process.memoryUsage();
    return {
      heapUsed: usage.heapUsed / 1024 / 1024, // MB
      heapTotal: usage.heapTotal / 1024 / 1024, // MB
      external: usage.external / 1024 / 1024, // MB
    };
  }
  return { heapUsed: 0, heapTotal: 0, external: 0 };
}

/**
 * Performance monitoring utilities
 */
const performanceUtils = {
  timers: new Map(),
  
  start(name) {
    this.timers.set(name, {
      start: Date.now(),
      memory: getMemoryUsage()
    });
  },
  
  end(name) {
    const timer = this.timers.get(name);
    if (!timer) return null;
    
    const duration = Date.now() - timer.start;
    const endMemory = getMemoryUsage();
    const memoryDelta = endMemory.heapUsed - timer.memory.heapUsed;
    
    this.timers.delete(name);
    
    return {
      duration,
      memoryDelta,
      startMemory: timer.memory,
      endMemory
    };
  }
};

/**
 * Security testing utilities
 */
const securityTestUtils = {
  /**
   * Check if text contains potential XSS patterns
   */
  hasXSSPatterns(text) {
    const xssPatterns = [
      /<script[^>]*>/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
      /data:text\/html/i
    ];
    
    return xssPatterns.some(pattern => pattern.test(text));
  },
  
  /**
   * Check if text contains path traversal patterns
   */
  hasPathTraversal(text) {
    const pathPatterns = [
      /\.\.[\/\\]/,
      /\/etc\//i,
      /\\windows\\/i,
      /C:\\/i
    ];
    
    return pathPatterns.some(pattern => pattern.test(text));
  },
  
  /**
   * Sanitize text for security testing
   */
  sanitize(text) {
    if (!text || typeof text !== 'string') return '';
    
    return text
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
      .replace(/<object[^>]*>.*?<\/object>/gi, '')
      .replace(/<embed[^>]*>/gi, '');
  }
};

/**
 * Boundary testing utilities
 */
const boundaryTestUtils = {
  /**
   * Generate test data at boundary values
   */
  generateBoundaryData(type, size) {
    switch (type) {
      case 'string':
        return 'a'.repeat(size);
      case 'html':
        return '<div>' + '<p>Content</p>'.repeat(size / 20) + '</div>';
      case 'nested':
        return '<div>'.repeat(size) + 'content' + '</div>'.repeat(size);
      case 'unicode':
        return '🌟'.repeat(size);
      default:
        return '';
    }
  },
  
  /**
   * Test data with edge case values
   */
  getEdgeCaseValues() {
    return [
      null,
      undefined,
      '',
      0,
      -1,
      Number.MAX_SAFE_INTEGER,
      Number.MIN_SAFE_INTEGER,
      Infinity,
      -Infinity,
      NaN,
      [],
      {},
      function() {},
      Symbol('test'),
      new Date(),
      /regex/
    ];
  }
};

// Export all functions for CommonJS
module.exports = {
  setupTestEnvironment,
  resetTestEnvironment,
  createMockArticle,
  createMockDocument,
  createMockTab,
  createMockOptions,
  createContentScriptResult,
  waitForAsync,
  simulateDownloadComplete,
  createMockBlobURL,
  verifyMarkdownOutput,
  createMockContextMenuInfo,
  simulateKeyboardCommand,
  createTestImageBlob,
  validateFileName,
  mockClipboard,
  simulateNetworkFailure,
  createTemplateTestData,
  validateTemplateReplacement,
  setupEach,
  teardownEach,
  
  // Enhanced functions for boundary testing
  // REMOVED: mockGenerateValidFileName, mockTextReplace - Use real implementations from background.js
  mockTurndown,
  mockConvertArticleToMarkdown,
  loadSourceModule,
  createMockModule,
  processDocument,
  isValidUrl,
  getMemoryUsage,
  performanceUtils,
  securityTestUtils,
  boundaryTestUtils
};

/**
 * Environment Configuration Provider
 * Replaces typeof jest !== 'undefined' checks with injectable configuration
 */
class EnvironmentConfig {
  constructor(config = {}) {
    this.config = {
      isTestEnvironment: true,
      dateProvider: new DateProvider(),
      ...config
    };
  }

  isTest() {
    return this.config.isTestEnvironment;
  }

  getDateProvider() {
    return this.config.dateProvider;
  }

  /**
   * Get environment-specific value
   * @param {any} testValue - Value to return in test environment
   * @param {any} prodValue - Value to return in production environment
   */
  getValue(testValue, prodValue) {
    return this.isTest() ? testValue : prodValue;
  }

  /**
   * Execute environment-specific logic
   * @param {function} testFn - Function to execute in test environment
   * @param {function} prodFn - Function to execute in production environment
   */
  execute(testFn, prodFn) {
    return this.isTest() ? testFn() : prodFn();
  }
}

/**
 * Date Provider for consistent date handling
 * Replaces moment() calls with configurable date source
 */
class DateProvider {
  constructor(options = {}) {
    this.fixedDate = options.fixedDate || new Date('2024-01-15T10:30:00Z');
    this.useFixed = options.useFixed !== false; // Default to true for tests
  }

  now() {
    return this.useFixed ? new Date(this.fixedDate) : new Date();
  }

  format(date, format = 'YYYY-MM-DDTHH:mm:ss') {
    const d = date || this.now();
    
    // Simple format replacements (can be enhanced as needed)
    return format
      .replace('YYYY', d.getFullYear())
      .replace('MM', String(d.getMonth() + 1).padStart(2, '0'))
      .replace('DD', String(d.getDate()).padStart(2, '0'))
      .replace('HH', String(d.getHours()).padStart(2, '0'))
      .replace('mm', String(d.getMinutes()).padStart(2, '0'))
      .replace('ss', String(d.getSeconds()).padStart(2, '0'));
  }

  setFixedDate(date) {
    this.fixedDate = new Date(date);
  }

  setUseFixed(useFixed) {
    this.useFixed = useFixed;
  }
}

/**
 * Test Environment Factory
 * Creates configured environment for different test scenarios
 */
function createTestEnvironment(overrides = {}) {
  const config = new EnvironmentConfig({
    isTestEnvironment: true,
    dateProvider: new DateProvider({ 
      fixedDate: new Date('2024-01-15T10:30:00Z'),
      useFixed: true 
    }),
    ...overrides
  });

  return config;
}

/**
 * Production Environment Factory
 * Creates production-like environment for testing production behavior
 */
function createProductionEnvironment(overrides = {}) {
  const config = new EnvironmentConfig({
    isTestEnvironment: false,
    dateProvider: new DateProvider({ 
      useFixed: false 
    }),
    ...overrides
  });

  return config;
}

/**
 * Mock moment function using DateProvider
 * This replaces direct moment() calls in tests
 */
function createMomentMock(dateProvider) {
  return function(dateString) {
    const date = dateString ? new Date(dateString) : dateProvider.now();
    
    return {
      format: (formatStr) => dateProvider.format(date, formatStr),
      toDate: () => date,
      valueOf: () => date.getTime(),
      toString: () => date.toString(),
      // Add more moment methods as needed
      isValid: () => !isNaN(date.getTime()),
      unix: () => Math.floor(date.getTime() / 1000)
    };
  };
}

// Update module exports to include new utilities
module.exports = {
  setupTestEnvironment,
  resetTestEnvironment,
  createMockArticle,
  createMockDocument,
  createMockTab,
  createMockOptions,
  createContentScriptResult,
  waitForAsync,
  simulateDownloadComplete,
  createMockBlobURL,
  verifyMarkdownOutput,
  createMockContextMenuInfo,
  simulateKeyboardCommand,
  createTestImageBlob,
  validateFileName,
  mockClipboard,
  simulateNetworkFailure,
  createTemplateTestData,
  validateTemplateReplacement,
  setupEach,
  teardownEach,
  
  // Enhanced functions for boundary testing
  mockTurndown,
  mockConvertArticleToMarkdown,
  loadSourceModule,
  createMockModule,
  processDocument,
  isValidUrl,
  getMemoryUsage,
  performanceUtils,
  securityTestUtils,
  boundaryTestUtils,
  
  // New environment configuration utilities
  EnvironmentConfig,
  DateProvider,
  createTestEnvironment,
  createProductionEnvironment,
  createMomentMock
};
