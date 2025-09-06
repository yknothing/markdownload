// Test setup file for MarkDownload browser extension tests
require('jest-webextension-mock');

// Setup global.self for Service Worker modules to work in Jest
if (!global.self) {
  global.self = global;
}

// Global test utilities
global.testUtils = {
  // Create mock article object
  createMockArticle: (overrides = {}) => ({
    pageTitle: 'Test Article',
    byline: 'Test Author', 
    content: '<h1>Test Content</h1><p>Test paragraph.</p>',
    textContent: 'Test Content Test paragraph.',
    length: 100,
    excerpt: 'Test excerpt',
    siteName: 'Test Site',
    baseURI: 'https://example.com/test',
    keywords: ['test', 'article'],
    publishedTime: '2024-01-01',
    math: {},
    ...overrides
  }),

  // Create mock HTML content
  createMockHTML: (content) => `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Test Page</title>
        <base href="https://example.com/">
      </head>
      <body>
        ${content}
      </body>
    </html>
  `,

  // Create mock options
  createMockOptions: (overrides = {}) => ({
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
    frontmatter: "---\ncreated: {date:YYYY-MM-DDTHH:mm:ss}\n---\n\n# {pageTitle}\n",
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
  })
};

// Initialize browser mock with comprehensive APIs (will be overridden by enhanced mocks)
global.browser = global.browser || {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn()
    },
    getPlatformInfo: jest.fn().mockResolvedValue({
      os: 'mac',
      arch: 'x86-64'
    }),
    getBrowserInfo: jest.fn().mockResolvedValue({
      name: 'Chrome',
      version: '120.0.0.0'
    })
  },
  downloads: {
    download: jest.fn().mockResolvedValue(123),
    search: jest.fn().mockResolvedValue([]),
    cancel: jest.fn().mockResolvedValue(),
    onChanged: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    onCreated: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  },
  storage: {
    sync: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue(),
      remove: jest.fn().mockResolvedValue(),
      clear: jest.fn().mockResolvedValue()
    },
    local: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue(),
      remove: jest.fn().mockResolvedValue(),
      clear: jest.fn().mockResolvedValue()
    }
  },
  contextMenus: {
    create: jest.fn(),
    update: jest.fn(), 
    remove: jest.fn(),
    removeAll: jest.fn(),
    onClicked: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  },
  tabs: {
    query: jest.fn().mockResolvedValue([{ id: 1, url: 'https://example.com' }]),
    getCurrent: jest.fn().mockResolvedValue({ id: 1 }),
    get: jest.fn().mockResolvedValue({ id: 1, url: 'https://example.com' }),
    sendMessage: jest.fn().mockResolvedValue({ success: true }),
    executeScript: jest.fn().mockResolvedValue([{ result: true }]),
    update: jest.fn().mockResolvedValue({ id: 1 })
  },
  scripting: {
    executeScript: jest.fn().mockResolvedValue([{ result: true }]),
    insertCSS: jest.fn().mockResolvedValue(),
    removeCSS: jest.fn().mockResolvedValue()
  },
  commands: {
    onCommand: {
      addListener: jest.fn()
    }
  },
  permissions: {
    contains: jest.fn().mockResolvedValue(true),
    request: jest.fn().mockResolvedValue(true)
  },
  action: {
    setTitle: jest.fn().mockResolvedValue(),
    getTitle: jest.fn().mockResolvedValue('MarkDownload')
  }
};

// Support Chrome namespace as well
global.chrome = global.browser;

// Mock global objects - need proper URL constructor
const { URL: NodeURL } = require('url');

global.URL = class URL extends NodeURL {
  constructor(input, base) {
    try {
      super(input, base);
    } catch (e) {
      // Fallback for invalid URLs
      super('http://localhost');
      this.href = input;
    }
  }
  
  static createObjectURL = jest.fn(() => 'blob:mock-url');
  static revokeObjectURL = jest.fn();
};

global.Blob = jest.fn((data, options) => ({
  data,
  options,
  type: options?.type || 'text/plain'
}));

// Mock DOMParser
global.DOMParser = jest.fn(() => ({
  parseFromString: jest.fn((str, mimeType) => {
    const { JSDOM } = require('jsdom');
    const doc = new JSDOM(str).window.document;
    return doc;
  })
}));

// CodeMirror mock moved to individual test files when needed

// moment mock moved to individual test files when needed

// Setup polyfills first
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Setup DOM
const { JSDOM } = require('jsdom');
const { window } = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'https://example.com/test',
  pretendToBeVisual: true,
  resources: 'usable'
});
global.window = window;
global.document = window.document;
global.navigator = {
  ...window.navigator
  // clipboard mock moved to individual test files when needed
};

// Set up a proper location mock
Object.defineProperty(global.window, 'location', {
  value: new URL('https://example.com/test'),
  writable: true
});

// Mock performance API
global.performance = {
  now: jest.fn(() => Date.now())
};

// getComputedStyle mock moved to individual test files when needed

// XMLHttpRequest mock moved to individual test files when needed

// OPTIMIZED Console helpers for testing - minimal mocking
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  error: jest.fn(),  // Only mock error for critical issues
  warn: jest.fn()    // Only mock warn for important warnings
  // Keep log and info as original for debugging when needed
};

// Cache frequently used values to avoid repeated computations
const cachedMockValues = {
  storageGet: {},
  downloadId: 123,
  tabQuery: [{ id: 1, url: 'https://example.com' }],
  baseURL: 'https://example.com/test'
};

// OPTIMIZED beforeEach - minimal setup for better performance
beforeEach(() => {
  // Ensure browser object has required properties
  if (!global.browser) {
    global.browser = {};
  }
  if (!global.browser.storage) {
    global.browser.storage = { sync: { get: jest.fn() } };
  }
  if (!global.browser.downloads) {
    global.browser.downloads = { download: jest.fn() };
  }
  if (!global.browser.tabs) {
    global.browser.tabs = { query: jest.fn() };
  }

  // Only clear critical mocks - avoid clearAllMocks for performance
  if (global.browser) {
    if (global.browser.storage && global.browser.storage.sync && global.browser.storage.sync.get) {
      global.browser.storage.sync.get.mockClear();
    }
    if (global.browser.downloads && global.browser.downloads.download) {
      global.browser.downloads.download.mockClear();
    }
    if (global.browser.tabs && global.browser.tabs.query) {
      global.browser.tabs.query.mockClear();
    }
  }
  
  // Reset only essential browser mocks with cached values
  if (global.browser && global.browser.storage) {
    global.browser.storage.sync.get.mockResolvedValue(cachedMockValues.storageGet);
    if (global.browser.downloads) {
      global.browser.downloads.download.mockResolvedValue(cachedMockValues.downloadId);
    }
    if (global.browser.tabs && global.browser.tabs.query) {
      global.browser.tabs.query.mockResolvedValue(cachedMockValues.tabQuery);
    }
  }
});

// OPTIMIZED afterEach - minimal cleanup for performance
afterEach(() => {
  // Minimal cleanup - don't restore all mocks for better performance
  // Only clear console mocks if they were used
  if (global.console.error.mock && global.console.error.mock.calls.length > 0) {
    global.console.error.mockClear();
  }
  if (global.console.warn.mock && global.console.warn.mock.calls.length > 0) {
    global.console.warn.mockClear();
  }
});
