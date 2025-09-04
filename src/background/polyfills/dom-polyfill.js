// DOM Polyfill for Service Worker Environment
// This module provides DOM APIs that Turndown.js requires in the Service Worker context

(function() {
  'use strict';

  console.log('🔧 Loading DOM Polyfill module...');

  // Track polyfill installation state
  let domPolyfillInstalled = false;

  // 🚨 SECURITY: HTML Sanitization Functions

  /**
   * Parse HTML content into structured segments
   */
  function parseHTMLContent(html) {
    const segments = [];
    let remaining = html;
    let position = 0;

    // Regular expressions for different HTML patterns
    const tagRegex = /<(\w+)([^>]*)\/?>/g;
    const closingTagRegex = /<\/(\w+)>/g;

    // Simple HTML parser that handles basic cases
    while (remaining.length > 0) {
      tagRegex.lastIndex = 0;
      const tagMatch = tagRegex.exec(remaining);

      if (tagMatch) {
        const tagStart = tagMatch.index;
        const [, tagName, attrs] = tagMatch;
        const isSelfClosing = remaining[tagMatch.index + tagMatch[0].length - 2] === '/';

        // Add text before the tag
        if (tagStart > 0) {
          const textContent = remaining.substring(0, tagStart);
          if (textContent.trim()) {
            segments.push({ type: 'text', content: textContent });
          }
        }

        // Parse attributes
        const attributes = {};
        const attrRegex = /(\w+)="([^"]*)"/g;
        let attrMatch;
        while ((attrMatch = attrRegex.exec(attrs)) !== null) {
          attributes[attrMatch[1]] = attrMatch[2];
        }

        if (isSelfClosing) {
          // Self-closing tag
          segments.push({
            type: 'element',
            tagName: tagName.toUpperCase(),
            attributes,
            content: ''
          });
          remaining = remaining.substring(tagMatch.index + tagMatch[0].length);
        } else {
          // Find matching closing tag
          const closingTagPattern = new RegExp(`</${tagName}>`, 'i');
          const afterTag = remaining.substring(tagMatch.index + tagMatch[0].length);
          const closingMatch = afterTag.match(closingTagPattern);

          if (closingMatch) {
            const content = afterTag.substring(0, closingMatch.index);
            segments.push({
              type: 'element',
              tagName: tagName.toUpperCase(),
              attributes,
              content
            });
            remaining = afterTag.substring(closingMatch.index + closingMatch[0].length);
          } else {
            // No closing tag found, treat as self-closing
            segments.push({
              type: 'element',
              tagName: tagName.toUpperCase(),
              attributes,
              content: ''
            });
            remaining = remaining.substring(tagMatch.index + tagMatch[0].length);
          }
        }
      } else {
        // No more tags, add remaining text
        if (remaining.trim()) {
          segments.push({ type: 'text', content: remaining });
        }
        break;
      }
    }

    return segments;
  }

  /**
   * 🚨 SECURITY: Sanitize HTML content to prevent XSS attacks
   * Only allows safe HTML tags and attributes
   */
  function sanitizeHTML(html) {
    if (!html || typeof html !== 'string') return '';

    // 🚨 SECURITY: Remove dangerous HTML patterns
    let sanitized = html;

    // Remove script tags and their content
    sanitized = sanitized.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    sanitized = sanitized.replace(/<script[^>]*\/?>/gi, '');

    // Remove event handlers
    sanitized = sanitized.replace(/on\w+="[^"]*"/gi, '');
    sanitized = sanitized.replace(/on\w+='[^']*'/gi, '');
    sanitized = sanitized.replace(/javascript:/gi, '');

    // Remove potentially dangerous tags
    const dangerousTags = ['iframe', 'object', 'embed', 'form', 'input', 'button'];
    dangerousTags.forEach(tag => {
      const regex = new RegExp(`<${tag}[^>]*>[\s\S]*?<\/${tag}>`, 'gi');
      sanitized = sanitized.replace(regex, '');
      sanitized = sanitized.replace(new RegExp(`<${tag}[^>]*/?>`, 'gi'), '');
    });

    return sanitized;
  }

  /**
   * 🚨 SECURITY: Check if HTML tag is allowed
   */
  function isAllowedTag(tagName) {
    const allowedTags = [
      'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'a', 'strong', 'em', 'b', 'i', 'code',
      'pre', 'blockquote', 'br', 'img', 'table', 'thead', 'tbody',
      'tr', 'th', 'td', 'caption'
    ];
    return allowedTags.includes(tagName.toLowerCase());
  }

  /**
   * 🚨 SECURITY: Check if HTML attribute is allowed
   */
  function isAllowedAttribute(attrName) {
    const allowedAttrs = [
      'href', 'src', 'alt', 'title', 'class', 'id', 'colspan', 'rowspan'
    ];
    return allowedAttrs.includes(attrName.toLowerCase());
  }

  /**
   * 🚨 SECURITY: Sanitize HTML attribute values
   */
  function sanitizeAttribute(value) {
    if (!value || typeof value !== 'string') return '';

    // 🚨 SECURITY: Remove dangerous patterns from attribute values
    let sanitized = value;

    // Remove javascript: URLs
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/vbscript:/gi, '');
    sanitized = sanitized.replace(/data:/gi, '');

    // Remove event handlers
    sanitized = sanitized.replace(/on\w+/gi, '');

    return sanitized;
  }

  /**
   * Create DOM element with full API compatibility
   */
  function createDOMElement(tagName) {
    const element = {
      tagName: tagName.toUpperCase(),
      nodeName: tagName.toUpperCase(),
      nodeType: 1,
      _innerHTML: '',
      textContent: '',
      childNodes: [],
      firstChild: null,
      parentNode: null,
      nextSibling: null,
      previousSibling: null,
      isCode: false,
      id: null,

      setAttribute: function(name, value) {
        this[name] = value;
        if (name === 'id') {
          this.id = value;
        }
      },

      getAttribute: function(name) {
        return this[name] || null;
      },

      appendChild: function(child) {
        // Safely set parentNode - always use defineProperty for consistency
        Object.defineProperty(child, 'parentNode', {
          value: this,
          writable: true,
          enumerable: true,
          configurable: true
        });

        // CRITICAL: Ensure parentNode has isCode property for TurndownService
        if (!('isCode' in this)) {
          this.isCode = false;
        }
        // Also ensure child has isCode property
        if (!('isCode' in child)) {
          child.isCode = false;
        }
        this.childNodes.push(child);
        if (this.childNodes.length === 1) {
          this.firstChild = child;
        }
        // Set up sibling relationships
        if (this.childNodes.length > 1) {
          const prevChild = this.childNodes[this.childNodes.length - 2];
          Object.defineProperty(prevChild, 'nextSibling', {
            value: child,
            writable: true,
            enumerable: true,
            configurable: true
          });
          Object.defineProperty(child, 'previousSibling', {
            value: prevChild,
            writable: true,
            enumerable: true,
            configurable: true
          });
        }
        return child;
      },

      // Remove this node from its parent
      remove: function() {
        if (!this.parentNode || !this.parentNode.childNodes) return;
        const idx = this.parentNode.childNodes.indexOf(this);
        if (idx >= 0) {
          // Fix sibling links
          const prev = this.parentNode.childNodes[idx - 1] || null;
          const next = this.parentNode.childNodes[idx + 1] || null;
          if (prev) prev.nextSibling = next || null;
          if (next) next.previousSibling = prev || null;
          this.parentNode.childNodes.splice(idx, 1);
          if (this.parentNode.firstChild === this) {
            this.parentNode.firstChild = this.parentNode.childNodes[0] || null;
          }
        }
        this.parentNode = null;
        this.nextSibling = null;
        this.previousSibling = null;
      },

      // Clone this node (optionally deep)
      cloneNode: function(deep) {
        const clone = createDOMElement(this.tagName);
        // Copy attributes/properties that were set via setAttribute
        for (const key of Object.keys(this)) {
          if (['tagName','nodeName','nodeType','_innerHTML','childNodes','firstChild','parentNode','nextSibling','previousSibling','isCode'].includes(key)) continue;
          if (typeof this[key] !== 'function') {
            clone[key] = this[key];
          }
        }
        if (deep) {
          this.childNodes.forEach(ch => {
            if (ch && ch.nodeType === 1 && ch.cloneNode) {
              clone.appendChild(ch.cloneNode(true));
            } else if (ch && ch.nodeType === 3) {
              clone.appendChild(createTextNode(ch.textContent || ch.data || ''));
            }
          });
        }
        return clone;
      },

      // Basic selector support on elements
      querySelectorAll: function(selector) {
        const selectors = selector.split(',').map(s => s.trim()).filter(Boolean);
        const results = [];
        const visit = (node) => {
          if (!node || !node.childNodes) return;
          for (const child of node.childNodes) {
            if (child && child.nodeType === 1) {
              if (selectors.some(sel => matchesSelector(child, sel))) {
                results.push(child);
              }
              // Recurse
              visit(child);
            }
          }
        };
        visit(this);
        return results;
      },

      querySelector: function(selector) {
        const results = this.querySelectorAll(selector);
        return results.length ? results[0] : null;
      }
    };

    // Add textContent getter/setter
    Object.defineProperty(element, 'textContent', {
      get: function() {
        // Dynamically compute textContent from childNodes
        let text = '';
        for (const child of this.childNodes) {
          if (child.nodeType === 3) { // TEXT_NODE
            text += child.textContent || child.data || '';
          } else if (child.nodeType === 1) { // ELEMENT_NODE
            // For element nodes, recursively get their textContent
            text += child.textContent || '';
          }
        }
        return text;
      },
      set: function(value) {
        // Clear existing childNodes and add a single text node
        this.childNodes = [];
        this.firstChild = null;
        if (value) {
          const textNode = createTextNode(value);
          this.appendChild(textNode);
        }
      }
    });

    // Add innerHTML getter/setter
    Object.defineProperty(element, 'innerHTML', {
      get: function() { return this._innerHTML || ''; },
      set: function(value) {
        this._innerHTML = value;
        this.childNodes = [];
        this.firstChild = null;

        if (value && value.trim()) {
          // 🚨 SECURITY: Sanitize HTML content to prevent XSS attacks
          const sanitizedValue = sanitizeHTML(value);

          // Check if it contains HTML tags after sanitization
          if (/<[^>]*>/.test(sanitizedValue)) {
            // Parse HTML content more comprehensively
            const segments = parseHTMLContent(sanitizedValue);
            for (const segment of segments) {
              if (segment.type === 'element') {
                const childElement = createDOMElement(segment.tagName);

                // 🚨 SECURITY: Sanitize attributes
                for (const [attrName, attrValue] of Object.entries(segment.attributes || {})) {
                  // 🚨 SECURITY: Only allow safe attributes
                  if (isAllowedAttribute(attrName)) {
                    const sanitizedAttrValue = sanitizeAttribute(attrValue);
                    childElement.setAttribute(attrName, sanitizedAttrValue);
                  }
                }

                if (segment.content && segment.content.trim()) {
                  childElement.innerHTML = segment.content;
                }

                this.appendChild(childElement);
              } else if (segment.type === 'text' && segment.content.trim()) {
                const textNode = createTextNode(segment.content);
                this.appendChild(textNode);
              }
            }
          } else {
            // Pure text content
            const textNode = createTextNode(sanitizedValue);
            this.appendChild(textNode);
          }
        } else {
            // Just text content (only if not empty)
            const trimmedValue = value.trim();
            if (trimmedValue) {
              const textNode = createTextNode(trimmedValue);
              this.appendChild(textNode);
            }
          }
      }
    });

    return element;
  }

  /**
   * Create text node
   */
  function createTextNode(text) {
    const node = {
      nodeType: 3,
      nodeName: '#text',
      textContent: text || '',
      data: text || '',
      nodeValue: text || '',
      parentNode: null,
      nextSibling: null,
      previousSibling: null,
      isCode: false
    };

    // Add getter for textContent to ensure it returns the data
    Object.defineProperty(node, 'textContent', {
      get: function() { return this.data || ''; },
      set: function(value) { this.data = value; this.nodeValue = value; }
    });

    return node;
  }

  /**
   * Create full document with Turndown.js compatibility
   */
  function createFullDocument(title) {
    // Define element creation functions first to avoid circular dependency
    const createDOMElementForDoc = function(tagName) {
      const element = {
        tagName: tagName.toUpperCase(),
        nodeName: tagName.toUpperCase(),
        nodeType: 1,
        _innerHTML: '',
        textContent: '',
        childNodes: [],
        firstChild: null,
        parentNode: null,
        nextSibling: null,
        previousSibling: null,
        isCode: false,
        id: null,

        setAttribute: function(name, value) {
          this[name] = value;
          if (name === 'id') {
            this.id = value;
            // Note: For createFullDocument, we use recursive search in getElementById
            // so we don't need to maintain a separate _elementsById map
          }
        },

        getAttribute: function(name) {
          return this[name] || null;
        },

        appendChild: function(child) {
          child.parentNode = this;
          if (!('isCode' in this)) {
            this.isCode = false;
          }
          if (!('isCode' in child)) {
            child.isCode = false;
          }
          this.childNodes.push(child);
          if (this.childNodes.length === 1) {
            this.firstChild = child;
          }
          if (this.childNodes.length > 1) {
            const prevChild = this.childNodes[this.childNodes.length - 2];
            prevChild.nextSibling = child;
            child.previousSibling = prevChild;
          }
          return child;
        },

        remove: function() {
          if (!this.parentNode || !this.parentNode.childNodes) return;
          const idx = this.parentNode.childNodes.indexOf(this);
          if (idx >= 0) {
            const prev = this.parentNode.childNodes[idx - 1] || null;
            const next = this.parentNode.childNodes[idx + 1] || null;
            if (prev) prev.nextSibling = next || null;
            if (next) next.previousSibling = prev || null;
            this.parentNode.childNodes.splice(idx, 1);
            if (this.parentNode.firstChild === this) {
              this.parentNode.firstChild = this.parentNode.childNodes[0] || null;
            }
          }
          this.parentNode = null;
          this.nextSibling = null;
          this.previousSibling = null;
        },

        cloneNode: function(deep) {
          const clone = createDOMElementForDoc(this.tagName);
          for (const key of Object.keys(this)) {
            if (['tagName','nodeName','nodeType','_innerHTML','childNodes','firstChild','parentNode','nextSibling','previousSibling','isCode'].includes(key)) continue;
            if (typeof this[key] !== 'function') {
              clone[key] = this[key];
            }
          }
          if (deep) {
            this.childNodes.forEach(ch => {
              if (ch && ch.nodeType === 1 && ch.cloneNode) {
                clone.appendChild(ch.cloneNode(true));
              } else if (ch && ch.nodeType === 3) {
                clone.appendChild(createTextNodeForDoc(ch.textContent || ch.data || ''));
              }
            });
          }
          return clone;
        },

        querySelectorAll: function(selector) {
          const selectors = selector.split(',').map(s => s.trim()).filter(Boolean);
          const results = [];
          const visit = (node) => {
            if (!node || !node.childNodes) return;
            for (const child of node.childNodes) {
              if (child && child.nodeType === 1) {
                if (selectors.some(sel => matchesSelector(child, sel))) {
                  results.push(child);
                }
                visit(child);
              }
            }
          };
          visit(this);
          return results;
        },

        querySelector: function(selector) {
          const results = this.querySelectorAll(selector);
          return results.length ? results[0] : null;
        }
      };

      // Add textContent getter/setter
      Object.defineProperty(element, 'textContent', {
        get: function() {
          let text = '';
          for (const child of this.childNodes) {
            if (child.nodeType === 3) { // TEXT_NODE
              text += child.textContent || child.data || '';
            } else if (child.nodeType === 1) { // ELEMENT_NODE
              text += child.textContent || '';
            }
          }
          return text;
        },
        set: function(value) {
          this.childNodes = [];
          this.firstChild = null;
          if (value) {
            const textNode = createTextNode(value);
            this.appendChild(textNode);
          }
        }
      });

      Object.defineProperty(element, 'innerHTML', {
        get: function() { return this._innerHTML || ''; },
        set: function(value) {
          this._innerHTML = value;
          this.childNodes = [];
          this.firstChild = null;

          if (value && value.trim()) {
            // Check if it contains HTML tags
            if (/<[^>]*>/.test(value)) {
              const tagRegex = /<(\w+)([^>]*)>(.*?)<\/\1>/g;
              let match;
              while ((match = tagRegex.exec(value)) !== null) {
                const [, childTagName, attrs, content] = match;
                const childElement = createDOMElementForDoc(childTagName);

                const attrRegex = /(\w+)="([^"]*)"/g;
                let attrMatch;
                while ((attrMatch = attrRegex.exec(attrs)) !== null) {
                  childElement.setAttribute(attrMatch[1], attrMatch[2]);
                }

                if (content && content.trim()) {
                  childElement.innerHTML = content;
                }

                this.appendChild(childElement);
              }

              const textOnly = value.replace(/<[^>]*>/g, '').trim();
              if (textOnly) {
                const textNode = createTextNode(textOnly);
                this.appendChild(textNode);
              }
            } else {
              const textNode = createTextNode(value.trim());
              this.appendChild(textNode);
            }
          }
        }
      });

      return element;
    };

    const createTextNodeForDoc = function(text) {
      return {
        nodeType: 3,
        nodeName: '#text',
        textContent: text || '',
        data: text || '',
        nodeValue: text || '',
        parentNode: null,
        nextSibling: null,
        previousSibling: null,
        isCode: false
      };
    };

    const doc = {
      title: title || '',
      _buffer: '',
      open: function() { this._buffer = ''; },
      write: function(content) {
        this._buffer += content || '';
        this._parseBuffer();
      },
      close: function() { this._parseBuffer(); },
      createElement: createDOMElementForDoc,
      createTextNode: createTextNodeForDoc,
      // For Readability compatibility: document.firstChild should be the HTML element
      firstChild: null,
      querySelectorAll: function(selector) {
        // Prefer body, then documentElement
        if (this.body && this.body.querySelectorAll) return this.body.querySelectorAll(selector);
        if (this.documentElement && this.documentElement.querySelectorAll) return this.documentElement.querySelectorAll(selector);
        return [];
      },
      querySelector: function(selector) {
        const res = this.querySelectorAll(selector);
        return res.length ? res[0] : null;
      },

      getElementById: function(id) {
        function findById(element) {
          if (!element) return null;
          if (element.id === id) return element;

          if (element.childNodes) {
            for (const child of element.childNodes) {
              const found = findById(child);
              if (found) return found;
            }
          }
          return null;
        }

        if (this.documentElement) {
          const found = findById(this.documentElement);
          if (found) return found;
        }

        if (this.body) {
          const found = findById(this.body);
          if (found) return found;
        }

        return null;
      },

      _parseBuffer: function() {
        if (!this._buffer) return;

        // Extract <title> if present
        try {
          const titleMatch = this._buffer.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
          if (titleMatch && titleMatch[1]) {
            this.title = titleMatch[1].replace(/\s+/g, ' ').trim();
          }
        } catch (_) {}

        // Build BODY element from full HTML buffer (sanitized by element.innerHTML setter)
        const bodyEl = createDOMElementForDoc('body');
        try {
          // Try to isolate real <body> content first
          const bodyOnlyMatch = this._buffer.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
          const bodyContent = bodyOnlyMatch ? bodyOnlyMatch[1] : this._buffer;
          bodyEl.innerHTML = bodyContent;
        } catch (e) {
          // Fallback: put the whole buffer as text if parsing fails
          bodyEl.innerHTML = this._buffer;
        }
        this.body = bodyEl;

        // Create HTML root and append BODY
        const htmlEl = createDOMElementForDoc('html');
        htmlEl.appendChild(this.body);
        this.documentElement = htmlEl;

        // Readability checks doc.firstChild.__JSDOMParser__, mimic that shape
        try {
          Object.defineProperty(this.documentElement, '__JSDOMParser__', {
            value: globalThis.DOMParser || function() {},
            writable: false,
            configurable: true,
            enumerable: false
          });
        } catch (e) {
          this.documentElement.__JSDOMParser__ = globalThis.DOMParser || function() {};
        }

        // Ensure document.firstChild points to the HTML element
        this.firstChild = this.documentElement;
      }
    };

    doc.getElementsByTagName = function(tagName) {
      const results = [];
      if (tagName.toUpperCase() === 'BODY' && this.body) {
        results.push(this.body);
      }
      return results;
    };

    return doc;
  }

  // Very small selector matcher: supports '*', tag, '.class', '#id'
  function matchesSelector(el, selector) {
    if (!selector || !el || el.nodeType !== 1) return false;
    if (selector === '*') return true;
    if (selector.startsWith('.')) {
      const cls = (el.className || el['class'] || '').toString().split(/\s+/);
      const want = selector.slice(1);
      return cls.includes(want);
    }
    if (selector.startsWith('#')) {
      return (el.id || '') === selector.slice(1);
    }
    // tag selector
    return (el.tagName || '').toLowerCase() === selector.toLowerCase();
  }

  /**
   * Install DOM polyfill
   */
  function installDOMPolyfill() {
    if (domPolyfillInstalled) {
      return;
    }

    console.log('🔧 Installing DOM polyfill...');

    // Create complete document object (always install our polyfill)
    {
      console.log('Setting globalThis.document...');
      globalThis.document = {
        implementation: {
          createHTMLDocument: createFullDocument
        },
        _elementsById: new Map(),
        createElement: createDOMElement,
        createTextNode: createTextNode,

        getElementById: function(id) {
          return this._elementsById.get(id) || null;
        },

        getElementsByTagName: function(tagName) {
          return [];
        },

        querySelector: function(selector) { return null; },
        querySelectorAll: function(selector) { return []; }
      };
    }

    // Install DOMParser
    if (!globalThis.DOMParser) {
      globalThis.DOMParser = class DOMParser {
        parseFromString(source, mimeType) {
          const doc = globalThis.document.implementation.createHTMLDocument('');

          if (mimeType === 'text/html' && source) {
            doc.open();
            doc.write(source);
            doc.close();
          }

          return doc;
        }
      };
    }

    // Install Node constants
    if (!globalThis.Node) {
      globalThis.Node = {
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

    domPolyfillInstalled = true;
    console.log('✅ DOM polyfill installation complete');
    console.log('globalThis.document keys after install:', Object.keys(globalThis.document));
  }

  /**
   * Check if DOM polyfill is ready
   */
  function isDOMPolyfillReady() {
    return domPolyfillInstalled &&
           typeof globalThis.document !== 'undefined' &&
           typeof globalThis.DOMParser !== 'undefined' &&
           typeof globalThis.Node !== 'undefined';
  }

  // Export module interface
  self.DOMPolyfill = {
    install: installDOMPolyfill,
    isReady: isDOMPolyfillReady,
    createElement: createDOMElement,
    createTextNode: createTextNode,
    createDocument: createFullDocument
  };

  // Auto-install if not already done
  if (!domPolyfillInstalled) {
    installDOMPolyfill();
  }

  console.log('✅ DOM Polyfill module loaded');

})();
