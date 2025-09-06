/**
 * TurndownService Mocks for MarkDownload Testing
 * 
 * This file provides comprehensive mocking of TurndownService and related dependencies
 * to enable proper testing of the extension's conversion functionality.
 */

// Mock importScripts for service worker context
if (typeof importScripts === 'undefined') {
  global.importScripts = jest.fn((script) => {
    // Silently handle script imports - no console logging
    // Based on the script name, load the appropriate mock
    switch (script) {
      case 'turndown.js':
        // TurndownService is already mocked below
        break;
      case 'turndown-plugin-gfm.js':
        // turndownPluginGfm is already mocked below
        break;
      case 'apache-mime-types.js':
      case 'moment.min.js':
      case 'Readability.js':
      case '../shared/context-menus.js':
      case '../shared/default-options.js':
        // These can be mocked later if needed
        break;
      default:
        // Silently ignore unmocked scripts
        break;
    }
  });
}

// Mock TurndownService class with realistic behavior
class MockTurndownService {
  constructor(options = {}) {
    this.options = {
      headingStyle: 'atx',
      hr: '___',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
      fence: '```',
      emDelimiter: '_',
      strongDelimiter: '**',
      linkStyle: 'inlined',
      linkReferenceStyle: 'full',
      ...options
    };
    this.rules = new Map();
    this.plugins = [];
  }

  // Main conversion method
  turndown(html) {
    if (!html || typeof html !== 'string') {
      return '';
    }

    // Simple mock conversion logic for testing
    let markdown = html;

    // Basic HTML to Markdown conversion patterns
    const conversions = [
      // Headers
      [/<h1[^>]*>(.*?)<\/h1>/gi, '# $1'],
      [/<h2[^>]*>(.*?)<\/h2>/gi, '## $1'],
      [/<h3[^>]*>(.*?)<\/h3>/gi, '### $1'],
      [/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1'],
      [/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1'],
      [/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1'],
      
      // Text formatting
      [/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**'],
      [/<b[^>]*>(.*?)<\/b>/gi, '**$1**'],
      [/<em[^>]*>(.*?)<\/em>/gi, '_$1_'],
      [/<i[^>]*>(.*?)<\/i>/gi, '_$1_'],
      [/<code[^>]*>(.*?)<\/code>/gi, '`$1`'],
      
      // Links
      [/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)'],
      
      // Images
      [/<img[^>]*src=["']([^"']*)["'][^>]*alt=["']([^"']*)["'][^>]*\/?>/gi, '![$2]($1)'],
      [/<img[^>]*alt=["']([^"']*)["'][^>]*src=["']([^"']*)["'][^>]*\/?>/gi, '![$1]($2)'],
      [/<img[^>]*src=["']([^"']*)["'][^>]*\/?>/gi, '![]($1)'],
      
      // Lists
      [/<ul[^>]*>(.*?)<\/ul>/gis, (match, content) => {
        return content.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1').trim();
      }],
      [/<ol[^>]*>(.*?)<\/ol>/gis, (match, content) => {
        let counter = 1;
        return content.replace(/<li[^>]*>(.*?)<\/li>/gi, () => `${counter++}. $1`).trim();
      }],
      
      // Paragraphs
      [/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n'],
      
      // Line breaks
      [/<br\s*\/?>/gi, '\n'],
      
      // Code blocks
      [/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis, '```\n$1\n```'],
      [/<pre[^>]*>(.*?)<\/pre>/gis, '```\n$1\n```'],
      
      // Horizontal rules
      [/<hr[^>]*\/?>/gi, '\n___\n'],
      
      // Clean up remaining tags
      [/<[^>]+>/g, ''],
      
      // Clean up multiple newlines
      [/\n{3,}/g, '\n\n'],
      
      // HTML entities
      [/&amp;/g, '&'],
      [/&lt;/g, '<'],
      [/&gt;/g, '>'],
      [/&quot;/g, '"'],
      [/&#39;/g, "'"],
      [/&nbsp;/g, ' ']
    ];

    // Apply conversions
    conversions.forEach(([pattern, replacement]) => {
      if (typeof replacement === 'function') {
        markdown = markdown.replace(pattern, replacement);
      } else {
        markdown = markdown.replace(pattern, replacement);
      }
    });

    return markdown.trim();
  }

  // Add rule method for plugins
  addRule(key, rule) {
    this.rules.set(key, rule);
    return this;
  }

  // Keep method for preserving certain tags
  keep(filter) {
    // Mock implementation - in real TurndownService, this preserves specified tags
    // Silently handle keep calls without logging
    return this;
  }

  // Use method for applying plugins
  use(plugin) {
    if (typeof plugin === 'function') {
      plugin(this);
      this.plugins.push(plugin);
    }
    return this;
  }

  // Remove method for removing rules
  remove(filter) {
    // Silently handle remove calls without logging
    return this;
  }

  // Mock escape function
  escape(text) {
    if (!text || typeof text !== 'string') return text;
    
    // Basic markdown escaping
    return text.replace(/[\\`*_{}[\]()#+\-.!]/g, '\\$&');
  }
}

// Set up default escape function (mimics the real service worker behavior)
MockTurndownService.prototype.defaultEscape = MockTurndownService.prototype.escape;

// Mock turndownPluginGfm
const mockTurndownPluginGfm = {
  gfm: jest.fn((turndownService) => {
    // Mock the GFM plugin functionality - silently
    // Add mock rules that the GFM plugin would normally add
    turndownService.addRule('strikethrough', {
      filter: ['del', 's'],
      replacement: (content) => `~~${content}~~`
    });
    
    turndownService.addRule('tables', {
      filter: 'table',
      replacement: (content) => {
        // Simple table mock
        return '\n| Table | Mock |\n|-------|------|\n| Cell  | Cell |\n\n';
      }
    });
    
    turndownService.addRule('taskList', {
      filter: (node) => node.type === 'checkbox',
      replacement: (content, node) => {
        return node.checked ? '- [x] ' : '- [ ] ';
      }
    });
    
    return turndownService;
  }),
  
  strikethrough: jest.fn(),
  tables: jest.fn(),
  taskListItems: jest.fn()
};

// Mock moment.js (if needed)
if (typeof global.moment === 'undefined') {
  global.moment = jest.fn(() => ({
    format: jest.fn((format) => {
      const now = new Date();
      if (format === 'YYYY-MM-DD') return '2024-01-01';
      if (format === 'YYYY-MM-DDTHH:mm:ss') return '2024-01-01T12:00:00';
      return '2024-01-01';
    })
  }));
}

// Mock Readability (if needed)
if (typeof global.Readability === 'undefined') {
  global.Readability = jest.fn().mockImplementation(() => ({
    parse: jest.fn(() => ({
      title: 'Test Article',
      content: '<p>Test content</p>',
      textContent: 'Test content',
      length: 100,
      excerpt: 'Test excerpt',
      byline: 'Test Author',
      siteName: 'Test Site'
    }))
  }));
}

// Enhanced DOM polyfill for service worker compatibility
function ensureServiceWorkerDOMPolyfill() {
  // Add Node constants that TurndownService expects
  if (!global.Node) {
    global.Node = {
      ELEMENT_NODE: 1,
      ATTRIBUTE_NODE: 2,
      TEXT_NODE: 3,
      CDATA_SECTION_NODE: 4,
      ENTITY_REFERENCE_NODE: 5,
      ENTITY_NODE: 6,
      PROCESSING_INSTRUCTION_NODE: 7,
      COMMENT_NODE: 8,
      DOCUMENT_NODE: 9,
      DOCUMENT_TYPE_NODE: 10,
      DOCUMENT_FRAGMENT_NODE: 11,
      NOTATION_NODE: 12
    };
  }

  // Enhance the document mock if it's missing service worker specific features
  if (global.document && !global.document.implementation) {
    global.document.implementation = {
      createHTMLDocument: function(title) {
        const doc = Object.create(global.document);
        doc.title = title || '';
        return doc;
      }
    };
  }

  // Add service worker specific globals
  if (typeof global.self === 'undefined') {
    global.self = global;
  }

  // Mock importScripts for service worker environment
  if (typeof global.importScripts === 'undefined') {
    global.importScripts = jest.fn();
  }

  // Service worker DOM polyfill applied silently
}

// Apply the enhanced DOM polyfill
ensureServiceWorkerDOMPolyfill();

// Export mocks for direct use in tests
global.TurndownService = MockTurndownService;
global.turndownPluginGfm = mockTurndownPluginGfm;

// Helper function for tests to create a configured TurndownService
global.createMockTurndownService = (options = {}) => {
  const service = new MockTurndownService(options);
  service.use(mockTurndownPluginGfm.gfm);
  return service;
};

// Helper function to test turndown conversion directly
global.testTurndownConversion = (html, options = {}) => {
  const service = global.createMockTurndownService(options);
  return service.turndown(html);
};

// REMOVED: Global generateValidFileName mock - Use real implementation from background.js

// Don't create global isValidFilename - let tests import what they need
// This avoids conflicts with test-specific imports from boundary-constants

// REMOVED: Global textReplace mock - Use real implementation from background.js

// Mock the main turndown function that appears in background.js
global.turndown = jest.fn((content, options = {}, article = {}) => {
  // Silently process turndown conversion
  if (!content || typeof content !== 'string') {
    return '';
  }
  
  // Create a service with the provided options
  const service = new MockTurndownService(options);
  service.use(mockTurndownPluginGfm.gfm);
  
  // Apply escape setting
  if (options.turndownEscape) {
    service.escape = service.defaultEscape;
  } else {
    service.escape = (s) => s;
  }
  
  return service.turndown(content);
});

// Mock normalizeMarkdown function if not already defined
if (typeof global.normalizeMarkdown !== 'function') {
  global.normalizeMarkdown = jest.fn((markdown) => {
    // Default implementation: basic normalization
    if (typeof markdown !== 'string') return markdown;

    return markdown
      // Remove non-breaking spaces and other special characters
      .replace(/\u00A0/g, ' ')
      .replace(/\u200B/g, '') // Zero-width space
      .replace(/\uFEFF/g, '') // BOM
      // Normalize line endings
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Trim whitespace
      .trim();
  });
}

// TurndownService mocks initialized silently

module.exports = {
  TurndownService: MockTurndownService,
  turndownPluginGfm: mockTurndownPluginGfm,
  createMockTurndownService: global.createMockTurndownService,
  testTurndownConversion: global.testTurndownConversion,
  normalizeMarkdown: global.normalizeMarkdown
};