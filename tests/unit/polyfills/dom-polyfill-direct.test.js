/**
 * Direct unit tests for DOM Polyfill functionality
 * Tests DOM API simulation in Service Worker environment
 */

// Mock the Service Worker environment
global.self = {
  DOMPolyfill: null
};

// Mock global objects that DOM polyfill needs
global.globalThis = {
  document: undefined,
  DOMParser: undefined,
  Node: undefined
};

// Load the module directly
require('../../../src/background/polyfills/dom-polyfill.js');

describe('DOMPolyfill Module - Direct', () => {

  test('DOMPolyfill should be available globally', () => {
    expect(global.self.DOMPolyfill).toBeDefined();
    expect(typeof global.self.DOMPolyfill).toBe('object');
  });

  test('should have all required methods', () => {
    const dom = global.self.DOMPolyfill;

    expect(typeof dom.install).toBe('function');
    expect(typeof dom.isReady).toBe('function');
    expect(typeof dom.createElement).toBe('function');
    expect(typeof dom.createTextNode).toBe('function');
    expect(typeof dom.createDocument).toBe('function');
  });

  test('should set up global DOM APIs', () => {
    expect(globalThis.document).toBeDefined();
    expect(globalThis.DOMParser).toBeDefined();
    expect(globalThis.Node).toBeDefined();
  });

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

  test('should create elements with correct properties', () => {
    const element = globalThis.document.createElement('div');

    expect(element.tagName).toBe('DIV');
    expect(element.nodeName).toBe('DIV');
    expect(element.nodeType).toBe(1); // ELEMENT_NODE
    expect(element).toHaveProperty('childNodes');
    expect(element).toHaveProperty('firstChild', null);
    expect(element).toHaveProperty('parentNode', null);
    expect(element).toHaveProperty('isCode', false);
  });

  test('should create text nodes with correct properties', () => {
    const textNode = globalThis.document.createTextNode('Hello World');

    expect(textNode.nodeType).toBe(3); // TEXT_NODE
    expect(textNode.nodeName).toBe('#text');
    expect(textNode.textContent).toBe('Hello World');
    expect(textNode.data).toBe('Hello World');
    expect(textNode.nodeValue).toBe('Hello World');
  });

  test('should handle element attributes', () => {
    const element = globalThis.document.createElement('input');

    // Set attributes
    element.setAttribute('type', 'text');
    element.setAttribute('id', 'test-input');
    element.setAttribute('class', 'form-control');

    // Test getAttribute
    expect(element.getAttribute('type')).toBe('text');
    expect(element.getAttribute('id')).toBe('test-input');
    expect(element.getAttribute('class')).toBe('form-control');
    expect(element.getAttribute('nonexistent')).toBe(null);

    // Test ID property
    expect(element.id).toBe('test-input');
  });

  test('should handle element child relationships', () => {
    const parent = globalThis.document.createElement('div');
    const child1 = globalThis.document.createElement('span');
    const child2 = globalThis.document.createElement('p');

    // Initially empty
    expect(parent.childNodes).toHaveLength(0);
    expect(parent.firstChild).toBe(null);

    // Add first child
    parent.appendChild(child1);
    expect(parent.childNodes).toHaveLength(1);
    expect(parent.firstChild).toBe(child1);
    expect(child1.parentNode).toBe(parent);
    expect(child1.nextSibling).toBe(null);
    expect(child1.previousSibling).toBe(null);

    // Add second child
    parent.appendChild(child2);
    expect(parent.childNodes).toHaveLength(2);
    expect(parent.firstChild).toBe(child1);
    expect(child1.nextSibling).toBe(child2);
    expect(child2.previousSibling).toBe(child1);
    expect(child2.nextSibling).toBe(null);
  });

  test('should handle isCode property on elements', () => {
    const parent = globalThis.document.createElement('div');
    const child = globalThis.document.createElement('code');

    // Elements should have isCode property
    expect(parent).toHaveProperty('isCode');
    expect(child).toHaveProperty('isCode');

    // Initially should be false
    expect(parent.isCode).toBe(false);
    expect(child.isCode).toBe(false);

    // After appendChild, should still have isCode property
    parent.appendChild(child);
    expect(parent.isCode).toBe(false);
    expect(child.isCode).toBe(false);
  });

  test('should handle simple innerHTML', () => {
    const element = globalThis.document.createElement('div');
    element.innerHTML = '<p>Hello World</p>';

    expect(element.childNodes).toHaveLength(1);
    expect(element.firstChild.tagName).toBe('P');
    expect(element.firstChild.textContent).toBe('Hello World');
  });

  test('should handle complex nested innerHTML', () => {
    const element = globalThis.document.createElement('div');
    element.innerHTML = '<div><p>Hello <strong>World</strong>!</p></div>';

    expect(element.childNodes).toHaveLength(1);
    const outerDiv = element.firstChild;
    expect(outerDiv.tagName).toBe('DIV');

    expect(outerDiv.childNodes).toHaveLength(1);
    const p = outerDiv.firstChild;
    expect(p.tagName).toBe('P');

    // Should have text node and strong element
    expect(p.childNodes).toHaveLength(2);
    expect(p.childNodes[0].nodeType).toBe(3); // TEXT_NODE
    expect(p.childNodes[0].textContent).toBe('Hello ');
    expect(p.childNodes[1].tagName).toBe('STRONG');
  });

  test('should handle mixed text and HTML in innerHTML', () => {
    const element = globalThis.document.createElement('div');
    element.innerHTML = 'Before <span>middle</span> after';

    expect(element.childNodes).toHaveLength(3);
    expect(element.childNodes[0].nodeType).toBe(3); // TEXT_NODE
    expect(element.childNodes[0].textContent).toBe('Before ');
    expect(element.childNodes[1].tagName).toBe('SPAN');
    expect(element.childNodes[2].nodeType).toBe(3); // TEXT_NODE
    expect(element.childNodes[2].textContent).toBe(' after');
  });

  test('should handle plain text innerHTML', () => {
    const element = globalThis.document.createElement('div');
    element.innerHTML = 'Just plain text';

    expect(element.childNodes).toHaveLength(1);
    expect(element.firstChild.nodeType).toBe(3);
    expect(element.firstChild.textContent).toBe('Just plain text');
  });

  test('should clear existing children when setting innerHTML', () => {
    const element = globalThis.document.createElement('div');

    // Add some children
    element.appendChild(globalThis.document.createElement('span'));
    element.appendChild(globalThis.document.createTextNode('text'));
    expect(element.childNodes).toHaveLength(2);

    // Set innerHTML should clear existing children
    element.innerHTML = '<p>New content</p>';
    expect(element.childNodes).toHaveLength(1);
    expect(element.firstChild.tagName).toBe('P');
  });

  test('should compute textContent from child nodes', () => {
    const element = globalThis.document.createElement('div');

    const textNode = globalThis.document.createTextNode('Hello ');
    const span = globalThis.document.createElement('span');
    span.textContent = 'World';
    const textNode2 = globalThis.document.createTextNode('!');

    element.appendChild(textNode);
    element.appendChild(span);
    element.appendChild(textNode2);

    expect(element.textContent).toBe('Hello World!');
  });

  test('should recursively compute textContent from nested elements', () => {
    const element = globalThis.document.createElement('div');
    element.innerHTML = '<p>Hello <strong>World</strong>!</p>';

    expect(element.textContent).toBe('Hello World!');
  });

  test('should set textContent and clear children', () => {
    const element = globalThis.document.createElement('div');
    element.innerHTML = '<p>Old content</p><span>test</span>';

    expect(element.childNodes).toHaveLength(2);

    element.textContent = 'New text content';

    expect(element.childNodes).toHaveLength(1);
    expect(element.firstChild.nodeType).toBe(3);
    expect(element.firstChild.textContent).toBe('New text content');
  });

  test('should handle empty elements for textContent', () => {
    const element = globalThis.document.createElement('div');
    expect(element.textContent).toBe('');
  });

  test('should parse HTML with Turndown root element', () => {
    const parser = new globalThis.DOMParser();
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
    expect(doc.body.childNodes).toHaveLength(1);

    const rootElement = doc.body.firstChild;
    expect(rootElement.tagName).toBe('X-TURNDOWN');
    expect(rootElement.id).toBe('turndown-root');
    expect(rootElement.childNodes).toHaveLength(2);
  });

  test('should handle getElementById', () => {
    const doc = globalThis.document.implementation.createHTMLDocument('Test');

    const div = doc.createElement('div');
    div.setAttribute('id', 'test-div');
    doc.body.appendChild(div);

    const found = doc.getElementById('test-div');
    expect(found).toBe(div);

    const notFound = doc.getElementById('non-existent');
    expect(notFound).toBe(null);
  });

  test('should handle getElementById recursively', () => {
    const doc = globalThis.document.implementation.createHTMLDocument('Test');

    const outer = doc.createElement('div');
    const inner = doc.createElement('span');
    inner.setAttribute('id', 'inner-element');

    outer.appendChild(inner);
    doc.body.appendChild(outer);

    const found = doc.getElementById('inner-element');
    expect(found).toBe(inner);
  });

  test('should handle edge cases gracefully', () => {
    const element = globalThis.document.createElement('div');

    // Null/undefined attributes
    element.setAttribute('test', null);
    expect(element.getAttribute('test')).toBe('null');

    // Undefined textContent
    element.textContent = undefined;
    expect(element.textContent).toBe('');

    // Empty strings
    element.innerHTML = '';
    expect(element.childNodes).toHaveLength(0);

    element.textContent = '';
    expect(element.childNodes).toHaveLength(0);
  });

  test('should handle self-closing tags', () => {
    const element = globalThis.document.createElement('div');
    element.innerHTML = '<img src="test.jpg" /><br/><input type="text" />';

    expect(element.childNodes).toHaveLength(3);
    expect(element.childNodes[0].tagName).toBe('IMG');
    expect(element.childNodes[1].tagName).toBe('BR');
    expect(element.childNodes[2].tagName).toBe('INPUT');
  });
});
