/**
 * DOM Polyfill Test Suite
 * Comprehensive test coverage for src/background/polyfills/dom-polyfill.js
 * 
 * Tests all DOM polyfill functionality, security sanitization,
 * element creation, document parsing, and compatibility with Turndown.js.
 */

const path = require('path');

describe('DOM Polyfill Comprehensive Tests', () => {
  let DOMPolyfill;
  let mockSelf;
  let originalGlobal;

  beforeAll(() => {
    originalGlobal = {
      globalThis: global.globalThis,
      document: global.document,
      DOMParser: global.DOMParser,
      Node: global.Node,
      self: global.self,
      console: global.console
    };

    // Mock self environment
    mockSelf = {
      console: {
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
      }
    };
    global.self = mockSelf;
    global.console = mockSelf.console;

    // Ensure globalThis exists
    if (!global.globalThis) {
      global.globalThis = global;
    }
  });

  afterAll(() => {
    // Restore original globals
    Object.assign(global, originalGlobal);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Clear existing DOM polyfill
    delete global.globalThis.document;
    delete global.globalThis.DOMParser;
    delete global.globalThis.Node;

    // Load module fresh for each test
    const modulePath = path.resolve(__dirname, '../../../../src/background/polyfills/dom-polyfill.js');
    delete require.cache[modulePath];
    require(modulePath);
    DOMPolyfill = global.self.DOMPolyfill;
  });

  describe('Module Initialization and Installation', () => {
    test('should load and export DOMPolyfill interface', () => {
      expect(DOMPolyfill).toBeDefined();
      expect(typeof DOMPolyfill).toBe('object');
    });

    test('should expose required public methods', () => {
      expect(typeof DOMPolyfill.install).toBe('function');
      expect(typeof DOMPolyfill.isReady).toBe('function');
      expect(typeof DOMPolyfill.createElement).toBe('function');
      expect(typeof DOMPolyfill.createTextNode).toBe('function');
      expect(typeof DOMPolyfill.createDocument).toBe('function');
    });

    test('should auto-install DOM polyfill on module load', () => {
      expect(DOMPolyfill.isReady()).toBe(true);
      expect(global.globalThis.document).toBeDefined();
      expect(global.globalThis.DOMParser).toBeDefined();
      expect(global.globalThis.Node).toBeDefined();
    });

    test('should not double-install when called multiple times', () => {
      const installSpy = jest.spyOn(mockSelf.console, 'log');
      
      DOMPolyfill.install();
      DOMPolyfill.install();
      DOMPolyfill.install();

      // Should only log installation once (already installed message)
      const installMessages = installSpy.mock.calls.filter(call => 
        call[0] && call[0].includes('Installing DOM polyfill')
      );
      expect(installMessages.length).toBeLessThanOrEqual(1);
    });

    test('should install all required global objects', () => {
      expect(global.globalThis.document).toBeDefined();
      expect(global.globalThis.document.createElement).toBeDefined();
      expect(global.globalThis.document.createTextNode).toBeDefined();
      expect(global.globalThis.document.implementation).toBeDefined();
      
      expect(global.globalThis.DOMParser).toBeDefined();
      expect(typeof global.globalThis.DOMParser).toBe('function');
      
      expect(global.globalThis.Node).toBeDefined();
      expect(global.globalThis.Node.ELEMENT_NODE).toBe(1);
      expect(global.globalThis.Node.TEXT_NODE).toBe(3);
      expect(global.globalThis.Node.DOCUMENT_NODE).toBe(9);
    });
  });

  describe('Element Creation and DOM Structure', () => {
    test('should create DOM elements with correct structure', () => {
      const element = DOMPolyfill.createElement('div');

      expect(element).toBeDefined();
      expect(element.tagName).toBe('DIV');
      expect(element.nodeName).toBe('DIV');
      expect(element.nodeType).toBe(1);
      expect(element.childNodes).toEqual([]);
      expect(element.firstChild).toBeNull();
      expect(element.parentNode).toBeNull();
      expect(element.nextSibling).toBeNull();
      expect(element.previousSibling).toBeNull();
    });

    test('should create text nodes with correct properties', () => {
      const textNode = DOMPolyfill.createTextNode('Hello World');

      expect(textNode).toBeDefined();
      expect(textNode.nodeType).toBe(3);
      expect(textNode.nodeName).toBe('#text');
      expect(textNode.textContent).toBe('Hello World');
      expect(textNode.data).toBe('Hello World');
      expect(textNode.nodeValue).toBe('Hello World');
    });

    test('should handle empty text node creation', () => {
      const emptyNode = DOMPolyfill.createTextNode('');
      const nullNode = DOMPolyfill.createTextNode(null);
      const undefinedNode = DOMPolyfill.createTextNode(undefined);

      expect(emptyNode.textContent).toBe('');
      expect(nullNode.textContent).toBe('');
      expect(undefinedNode.textContent).toBe('');
    });

    test('should create elements with case-insensitive tag names', () => {
      const lowerCase = DOMPolyfill.createElement('div');
      const upperCase = DOMPolyfill.createElement('DIV');
      const mixedCase = DOMPolyfill.createElement('DiV');

      expect(lowerCase.tagName).toBe('DIV');
      expect(upperCase.tagName).toBe('DIV');
      expect(mixedCase.tagName).toBe('DIV');
    });
  });

  describe('Element Attributes and Properties', () => {
    test('should set and get attributes correctly', () => {
      const element = DOMPolyfill.createElement('div');

      element.setAttribute('class', 'test-class');
      element.setAttribute('id', 'test-id');
      element.setAttribute('data-value', 'test-data');

      expect(element.getAttribute('class')).toBe('test-class');
      expect(element.getAttribute('id')).toBe('test-id');
      expect(element.getAttribute('data-value')).toBe('test-data');
      expect(element.id).toBe('test-id');
    });

    test('should return null for non-existent attributes', () => {
      const element = DOMPolyfill.createElement('div');

      expect(element.getAttribute('nonexistent')).toBeNull();
      expect(element.getAttribute('class')).toBeNull();
    });

    test('should handle attribute overwriting', () => {
      const element = DOMPolyfill.createElement('div');

      element.setAttribute('class', 'first-class');
      expect(element.getAttribute('class')).toBe('first-class');

      element.setAttribute('class', 'second-class');
      expect(element.getAttribute('class')).toBe('second-class');
    });
  });

  describe('DOM Tree Manipulation', () => {
    test('should append child nodes correctly', () => {
      const parent = DOMPolyfill.createElement('div');
      const child1 = DOMPolyfill.createElement('span');
      const child2 = DOMPolyfill.createElement('p');

      parent.appendChild(child1);
      parent.appendChild(child2);

      expect(parent.childNodes.length).toBe(2);
      expect(parent.firstChild).toBe(child1);
      expect(child1.parentNode).toBe(parent);
      expect(child2.parentNode).toBe(parent);
      expect(child1.nextSibling).toBe(child2);
      expect(child2.previousSibling).toBe(child1);
    });

    test('should handle single child correctly', () => {
      const parent = DOMPolyfill.createElement('div');
      const child = DOMPolyfill.createElement('span');

      parent.appendChild(child);

      expect(parent.firstChild).toBe(child);
      expect(child.nextSibling).toBeNull();
      expect(child.previousSibling).toBeNull();
    });

    test('should remove nodes correctly', () => {
      const parent = DOMPolyfill.createElement('div');
      const child1 = DOMPolyfill.createElement('span');
      const child2 = DOMPolyfill.createElement('p');
      const child3 = DOMPolyfill.createElement('em');

      parent.appendChild(child1);
      parent.appendChild(child2);
      parent.appendChild(child3);

      // Remove middle child
      child2.remove();

      expect(parent.childNodes.length).toBe(2);
      expect(parent.childNodes[0]).toBe(child1);
      expect(parent.childNodes[1]).toBe(child3);
      expect(child1.nextSibling).toBe(child3);
      expect(child3.previousSibling).toBe(child1);
      expect(child2.parentNode).toBeNull();
    });

    test('should handle removing first child', () => {
      const parent = DOMPolyfill.createElement('div');
      const child1 = DOMPolyfill.createElement('span');
      const child2 = DOMPolyfill.createElement('p');

      parent.appendChild(child1);
      parent.appendChild(child2);

      child1.remove();

      expect(parent.firstChild).toBe(child2);
      expect(parent.childNodes[0]).toBe(child2);
      expect(child2.previousSibling).toBeNull();
    });

    test('should handle removing last child', () => {
      const parent = DOMPolyfill.createElement('div');
      const child1 = DOMPolyfill.createElement('span');
      const child2 = DOMPolyfill.createElement('p');

      parent.appendChild(child1);
      parent.appendChild(child2);

      child2.remove();

      expect(parent.childNodes.length).toBe(1);
      expect(child1.nextSibling).toBeNull();
    });

    test('should handle removing node without parent', () => {
      const orphan = DOMPolyfill.createElement('div');
      
      // Should not throw
      expect(() => orphan.remove()).not.toThrow();
    });
  });

  describe('Node Cloning', () => {
    test('should clone elements without children (shallow)', () => {
      const original = DOMPolyfill.createElement('div');
      original.setAttribute('class', 'test-class');
      original.setAttribute('id', 'test-id');

      const clone = original.cloneNode(false);

      expect(clone.tagName).toBe('DIV');
      expect(clone.getAttribute('class')).toBe('test-class');
      expect(clone.getAttribute('id')).toBe('test-id');
      expect(clone.childNodes.length).toBe(0);
      expect(clone.parentNode).toBeNull();
    });

    test('should clone elements with children (deep)', () => {
      const parent = DOMPolyfill.createElement('div');
      const child = DOMPolyfill.createElement('span');
      const textNode = DOMPolyfill.createTextNode('Hello');

      parent.setAttribute('class', 'parent');
      child.setAttribute('id', 'child');
      
      parent.appendChild(child);
      child.appendChild(textNode);

      const clone = parent.cloneNode(true);

      expect(clone.tagName).toBe('DIV');
      expect(clone.getAttribute('class')).toBe('parent');
      expect(clone.childNodes.length).toBe(1);
      expect(clone.childNodes[0].tagName).toBe('SPAN');
      expect(clone.childNodes[0].getAttribute('id')).toBe('child');
      expect(clone.childNodes[0].childNodes[0].textContent).toBe('Hello');
      expect(clone.childNodes[0].parentNode).toBe(clone);
    });

    test('should handle empty element cloning', () => {
      const element = DOMPolyfill.createElement('div');
      const clone = element.cloneNode(true);

      expect(clone.tagName).toBe('DIV');
      expect(clone.childNodes.length).toBe(0);
    });
  });

  describe('Text Content Management', () => {
    test('should get textContent from elements with text nodes', () => {
      const element = DOMPolyfill.createElement('div');
      const textNode1 = DOMPolyfill.createTextNode('Hello ');
      const textNode2 = DOMPolyfill.createTextNode('World');

      element.appendChild(textNode1);
      element.appendChild(textNode2);

      expect(element.textContent).toBe('Hello World');
    });

    test('should get textContent from nested elements', () => {
      const parent = DOMPolyfill.createElement('div');
      const child = DOMPolyfill.createElement('span');
      const textNode1 = DOMPolyfill.createTextNode('Parent ');
      const textNode2 = DOMPolyfill.createTextNode('Child');

      parent.appendChild(textNode1);
      parent.appendChild(child);
      child.appendChild(textNode2);

      expect(parent.textContent).toBe('Parent Child');
    });

    test('should set textContent replacing all children', () => {
      const element = DOMPolyfill.createElement('div');
      const child = DOMPolyfill.createElement('span');
      element.appendChild(child);

      element.textContent = 'New content';

      expect(element.textContent).toBe('New content');
      expect(element.childNodes.length).toBe(1);
      expect(element.childNodes[0].nodeType).toBe(3);
    });

    test('should handle empty textContent', () => {
      const element = DOMPolyfill.createElement('div');
      element.textContent = '';

      expect(element.textContent).toBe('');
      expect(element.childNodes.length).toBe(0);
    });
  });

  describe('HTML Content Processing', () => {
    test('should set innerHTML with simple HTML', () => {
      const element = DOMPolyfill.createElement('div');
      element.innerHTML = '<span>Hello</span>';

      expect(element.childNodes.length).toBe(1);
      expect(element.childNodes[0].tagName).toBe('SPAN');
      expect(element.childNodes[0].textContent).toBe('Hello');
    });

    test('should set innerHTML with multiple elements', () => {
      const element = DOMPolyfill.createElement('div');
      element.innerHTML = '<span>First</span><p>Second</p>';

      expect(element.childNodes.length).toBe(2);
      expect(element.childNodes[0].tagName).toBe('SPAN');
      expect(element.childNodes[1].tagName).toBe('P');
      expect(element.childNodes[0].textContent).toBe('First');
      expect(element.childNodes[1].textContent).toBe('Second');
    });

    test('should set innerHTML with attributes', () => {
      const element = DOMPolyfill.createElement('div');
      element.innerHTML = '<a href="https://example.com" title="Example">Link</a>';

      const link = element.childNodes[0];
      expect(link.tagName).toBe('A');
      expect(link.getAttribute('href')).toBe('https://example.com');
      expect(link.getAttribute('title')).toBe('Example');
      expect(link.textContent).toBe('Link');
    });

    test('should handle plain text in innerHTML', () => {
      const element = DOMPolyfill.createElement('div');
      element.innerHTML = 'Just plain text';

      expect(element.childNodes.length).toBe(1);
      expect(element.childNodes[0].nodeType).toBe(3);
      expect(element.childNodes[0].textContent).toBe('Just plain text');
    });

    test('should clear existing content when setting innerHTML', () => {
      const element = DOMPolyfill.createElement('div');
      const existingChild = DOMPolyfill.createElement('span');
      element.appendChild(existingChild);

      element.innerHTML = '<p>New content</p>';

      expect(element.childNodes.length).toBe(1);
      expect(element.childNodes[0].tagName).toBe('P');
    });
  });

  describe('Security and HTML Sanitization', () => {
    test('should remove script tags from innerHTML', () => {
      const element = DOMPolyfill.createElement('div');
      element.innerHTML = '<script>alert("xss")</script><p>Safe content</p>';

      // Should not contain script tag
      expect(element.innerHTML).not.toContain('<script');
      expect(element.innerHTML).not.toContain('alert');
      
      // Should still have safe content
      const children = element.querySelectorAll('*');
      const pElements = children.filter(child => child.tagName === 'P');
      expect(pElements.length).toBeGreaterThan(0);
    });

    test('should remove event handlers from attributes', () => {
      const element = DOMPolyfill.createElement('div');
      element.innerHTML = '<button onclick="alert(1)" onmouseover="alert(2)">Button</button>';

      const button = element.childNodes.find(child => child.tagName === 'BUTTON');
      if (button) {
        expect(button.getAttribute('onclick')).toBeNull();
        expect(button.getAttribute('onmouseover')).toBeNull();
      }
    });

    test('should remove javascript: URLs', () => {
      const element = DOMPolyfill.createElement('div');
      element.innerHTML = '<a href="javascript:alert(1)">Malicious Link</a>';

      const link = element.childNodes.find(child => child.tagName === 'A');
      if (link) {
        const href = link.getAttribute('href');
        expect(href).not.toContain('javascript:');
      }
    });

    test('should remove dangerous tags', () => {
      const element = DOMPolyfill.createElement('div');
      element.innerHTML = '<iframe src="evil.com"></iframe><p>Safe</p><object data="evil.swf"></object>';

      // Should not contain dangerous tags
      const children = element.querySelectorAll('*');
      const iframes = children.filter(child => child.tagName === 'IFRAME');
      const objects = children.filter(child => child.tagName === 'OBJECT');
      
      expect(iframes.length).toBe(0);
      expect(objects.length).toBe(0);
      
      // Should still have safe content
      const pElements = children.filter(child => child.tagName === 'P');
      expect(pElements.length).toBeGreaterThan(0);
    });

    test('should filter dangerous attributes', () => {
      const element = DOMPolyfill.createElement('div');
      element.innerHTML = '<img src="image.jpg" onerror="alert(1)" style="dangerous" alt="Safe Alt">';

      const img = element.childNodes.find(child => child.tagName === 'IMG');
      if (img) {
        expect(img.getAttribute('src')).toBe('image.jpg'); // Safe attribute
        expect(img.getAttribute('alt')).toBe('Safe Alt'); // Safe attribute
        expect(img.getAttribute('onerror')).toBeNull(); // Dangerous attribute removed
      }
    });

    test('should handle empty or malformed HTML safely', () => {
      const element = DOMPolyfill.createElement('div');
      
      expect(() => {
        element.innerHTML = '';
        element.innerHTML = '<>';
        element.innerHTML = '<<>>';
        element.innerHTML = null;
        element.innerHTML = undefined;
      }).not.toThrow();
    });
  });

  describe('Query Selectors', () => {
    test('should find elements by tag name', () => {
      const parent = DOMPolyfill.createElement('div');
      const span = DOMPolyfill.createElement('span');
      const p = DOMPolyfill.createElement('p');
      
      parent.appendChild(span);
      parent.appendChild(p);

      const spans = parent.querySelectorAll('span');
      const ps = parent.querySelectorAll('p');
      
      expect(spans.length).toBe(1);
      expect(spans[0]).toBe(span);
      expect(ps.length).toBe(1);
      expect(ps[0]).toBe(p);
    });

    test('should find elements by class name', () => {
      const parent = DOMPolyfill.createElement('div');
      const element1 = DOMPolyfill.createElement('span');
      const element2 = DOMPolyfill.createElement('p');
      
      element1.setAttribute('class', 'highlight');
      element2.setAttribute('class', 'highlight special');
      
      parent.appendChild(element1);
      parent.appendChild(element2);

      const highlighted = parent.querySelectorAll('.highlight');
      
      expect(highlighted.length).toBe(2);
      expect(highlighted[0]).toBe(element1);
      expect(highlighted[1]).toBe(element2);
    });

    test('should find elements by ID', () => {
      const parent = DOMPolyfill.createElement('div');
      const element = DOMPolyfill.createElement('span');
      
      element.setAttribute('id', 'unique-id');
      parent.appendChild(element);

      const found = parent.querySelector('#unique-id');
      const foundAll = parent.querySelectorAll('#unique-id');
      
      expect(found).toBe(element);
      expect(foundAll.length).toBe(1);
      expect(foundAll[0]).toBe(element);
    });

    test('should find all elements with wildcard', () => {
      const parent = DOMPolyfill.createElement('div');
      const child1 = DOMPolyfill.createElement('span');
      const child2 = DOMPolyfill.createElement('p');
      
      parent.appendChild(child1);
      parent.appendChild(child2);

      const all = parent.querySelectorAll('*');
      
      expect(all.length).toBe(2);
      expect(all).toContain(child1);
      expect(all).toContain(child2);
    });

    test('should find elements in nested structure', () => {
      const grandparent = DOMPolyfill.createElement('div');
      const parent = DOMPolyfill.createElement('div');
      const child = DOMPolyfill.createElement('span');
      
      child.setAttribute('class', 'deep');
      parent.appendChild(child);
      grandparent.appendChild(parent);

      const found = grandparent.querySelectorAll('.deep');
      
      expect(found.length).toBe(1);
      expect(found[0]).toBe(child);
    });

    test('should handle multiple selectors', () => {
      const parent = DOMPolyfill.createElement('div');
      const span = DOMPolyfill.createElement('span');
      const p = DOMPolyfill.createElement('p');
      
      parent.appendChild(span);
      parent.appendChild(p);

      const found = parent.querySelectorAll('span, p');
      
      expect(found.length).toBe(2);
      expect(found).toContain(span);
      expect(found).toContain(p);
    });

    test('should return empty array for no matches', () => {
      const parent = DOMPolyfill.createElement('div');
      
      const found = parent.querySelectorAll('.nonexistent');
      
      expect(found.length).toBe(0);
      expect(Array.isArray(found)).toBe(true);
    });

    test('should handle querySelector returning first match', () => {
      const parent = DOMPolyfill.createElement('div');
      const span1 = DOMPolyfill.createElement('span');
      const span2 = DOMPolyfill.createElement('span');
      
      parent.appendChild(span1);
      parent.appendChild(span2);

      const first = parent.querySelector('span');
      
      expect(first).toBe(span1);
    });
  });

  describe('Document Creation and Management', () => {
    test('should create full document with title', () => {
      const doc = DOMPolyfill.createDocument('Test Document');

      expect(doc).toBeDefined();
      expect(doc.title).toBe('Test Document');
      expect(doc.createElement).toBeDefined();
      expect(doc.createTextNode).toBeDefined();
    });

    test('should create document with proper structure', () => {
      const doc = DOMPolyfill.createDocument();

      expect(doc.documentElement).toBeDefined();
      expect(doc.body).toBeDefined();
      expect(doc.firstChild).toBe(doc.documentElement);
    });

    test('should parse HTML content in document', () => {
      const doc = DOMPolyfill.createDocument();
      
      doc.open();
      doc.write('<html><body><h1>Hello</h1><p>World</p></body></html>');
      doc.close();

      expect(doc.body).toBeDefined();
      expect(doc.body.childNodes.length).toBeGreaterThan(0);
    });

    test('should extract title from HTML', () => {
      const doc = DOMPolyfill.createDocument();
      
      doc.open();
      doc.write('<html><head><title>Extracted Title</title></head><body>Content</body></html>');
      doc.close();

      expect(doc.title).toBe('Extracted Title');
    });

    test('should support document.getElementById', () => {
      const doc = DOMPolyfill.createDocument();
      
      doc.open();
      doc.write('<html><body><div id="test">Content</div></body></html>');
      doc.close();

      const found = doc.getElementById('test');
      expect(found).toBeDefined();
      expect(found.id).toBe('test');
    });

    test('should support document query methods', () => {
      const doc = DOMPolyfill.createDocument();
      
      doc.open();
      doc.write('<html><body><p class="test">Paragraph</p></body></html>');
      doc.close();

      const bySelector = doc.querySelector('.test');
      const allBySelector = doc.querySelectorAll('.test');
      
      expect(bySelector).toBeDefined();
      expect(allBySelector.length).toBe(1);
    });

    test('should handle malformed HTML in document', () => {
      const doc = DOMPolyfill.createDocument();
      
      expect(() => {
        doc.open();
        doc.write('<html><body><p>Unclosed paragraph<div>Nested without closing</body></html>');
        doc.close();
      }).not.toThrow();

      expect(doc.body).toBeDefined();
    });
  });

  describe('DOMParser Integration', () => {
    test('should create DOMParser class', () => {
      expect(global.globalThis.DOMParser).toBeDefined();
      expect(typeof global.globalThis.DOMParser).toBe('function');
    });

    test('should parse HTML with DOMParser', () => {
      const parser = new global.globalThis.DOMParser();
      const html = '<html><body><h1>Test</h1></body></html>';
      
      const doc = parser.parseFromString(html, 'text/html');

      expect(doc).toBeDefined();
      expect(doc.body).toBeDefined();
      expect(doc.body.childNodes.length).toBeGreaterThan(0);
    });

    test('should handle empty content in DOMParser', () => {
      const parser = new global.globalThis.DOMParser();
      
      expect(() => {
        const doc = parser.parseFromString('', 'text/html');
        expect(doc).toBeDefined();
      }).not.toThrow();
    });

    test('should handle different MIME types in DOMParser', () => {
      const parser = new global.globalThis.DOMParser();
      
      const htmlDoc = parser.parseFromString('<p>HTML</p>', 'text/html');
      const xmlDoc = parser.parseFromString('<root>XML</root>', 'text/xml');
      
      expect(htmlDoc).toBeDefined();
      expect(xmlDoc).toBeDefined();
    });
  });

  describe('Node Constants and Compatibility', () => {
    test('should define Node constants', () => {
      const Node = global.globalThis.Node;
      
      expect(Node.ELEMENT_NODE).toBe(1);
      expect(Node.ATTRIBUTE_NODE).toBe(2);
      expect(Node.TEXT_NODE).toBe(3);
      expect(Node.CDATA_SECTION_NODE).toBe(4);
      expect(Node.DOCUMENT_NODE).toBe(9);
      expect(Node.DOCUMENT_FRAGMENT_NODE).toBe(11);
    });

    test('should maintain nodeType consistency', () => {
      const element = DOMPolyfill.createElement('div');
      const textNode = DOMPolyfill.createTextNode('text');
      
      expect(element.nodeType).toBe(global.globalThis.Node.ELEMENT_NODE);
      expect(textNode.nodeType).toBe(global.globalThis.Node.TEXT_NODE);
    });
  });

  describe('Turndown.js Compatibility', () => {
    test('should provide isCode property for elements', () => {
      const element = DOMPolyfill.createElement('div');
      
      expect(element.isCode).toBeDefined();
      expect(typeof element.isCode).toBe('boolean');
    });

    test('should maintain isCode property in parent-child relationships', () => {
      const parent = DOMPolyfill.createElement('div');
      const child = DOMPolyfill.createElement('span');
      
      parent.appendChild(child);
      
      expect(parent.isCode).toBeDefined();
      expect(child.isCode).toBeDefined();
    });

    test('should support JSDOMParser-like behavior', () => {
      const doc = DOMPolyfill.createDocument();
      
      doc.open();
      doc.write('<html><body>Content</body></html>');
      doc.close();

      // Should have JSDOMParser-like property for Readability compatibility
      expect(doc.documentElement.__JSDOMParser__).toBeDefined();
    });

    test('should handle complex HTML structures for Turndown', () => {
      const complexHTML = `
        <article>
          <h1>Article Title</h1>
          <p>Introduction paragraph</p>
          <h2>Section</h2>
          <ul>
            <li>List item 1</li>
            <li>List item 2</li>
          </ul>
          <blockquote>
            <p>Quote content</p>
          </blockquote>
        </article>
      `;

      const doc = DOMPolyfill.createDocument();
      doc.open();
      doc.write(complexHTML);
      doc.close();

      // Should parse complex structure correctly
      expect(doc.body).toBeDefined();
      const articles = doc.querySelectorAll('article');
      expect(articles.length).toBe(1);
      
      const headings = doc.querySelectorAll('h1, h2');
      expect(headings.length).toBe(2);
      
      const lists = doc.querySelectorAll('ul');
      expect(lists.length).toBe(1);
    });
  });

  describe('Performance and Memory Management', () => {
    test('should handle large DOM trees efficiently', () => {
      const root = DOMPolyfill.createElement('div');
      
      const startTime = performance.now();
      
      // Create a moderately large tree
      for (let i = 0; i < 100; i++) {
        const child = DOMPolyfill.createElement('div');
        child.setAttribute('id', `child-${i}`);
        child.textContent = `Content ${i}`;
        root.appendChild(child);
      }
      
      const endTime = performance.now();
      
      expect(root.childNodes.length).toBe(100);
      expect(endTime - startTime).toBeLessThan(1000); // Should be fast
    });

    test('should handle deep nesting without stack overflow', () => {
      let current = DOMPolyfill.createElement('div');
      const root = current;
      
      // Create deep nesting
      for (let i = 0; i < 100; i++) {
        const child = DOMPolyfill.createElement('div');
        child.textContent = `Level ${i}`;
        current.appendChild(child);
        current = child;
      }
      
      // Should be able to get textContent without stack overflow
      expect(() => {
        const allText = root.textContent;
        expect(allText.length).toBeGreaterThan(0);
      }).not.toThrow();
    });

    test('should clean up references when removing nodes', () => {
      const parent = DOMPolyfill.createElement('div');
      const child = DOMPolyfill.createElement('span');
      
      parent.appendChild(child);
      expect(child.parentNode).toBe(parent);
      
      child.remove();
      expect(child.parentNode).toBeNull();
      expect(child.nextSibling).toBeNull();
      expect(child.previousSibling).toBeNull();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle circular references safely', () => {
      const element = DOMPolyfill.createElement('div');
      
      // Attempt to create circular reference
      expect(() => {
        element.appendChild(element);
      }).not.toThrow();
    });

    test('should handle invalid selector strings', () => {
      const element = DOMPolyfill.createElement('div');
      
      expect(() => {
        element.querySelector('');
        element.querySelector(null);
        element.querySelector(undefined);
      }).not.toThrow();
    });

    test('should handle invalid HTML gracefully', () => {
      const element = DOMPolyfill.createElement('div');
      
      expect(() => {
        element.innerHTML = '<><><>';
        element.innerHTML = '<<<>>>';
        element.innerHTML = '<script><script>';
      }).not.toThrow();
    });

    test('should maintain consistency after multiple operations', () => {
      const parent = DOMPolyfill.createElement('div');
      const children = [];
      
      // Add many children
      for (let i = 0; i < 10; i++) {
        const child = DOMPolyfill.createElement('span');
        children.push(child);
        parent.appendChild(child);
      }
      
      // Remove every other child
      for (let i = 0; i < children.length; i += 2) {
        children[i].remove();
      }
      
      // Verify consistency
      expect(parent.childNodes.length).toBe(5);
      parent.childNodes.forEach((child, index) => {
        if (index > 0) {
          expect(child.previousSibling).toBe(parent.childNodes[index - 1]);
        }
        if (index < parent.childNodes.length - 1) {
          expect(child.nextSibling).toBe(parent.childNodes[index + 1]);
        }
      });
    });

    test('should handle text node edge cases', () => {
      const textNode = DOMPolyfill.createTextNode('');
      
      expect(textNode.textContent).toBe('');
      expect(textNode.data).toBe('');
      expect(textNode.nodeValue).toBe('');
      
      textNode.textContent = 'Updated';
      expect(textNode.data).toBe('Updated');
      expect(textNode.nodeValue).toBe('Updated');
    });
  });

  describe('Integration with Real DOM APIs', () => {
    test('should not conflict with existing DOM globals', () => {
      // Our polyfill should not interfere if real DOM APIs exist
      const originalDocument = global.document;
      
      // Install polyfill when globals exist
      global.document = { existing: true };
      DOMPolyfill.install();
      
      expect(global.globalThis.document).toBeDefined();
      expect(global.globalThis.DOMParser).toBeDefined();
      
      // Cleanup
      global.document = originalDocument;
    });

    test('should provide backwards compatibility', () => {
      // Test that our APIs work as expected for Turndown.js
      const element = global.globalThis.document.createElement('div');
      element.innerHTML = '<p>Test</p>';
      
      expect(element.firstChild.tagName).toBe('P');
      expect(element.firstChild.textContent).toBe('Test');
    });
  });
});