/**
 * Enhanced DOM and third-party library mocks for MarkDownload
 * Includes comprehensive boundary condition testing to prevent runtime issues
 */

// Enhanced DOM Element Mock with boundary condition handling
const createMockDOMElement = (tagName = 'DIV', options = {}) => {
  const element = {
    nodeName: tagName.toUpperCase(),
    tagName: tagName.toUpperCase(),
    nodeType: 1,
    
    // Critical: Handle className boundary conditions that caused production issues
    className: options.className !== undefined ? options.className : '',
    classList: {
      contains: jest.fn((className) => {
        const classNames = element.className;
        if (classNames === null || classNames === undefined) return false;
        if (typeof classNames !== 'string') return false;
        return classNames.toLowerCase().split(' ').includes(className.toLowerCase());
      }),
      add: jest.fn((className) => {
        if (element.className === null || element.className === undefined) {
          element.className = className;
        } else {
          element.className += ' ' + className;
        }
      }),
      remove: jest.fn()
    },
    
    // Handle other DOM properties with null/undefined safety
    id: options.id !== undefined ? options.id : '',
    innerHTML: options.innerHTML !== undefined ? options.innerHTML : '',
    innerText: options.innerText !== undefined ? options.innerText : '',
    textContent: options.textContent !== undefined ? options.textContent : '',
    title: options.title !== undefined ? options.title : '',
    alt: options.alt !== undefined ? options.alt : '',
    src: options.src !== undefined ? options.src : '',
    href: options.href !== undefined ? options.href : '',
    
    // Safe attribute handling
    getAttribute: jest.fn((attr) => {
      const safeGetAttribute = (attr) => {
        switch(attr) {
          case 'class':
            return element.className;
          case 'id':
            return element.id;
          case 'src':
            return element.src;
          case 'href':
            return element.href;
          case 'alt':
            return element.alt;
          case 'title':
            return element.title;
          default:
            return options[attr] || null;
        }
      };
      return safeGetAttribute(attr);
    }),
    
    setAttribute: jest.fn((attr, value) => {
      switch(attr) {
        case 'class':
          element.className = value;
          break;
        case 'id':
          element.id = value;
          break;
        default:
          options[attr] = value;
      }
    }),
    
    removeAttribute: jest.fn(),
    hasAttribute: jest.fn((attr) => element.getAttribute(attr) !== null),
    
    // DOM traversal methods
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(() => []),
    getElementsByTagName: jest.fn(() => []),
    getElementsByClassName: jest.fn(() => []),
    getElementById: jest.fn(),
    
    appendChild: jest.fn(),
    removeChild: jest.fn(),
    insertBefore: jest.fn(),
    cloneNode: jest.fn(() => createMockDOMElement(tagName, options)),
    
    // Event handling
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
    
    // Style property with boundary condition safety
    style: options.style || {
      display: '',
      visibility: '',
      setProperty: jest.fn(),
      getPropertyValue: jest.fn(() => ''),
      removeProperty: jest.fn()
    },
    
    // Parent/child relationships
    parentNode: options.parentNode || null,
    parentElement: options.parentElement || null,
    childNodes: options.childNodes || [],
    children: options.children || [],
    firstChild: options.firstChild || null,
    lastChild: options.lastChild || null,
    nextSibling: options.nextSibling || null,
    previousSibling: options.previousSibling || null,
    
    // Boundary condition methods
    matches: jest.fn(() => false),
    closest: jest.fn(() => null),
    contains: jest.fn(() => false)
  };
  
  return element;
};

// Mock TurndownService with enhanced error handling
const createMockTurndownService = () => {
  const mockTurndownService = jest.fn(() => ({
    turndown: jest.fn((html) => {
      // Enhanced null/undefined safety
      if (html === null || html === undefined) {
        return '';
      }
      
      if (typeof html !== 'string') {
        html = String(html);
      }
      
      // Simple HTML to Markdown conversion with error handling
      try {
        return html
          .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
          .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
          .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
          .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
          .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
          .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
          .replace(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)')
          .replace(/<img[^>]*src=["']([^"']*)["'][^>]*alt=["']([^"']*)["'][^>]*>/gi, '![$2]($1)')
          .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
          .replace(/<pre[^>]*>(.*?)<\/pre>/gis, '```\n$1\n```\n\n')
          .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
          .replace(/<[^>]*>/g, '') // Remove remaining tags
          .trim();
      } catch (error) {
        return html;
      }
    }),
    
    addRule: jest.fn(),
    keep: jest.fn(),
    use: jest.fn(),
    escape: jest.fn((text) => text || ''),
    defaultEscape: jest.fn((text) => text || ''),
    references: []
  }));

  // Add prototype methods
  mockTurndownService.prototype = {
    escape: jest.fn((text) => text || ''),
    defaultEscape: jest.fn((text) => text || '')
  };

  return mockTurndownService;
};

// Mock turndown-plugin-gfm
const createMockTurndownPluginGfm = () => ({
  gfm: jest.fn(),
  strikethrough: jest.fn(),
  tables: jest.fn(),
  taskListItems: jest.fn()
});

// Enhanced Mock Readability with boundary condition handling
const createMockReadability = () => {
  return jest.fn((doc) => ({
    parse: jest.fn(() => {
      // Enhanced null/undefined safety
      const safeGetTitle = () => {
        if (!doc) return 'Test Article';
        if (doc.title) return doc.title;
        if (doc.querySelector) {
          const titleEl = doc.querySelector('title');
          return titleEl?.textContent || 'Test Article';
        }
        return 'Test Article';
      };
      
      const safeGetContent = () => {
        if (!doc) return '<p>Test content</p>';
        if (doc.body?.innerHTML) return doc.body.innerHTML;
        if (doc.innerHTML) return doc.innerHTML;
        return '<p>Test content</p>';
      };
      
      const content = safeGetContent();
      
      return {
        title: safeGetTitle(),
        content: content,
        textContent: content.replace(/<[^>]*>/g, ''),
        length: content.length,
        excerpt: 'This is a test excerpt from the article.',
        byline: 'Test Author',
        dir: 'ltr',
        siteName: 'Example Site',
        publishedTime: null
      };
    })
  }));
};

// Mock moment.js
const createMockMoment = () => {
  const moment = jest.fn((date) => {
    const d = date ? new Date(date) : new Date();
    return {
      format: jest.fn((formatString) => {
        switch (formatString) {
          case 'YYYY-MM-DD':
            return d.toISOString().split('T')[0];
          case 'YYYY-MM-DDTHH:mm:ss':
            return d.toISOString().split('.')[0];
          case 'HH:mm:ss':
            return d.toTimeString().split(' ')[0];
          case 'YYYY':
            return d.getFullYear().toString();
          case 'MM':
            return String(d.getMonth() + 1).padStart(2, '0');
          case 'DD':
            return String(d.getDate()).padStart(2, '0');
          case 'Z':
            return '+00:00';
          default:
            return d.toISOString();
        }
      }),
      unix: jest.fn(() => Math.floor(d.getTime() / 1000)),
      valueOf: jest.fn(() => d.getTime())
    };
  });

  // Add static methods
  moment.utc = jest.fn((date) => moment(date));
  moment.unix = jest.fn((timestamp) => moment(new Date(timestamp * 1000)));

  return moment;
};

// Mock CodeMirror
const createMockCodeMirror = () => {
  const mockInstance = {
    getValue: jest.fn(() => '# Test Markdown\n\nTest content'),
    setValue: jest.fn(),
    getSelection: jest.fn(() => 'Selected text'),
    somethingSelected: jest.fn(() => false),
    refresh: jest.fn(),
    focus: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    getDoc: jest.fn(() => ({
      getValue: jest.fn(() => '# Test Markdown\n\nTest content'),
      setValue: jest.fn()
    }))
  };

  const CodeMirror = {
    fromTextArea: jest.fn(() => mockInstance),
    modes: {
      markdown: {}
    }
  };

  return { CodeMirror, mockInstance };
};

// Enhanced Mock DOMParser with comprehensive boundary condition handling
const createMockDOMParser = () => {
  return jest.fn(() => ({
    parseFromString: jest.fn((str, contentType) => {
      // Enhanced null/undefined safety
      if (str === null || str === undefined) {
        str = '';
      }
      
      if (typeof str !== 'string') {
        str = String(str);
      }
      
      // Create a more realistic mock document with boundary condition handling
      const doc = {
        documentElement: {
          nodeName: 'HTML',
          outerHTML: str,
          removeAttribute: jest.fn()
        },
        baseURI: 'https://example.com',
        title: 'Test Document',
        head: {
          querySelector: jest.fn((selector) => {
            if (selector === 'meta[name="keywords"]') {
              return { content: 'test,article,example' };
            }
            if (selector === 'title') {
              return { textContent: 'Test Document' };
            }
            return null;
          }),
          querySelectorAll: jest.fn((selector) => {
            if (selector.includes('meta')) {
              return [
                { 
                  getAttribute: jest.fn((attr) => {
                    if (attr === 'name') return 'description';
                    if (attr === 'content') return 'Test description';
                    return null;
                  })
                }
              ];
            }
            return [];
          }),
          getElementsByTagName: jest.fn((tag) => {
            if (tag === 'title') {
              return [{ innerText: 'Test Document' }];
            }
            if (tag === 'base') {
              return [{
                getAttribute: jest.fn(() => 'https://example.com'),
                setAttribute: jest.fn()
              }];
            }
            return [];
          }),
          append: jest.fn()
        },
        body: {
          innerHTML: str.replace(/^.*<body[^>]*>|<\/body>.*$/gi, ''),
          querySelector: jest.fn(),
          querySelectorAll: jest.fn(() => [])
        },
        querySelector: jest.fn(),
        querySelectorAll: jest.fn(() => []),
        createElement: jest.fn((tag) => createMockDOMElement(tag))
      };

      if (str.includes('parsererror')) {
        doc.documentElement.nodeName = 'parsererror';
      }

      return doc;
    })
  }));
};

// Mock XMLHttpRequest for image downloads
const createMockXMLHttpRequest = () => {
  return jest.fn(() => ({
    open: jest.fn(),
    send: jest.fn(function() {
      // Simulate successful response
      setTimeout(() => {
        this.readyState = 4;
        this.status = 200;
        this.response = new Blob(['mock image data'], { type: 'image/png' });
        if (this.onload) this.onload();
      }, 0);
    }),
    setRequestHeader: jest.fn(),
    readyState: 0,
    status: 0,
    response: null,
    responseType: '',
    onload: null,
    onerror: null,
    ontimeout: null,
    onabort: null
  }));
};

// Mock FileReader
const createMockFileReader = () => {
  return jest.fn(() => ({
    readAsDataURL: jest.fn(function(blob) {
      setTimeout(() => {
        this.result = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
        if (this.onloadend) this.onloadend();
      }, 0);
    }),
    readAsText: jest.fn(function(blob) {
      setTimeout(() => {
        this.result = 'mock text content';
        if (this.onloadend) this.onloadend();
      }, 0);
    }),
    result: null,
    onloadend: null,
    onerror: null
  }));
};

// Boundary condition test cases for DOM properties
const getBoundaryConditionTestCases = () => {
  return {
    classNameCases: [
      { value: null, description: 'className: null' },
      { value: undefined, description: 'className: undefined' },
      { value: '', description: 'className: empty string' },
      { value: 'valid-class', description: 'className: valid string' },
      { value: 123, description: 'className: number' },
      { value: [], description: 'className: array' },
      { value: {}, description: 'className: object' },
      { value: true, description: 'className: boolean' }
    ],
    
    attributeCases: [
      { attr: 'id', value: null },
      { attr: 'id', value: undefined },
      { attr: 'id', value: '' },
      { attr: 'src', value: null },
      { attr: 'src', value: 'https://example.com/image.jpg' },
      { attr: 'alt', value: null },
      { attr: 'alt', value: 'Alt text' },
      { attr: 'title', value: null },
      { attr: 'title', value: 'Title text' }
    ],
    
    contentCases: [
      { prop: 'innerHTML', value: null },
      { prop: 'innerHTML', value: undefined },
      { prop: 'innerHTML', value: '' },
      { prop: 'innerHTML', value: '<p>Content</p>' },
      { prop: 'textContent', value: null },
      { prop: 'textContent', value: undefined },
      { prop: 'textContent', value: '' },
      { prop: 'textContent', value: 'Text content' }
    ]
  };
};

// Create elements with specific boundary conditions for testing
const createBoundaryConditionElements = () => {
  const testCases = getBoundaryConditionTestCases();
  const elements = {};
  
  testCases.classNameCases.forEach((testCase, index) => {
    elements[`classNameTest_${index}`] = createMockDOMElement('div', {
      className: testCase.value
    });
  });
  
  return elements;
};

// Setup all DOM mocks with enhanced boundary condition support
const setupDOMMocks = () => {
  // Setup global objects
  global.TurndownService = createMockTurndownService();
  global.turndownPluginGfm = createMockTurndownPluginGfm();
  global.Readability = createMockReadability();
  global.moment = createMockMoment();
  
  // Setup DOM APIs
  global.DOMParser = createMockDOMParser();
  global.XMLHttpRequest = createMockXMLHttpRequest();
  global.FileReader = createMockFileReader();
  
  // Setup CodeMirror if needed
  const { CodeMirror } = createMockCodeMirror();
  global.CodeMirror = CodeMirror;

  // Mock URL methods
  global.URL.createObjectURL = jest.fn(() => 'blob:mock-url-' + Math.random());
  global.URL.revokeObjectURL = jest.fn();

  // Enhanced Blob mock with boundary condition handling
  global.Blob = jest.fn((content, options) => {
    const safeContent = content || [];
    return {
      size: Array.isArray(safeContent) ? safeContent.join('').length : 0,
      type: options?.type || 'text/plain',
      slice: jest.fn(),
      stream: jest.fn(),
      text: jest.fn().mockResolvedValue(Array.isArray(safeContent) ? safeContent.join('') : ''),
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0))
    };
  });

  return {
    TurndownService: global.TurndownService,
    turndownPluginGfm: global.turndownPluginGfm,
    Readability: global.Readability,
    moment: global.moment,
    CodeMirror,
    createMockDOMElement,
    getBoundaryConditionTestCases,
    createBoundaryConditionElements
  };
};

// Reset all DOM mocks
const resetDOMMocks = () => {
  [
    global.TurndownService,
    global.turndownPluginGfm?.gfm,
    global.Readability,
    global.moment,
    global.DOMParser,
    global.XMLHttpRequest,
    global.FileReader,
    global.URL.createObjectURL,
    global.URL.revokeObjectURL,
    global.Blob
  ].forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockClear();
    }
  });
};

// Export functions for CommonJS  
module.exports = {
  createMockTurndownService,
  createMockTurndownPluginGfm,
  createMockReadability,
  createMockMoment,
  createMockCodeMirror,
  createMockDOMParser,
  createMockXMLHttpRequest,
  createMockFileReader,
  createMockDOMElement,
  getBoundaryConditionTestCases,
  createBoundaryConditionElements,
  setupDOMMocks,
  resetDOMMocks
};
