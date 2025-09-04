/**
 * Unit tests for DOM Polyfill module
 * Tests DOM API simulation in Service Worker environment
 */

describe('DOMPolyfill Module', () => {
  let mockSelf;
  let originalSelf;
  let originalGlobalThis;

  beforeEach(() => {
    // Save original globals
    originalSelf = global.self;
    originalGlobalThis = global.globalThis;

    // Create mock environment
    mockSelf = {
      DOMPolyfill: null
    };

    // Set up global objects - ensure polyfill can install
    global.self = mockSelf;
    global.globalThis = global; // Use global as globalThis for testing

    // Reset modules and clear cache
    jest.resetModules();
    delete require.cache[require.resolve('../../../src/background/polyfills/dom-polyfill.js')];

    // Load the module
    require('../../../src/background/polyfills/dom-polyfill.js');
  });

  afterEach(() => {
    // Restore originals
    global.self = originalSelf;
    global.globalThis = originalGlobalThis;
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize DOM polyfill and set up global APIs', () => {
      expect(mockSelf.DOMPolyfill).toBeDefined();
      expect(globalThis.document).toBeDefined();
      expect(globalThis.DOMParser).toBeDefined();
      expect(globalThis.Node).toBeDefined();
    });

    test('should export correct interface', () => {
      const domPolyfill = global.self.DOMPolyfill;

      expect(domPolyfill).toHaveProperty('install');
      expect(domPolyfill).toHaveProperty('isReady');
      expect(domPolyfill).toHaveProperty('createElement');
      expect(domPolyfill).toHaveProperty('createTextNode');
      expect(domPolyfill).toHaveProperty('createDocument');
    });
  });

  describe('Document API', () => {
    test('should create document with correct structure', () => {
      const doc = global.self.DOMPolyfill.createDocument('Test');

      expect(doc).toHaveProperty('title', 'Test');
      expect(doc).toHaveProperty('createElement');
      expect(doc).toHaveProperty('createTextNode');
      expect(doc).toHaveProperty('getElementById');
      expect(doc).toHaveProperty('getElementsByTagName');
    });

    test('should create elements with correct properties', () => {
      // Use DOM polyfill's createElement function directly
      const element = global.self.DOMPolyfill.createElement('div');

      expect(element).toHaveProperty('tagName', 'DIV');
      expect(element).toHaveProperty('nodeName', 'DIV');
      expect(element).toHaveProperty('nodeType', 1);
      expect(element).toHaveProperty('childNodes');
      expect(element).toHaveProperty('firstChild', null);
      expect(element).toHaveProperty('parentNode', null);
      expect(element).toHaveProperty('isCode', false);
    });

    test('should create text nodes with correct properties', () => {
      const textNode = global.self.DOMPolyfill.createTextNode('Hello World');

      expect(textNode).toHaveProperty('nodeType', 3);
      expect(textNode).toHaveProperty('nodeName', '#text');
      expect(textNode).toHaveProperty('textContent', 'Hello World');
      expect(textNode).toHaveProperty('data', 'Hello World');
      expect(textNode).toHaveProperty('nodeValue', 'Hello World');
    });
  });

  describe('Element Manipulation', () => {
    test('should set and get attributes correctly', () => {
      const element = global.self.DOMPolyfill.createElement('div');

      element.setAttribute('id', 'test-div');
      element.setAttribute('class', 'test-class');

      expect(element.getAttribute('id')).toBe('test-div');
      expect(element.getAttribute('class')).toBe('test-class');
      expect(element.getAttribute('nonexistent')).toBe(null);
    });

    test('should handle element ID correctly', () => {
      const element = global.self.DOMPolyfill.createElement('div');

      element.setAttribute('id', 'test-element');
      expect(element.id).toBe('test-element');
    });

    test('should append children and maintain relationships', () => {
      const parent = global.self.DOMPolyfill.createElement('div');
      const child1 = global.self.DOMPolyfill.createElement('span');
      const child2 = global.self.DOMPolyfill.createElement('p');

      parent.appendChild(child1);
      parent.appendChild(child2);

      expect(parent.childNodes).toHaveLength(2);
      expect(parent.firstChild).toBe(child1);
      expect(child1.parentNode).toBe(parent);
      expect(child2.parentNode).toBe(parent);
      expect(child1.nextSibling).toBe(child2);
      expect(child2.previousSibling).toBe(child1);
      expect(child2.nextSibling).toBe(null);
    });

    test('should set isCode property on parent and child elements', () => {
      const parent = global.self.DOMPolyfill.createElement('div');
      const child = global.self.DOMPolyfill.createElement('code');

      // Initially should have isCode property
      expect(parent).toHaveProperty('isCode');
      expect(child).toHaveProperty('isCode');

      parent.appendChild(child);

      // After appendChild, should still have isCode property
      expect(parent.isCode).toBe(false);
      expect(child.isCode).toBe(false);
    });
  });

  describe('innerHTML Functionality', () => {
    test('should parse simple HTML tags', () => {
      const element = global.self.DOMPolyfill.createElement('div');
      element.innerHTML = '<p>Hello World</p>';

      expect(element.childNodes).toHaveLength(1);
      expect(element.firstChild.tagName).toBe('P');
      expect(element.firstChild.textContent).toBe('Hello World');
    });

    test('should handle nested HTML structures', () => {
      const element = global.self.DOMPolyfill.createElement('div');
      element.innerHTML = '<div><p>Hello <strong>World</strong></p></div>';

      expect(element.childNodes).toHaveLength(1);
      const outerDiv = element.firstChild;
      expect(outerDiv.tagName).toBe('DIV');
      expect(outerDiv.childNodes).toHaveLength(1);

      const p = outerDiv.firstChild;
      expect(p.tagName).toBe('P');
      expect(p.childNodes).toHaveLength(2); // Text node + strong element
    });

    test('should handle mixed text and HTML content', () => {
      const element = global.self.DOMPolyfill.createElement('div');
      element.innerHTML = 'Before <span>middle</span> after';

      expect(element.childNodes).toHaveLength(3);
      expect(element.childNodes[0].nodeType).toBe(3); // Text node
      expect(element.childNodes[0].textContent).toBe('Before ');
      expect(element.childNodes[1].tagName).toBe('SPAN');
      expect(element.childNodes[2].nodeType).toBe(3); // Text node
      expect(element.childNodes[2].textContent).toBe(' after');
    });

    test('should handle plain text content', () => {
      const element = global.self.DOMPolyfill.createElement('div');
      element.innerHTML = 'Just plain text';

      expect(element.childNodes).toHaveLength(1);
      expect(element.firstChild.nodeType).toBe(3);
      expect(element.firstChild.textContent).toBe('Just plain text');
    });

    test('should clear existing children when setting innerHTML', () => {
      const element = global.self.DOMPolyfill.createElement('div');
      element.appendChild(global.self.DOMPolyfill.createElement('span'));
      expect(element.childNodes).toHaveLength(1);

      element.innerHTML = '<p>New content</p>';
      expect(element.childNodes).toHaveLength(1);
      expect(element.firstChild.tagName).toBe('P');
    });
  });

  describe('textContent Functionality', () => {
    test('should compute textContent from child nodes', () => {
      const element = global.self.DOMPolyfill.createElement('div');

      const textNode = globalThis.document.createTextNode('Hello ');
      const span = global.self.DOMPolyfill.createElement('span');
      span.textContent = 'World';
      const textNode2 = globalThis.document.createTextNode('!');

      element.appendChild(textNode);
      element.appendChild(span);
      element.appendChild(textNode2);

      expect(element.textContent).toBe('Hello World!');
    });

    test('should recursively compute textContent from nested elements', () => {
      const element = global.self.DOMPolyfill.createElement('div');
      element.innerHTML = '<p>Hello <strong>World</strong>!</p>';

      expect(element.textContent).toBe('Hello World!');
    });

    test('should set textContent and clear children', () => {
      const element = global.self.DOMPolyfill.createElement('div');
      element.innerHTML = '<p>Old content</p><span>test</span>';

      expect(element.childNodes).toHaveLength(2);

      element.textContent = 'New text content';

      expect(element.childNodes).toHaveLength(1);
      expect(element.firstChild.nodeType).toBe(3);
      expect(element.firstChild.textContent).toBe('New text content');
    });

    test('should handle empty elements', () => {
      const element = global.self.DOMPolyfill.createElement('div');
      expect(element.textContent).toBe('');
    });
  });

  describe('Document Parsing', () => {
    test('should parse HTML with Turndown root element', () => {
      const parser = new DOMParser();
      const html = `
        <html>
          <body>
            <x-turndown id="turndown-root">
              <p>Hello World</p>
              <p>This is a test</p>
            </x-turndown>
          </body>
        </html>
      `;

      const doc = parser.parseFromString(html, 'text/html');

      expect(doc.body).toBeDefined();
      expect(doc.body.tagName).toBe('BODY');
      // Find the x-turndown element (skip text nodes)
      const rootElement = Array.from(doc.body.childNodes).find(node =>
        node.nodeType === 1 && node.tagName === 'X-TURNDOWN'
      );
      expect(rootElement).toBeDefined();
      expect(rootElement.tagName).toBe('X-TURNDOWN');
      expect(rootElement.id).toBe('turndown-root');
      // Count non-text child nodes (should be 2 <p> elements)
      const elementChildNodes = Array.from(rootElement.childNodes).filter(node =>
        node.nodeType === 1
      );
      expect(elementChildNodes).toHaveLength(2);
    });

    test('should handle malformed HTML gracefully', () => {
      const parser = new DOMParser();
      const malformedHtml = '<div><p>Unclosed paragraph<div>Nested</div>';

      const doc = parser.parseFromString(malformedHtml, 'text/html');

      // Should still create a valid document structure
      expect(doc).toBeDefined();
      expect(typeof doc.createElement).toBe('function');
    });
  });

  describe('getElementById Functionality', () => {
    test('should find element by ID', () => {
      const doc = global.self.DOMPolyfill.createDocument('Test');

      // Create a documentElement to hold our elements
      doc.documentElement = doc.createElement('html');
      const body = doc.createElement('body');
      doc.documentElement.appendChild(body);

      const div = doc.createElement('div');
      div.setAttribute('id', 'test-div');
      body.appendChild(div);

      const found = doc.getElementById('test-div');
      expect(found).toBe(div);
    });

    test('should return null for non-existent ID', () => {
      const doc = global.self.DOMPolyfill.createDocument('Test');

      const found = doc.getElementById('non-existent');
      expect(found).toBe(null);
    });

    test('should search recursively in document structure', () => {
      const doc = global.self.DOMPolyfill.createDocument('Test');

      // Create a documentElement to hold our elements
      doc.documentElement = doc.createElement('html');
      const body = doc.createElement('body');
      doc.documentElement.appendChild(body);

      const outer = doc.createElement('div');
      const inner = doc.createElement('span');
      inner.setAttribute('id', 'inner-element');

      outer.appendChild(inner);
      body.appendChild(outer);

      const found = doc.getElementById('inner-element');
      expect(found).toBe(inner);
    });
  });

  describe('Node Constants', () => {
    test('should define correct Node constants', () => {
      expect(globalThis.Node.ELEMENT_NODE).toBe(1);
      expect(globalThis.Node.ATTRIBUTE_NODE).toBe(2);
      expect(globalThis.Node.TEXT_NODE).toBe(3);
      expect(globalThis.Node.CDATA_SECTION_NODE).toBe(4);
      expect(globalThis.Node.ENTITY_REFERENCE_NODE).toBe(5);
      expect(globalThis.Node.ENTITY_NODE).toBe(6);
      expect(globalThis.Node.PROCESSING_INSTRUCTION_NODE).toBe(7);
      expect(globalThis.Node.COMMENT_NODE).toBe(8);
      expect(globalThis.Node.DOCUMENT_NODE).toBe(9);
      expect(globalThis.Node.DOCUMENT_TYPE_NODE).toBe(10);
      expect(globalThis.Node.DOCUMENT_FRAGMENT_NODE).toBe(11);
      expect(globalThis.Node.NOTATION_NODE).toBe(12);
    });
  });

  describe('Edge Cases', () => {
    test('should handle null/undefined values gracefully', () => {
      const element = global.self.DOMPolyfill.createElement('div');

      element.setAttribute('test', null);
      expect(element.getAttribute('test')).toBe(null);

      element.textContent = undefined;
      expect(element.textContent).toBe('');
    });

    test('should handle empty strings', () => {
      const element = global.self.DOMPolyfill.createElement('div');

      element.innerHTML = '';
      expect(element.childNodes).toHaveLength(0);

      element.textContent = '';
      expect(element.childNodes).toHaveLength(0);
    });

    test('should handle self-closing tags', () => {
      const element = global.self.DOMPolyfill.createElement('div');
      element.innerHTML = '<img src="test.jpg" /><br/>';

      expect(element.childNodes).toHaveLength(2);
      expect(element.childNodes[0].tagName).toBe('IMG');
      expect(element.childNodes[1].tagName).toBe('BR');
    });
  });
});
