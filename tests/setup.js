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

// Mock CodeMirror
global.CodeMirror = {
  fromTextArea: jest.fn(() => ({
    getValue: jest.fn(),
    setValue: jest.fn(),
    getSelection: jest.fn(),
    somethingSelected: jest.fn(() => false),
    refresh: jest.fn(),
    on: jest.fn()
  }))
};

// Mock moment.js with comprehensive date formatting
global.moment = jest.fn().mockImplementation(() => ({
  format: jest.fn().mockImplementation((format) => {
    // Use a consistent test date for all formats
    if (format === 'YYYY-MM-DD') return '2024-01-15';
    if (format === 'YYYY-MM-DDTHH:mm:ss') return '2024-01-15T14:30:00';
    if (format === 'HH:mm:ss') return '14:30:00';
    if (format === 'YYYY') return '2024';
    if (format === 'MM') return '01';
    if (format === 'DD') return '15';
    if (format === 'HH') return '14';
    if (format === 'mm') return '30';
    if (format === 'ss') return '00';
    
    // For complex formats, try to parse common patterns
    if (format && format.includes && format.includes('YYYY')) {
      let result = format;
      result = result.replace(/YYYY/g, '2024');
      result = result.replace(/MM/g, '01');
      result = result.replace(/DD/g, '15');
      result = result.replace(/HH/g, '14');
      result = result.replace(/mm/g, '30');
      result = result.replace(/ss/g, '00');
      return result;
    }
    
    // Fallback for time-only formats
    if (format && format.includes && (format.includes('HH') || format.includes('mm') || format.includes('ss'))) {
      let result = format;
      result = result.replace(/HH/g, '14');
      result = result.replace(/mm/g, '30');
      result = result.replace(/ss/g, '00');
      return result;
    }
    
    return '2024-01-15';
  })
}));

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
  ...window.navigator,
  clipboard: {
    writeText: jest.fn().mockResolvedValue(),
    readText: jest.fn().mockResolvedValue('clipboard content')
  }
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

// Mock window.getComputedStyle for DOM tests
global.getComputedStyle = jest.fn((element) => ({
  getPropertyValue: jest.fn((property) => {
    if (property === 'display') return 'block';
    if (property === 'visibility') return 'visible';
    return '';
  })
}));

// Add getComputedStyle to window as well
global.window.getComputedStyle = global.getComputedStyle;

// Mock XMLHttpRequest for image downloading tests
global.XMLHttpRequest = jest.fn(() => ({
  open: jest.fn(),
  send: jest.fn(),
  onload: null,
  onerror: null,
  response: new Blob(['test'], { type: 'image/jpeg' }),
  responseType: 'blob'
}));

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
