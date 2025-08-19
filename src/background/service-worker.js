// MarkDownload Extension Service Worker (Manifest V3)
// This file combines all background scripts into a single service worker

console.log("🔄 MarkDownload Service Worker: Starting up...");

// Global download state management to prevent duplicate downloads
let globalDownloadInProgress = false;

const downloadDebounceTime = 1000; // 1 second debounce

// Service Worker health check - expose status for debugging
self.serviceWorkerStatus = {
  initialized: false,
  dependenciesLoaded: false,
  errors: []
};

// Import browser polyfill for cross-browser compatibility
// Note: Service worker is in background/ directory, polyfill is in parent directory
try {
  importScripts('../browser-polyfill.min.js');
  console.log("✅ browser-polyfill.min.js loaded");
} catch (error) {
  console.error("❌ Failed to load browser-polyfill.min.js:", error);
  self.serviceWorkerStatus.errors.push('browser-polyfill failed: ' + error.message);
}

// CRITICAL FIX: Install DOM polyfill IMMEDIATELY before loading turndown.js
// This prevents firstChild errors in turndown rules that are defined at load time
let domPolyfillInstalled = false;

/**
 * Install DOM polyfill IMMEDIATELY when service worker starts
 * MUST be called before importing turndown.js to prevent firstChild errors
 */
function ensureDOMPolyfill() {
  if (domPolyfillInstalled || typeof document !== 'undefined') {
    return;
  }
  
  // Create shared createElement function that returns a complete DOM element
  function createDOMElement(tagName, ownerDoc) {
    const element = {
      tagName: tagName.toUpperCase(),
      nodeName: tagName.toUpperCase(),
      nodeType: 1, // ELEMENT_NODE
      _innerHTML: '',
      textContent: '',
      
      // Essential DOM navigation properties that turndown.js needs
      firstChild: null,
      lastChild: null,
      childNodes: [],
      children: [],
      parentNode: null,
      nextSibling: null,
      previousSibling: null,
      
      // Attributes storage
      attributes: {},
      
      setAttribute: function(name, value) {
        this.attributes[name] = value;
        this[name] = value;
      },
      
      getAttribute: function(name) {
        return this.attributes[name] || this[name] || null;
      },
      
      hasAttribute: function(name) {
        return Object.prototype.hasOwnProperty.call(this.attributes, name) || Object.prototype.hasOwnProperty.call(this, name);
      },
      
      appendChild: function(child) {
        if (child) {
          this.childNodes.push(child);
          if (child.nodeType === 1) {
            this.children.push(child);
          }
          
          // Update firstChild and lastChild
          if (!this.firstChild) {
            this.firstChild = child;
          }
          this.lastChild = child;
          
          // Set parent relationship
          child.parentNode = this;
          
          // Update sibling relationships
          if (this.childNodes.length > 1) {
            const prevSibling = this.childNodes[this.childNodes.length - 2];
            if (prevSibling) {
              prevSibling.nextSibling = child;
              child.previousSibling = prevSibling;
            }
          }
        }
        return child;
      },
      
      getElementsByTagName: function(tagName) {
        const results = [];
        const searchTag = tagName.toUpperCase();
        
        function traverse(node) {
          if (node.nodeType === 1 && (searchTag === '*' || node.nodeName === searchTag)) {
            results.push(node);
          }
          if (node.childNodes) {
            node.childNodes.forEach(traverse);
          }
        }
        
        traverse(this);
        return results;
      },
      
      querySelector: function(selector) {
        return null;
      },
      
      querySelectorAll: function(selector) {
        return [];
      },
      
      cloneNode: function(deep) {
        const clone = createDOMElement(this.tagName, ownerDoc);
        clone._innerHTML = this._innerHTML;
        clone.textContent = this.textContent;
        clone.attributes = {...this.attributes};
        
        if (deep) {
          this.childNodes.forEach(child => {
            if (child.cloneNode) {
              clone.appendChild(child.cloneNode(true));
            }
          });
        }
        
        return clone;
      }
    };
    
    // Add innerHTML property with getter/setter
    Object.defineProperty(element, 'innerHTML', {
      get: function() {
        return this._innerHTML;
      },
      set: function(html) {
        if (html !== null && html !== undefined && typeof html !== 'string') {
          html = String(html);
        }
        
        this._innerHTML = html || '';
        this.textContent = html ? html.replace(/<[^>]*>/g, '') : '';
        
        // Clear existing children
        this.childNodes = [];
        this.children = [];
        this.firstChild = null;
        this.lastChild = null;
        
        // Improved HTML parsing for nested tags
        if (html && html.trim()) {
          this._parseHTMLContent(html);
        }
      }
    });
    
    // Add innerText property to align with turndown expectations
    Object.defineProperty(element, 'innerText', {
      get: function() {
        return this.textContent || '';
      },
      set: function(text) {
        const value = (text == null) ? '' : String(text);
        this.textContent = value;
        this._innerHTML = value; // keep simple consistency
      }
    });
    
    // Add HTML parsing method
    element._parseHTMLContent = function(html) {
      // Simple parser for basic HTML structures
      // This handles cases like <p><code>text</code></p> properly
      
      const tagStack = [];
      const tagRegex = /<(\/?)(\w+)([^>]*)>/g;
      let lastIndex = 0;
      let match;
      
      while ((match = tagRegex.exec(html)) !== null) {
        // Add any text content before this tag
        if (match.index > lastIndex) {
          const textContent = html.slice(lastIndex, match.index);
          if (textContent.trim()) {
            const textNode = ownerDoc.createTextNode(textContent);
            if (tagStack.length > 0) {
              tagStack[tagStack.length - 1].appendChild(textNode);
            } else {
              this.appendChild(textNode);
            }
          }
        }
        
        const isClosing = match[1] === '/';
        const tagName = match[2];
        
        if (isClosing) {
          // Closing tag - pop from stack
          if (tagStack.length > 0 && tagStack[tagStack.length - 1].tagName === tagName.toUpperCase()) {
            const completedElement = tagStack.pop();
            if (tagStack.length > 0) {
              tagStack[tagStack.length - 1].appendChild(completedElement);
            } else {
              this.appendChild(completedElement);
            }
          }
        } else {
          // Opening tag - create element and push to stack
          const element = createDOMElement(tagName, ownerDoc);
          // Parse attributes so id/class can be used by getElementById and rules
          const attrsString = match[3] || '';
          if (attrsString && attrsString.trim()) {
            const attrRegex = /([\w:-]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
            let attrMatch;
            while ((attrMatch = attrRegex.exec(attrsString)) !== null) {
              const attrName = attrMatch[1];
              const attrVal = attrMatch[3] != null ? attrMatch[3]
                              : (attrMatch[4] != null ? attrMatch[4]
                              : (attrMatch[5] != null ? attrMatch[5] : ''));
              if (attrName) {
                element.setAttribute(attrName, attrVal);
              }
            }
          }
          tagStack.push(element);
        }
        
        lastIndex = tagRegex.lastIndex;
      }
      
      // Add any remaining text content
      if (lastIndex < html.length) {
        const textContent = html.slice(lastIndex);
        if (textContent.trim()) {
          const textNode = ownerDoc.createTextNode(textContent);
          if (tagStack.length > 0) {
            tagStack[tagStack.length - 1].appendChild(textNode);
          } else {
            this.appendChild(textNode);
          }
        }
      }
      
      // Any unclosed tags get added to the element
      while (tagStack.length > 0) {
        const element = tagStack.pop();
        this.appendChild(element);
      }
    };
    
    // Reference to owning document
    element.ownerDocument = ownerDoc;
    
    return element;
  }
  
  // Create the main document object with createElement at the TOP LEVEL
  globalThis.document = {
    // CRITICAL: createElement must be on globalThis.document directly!
    createElement: function(tagName) {
      return createDOMElement(tagName, this);
    },
    
    createTextNode: function(text) {
      return {
        nodeType: 3, // TEXT_NODE
        nodeName: '#text',
        textContent: text || '',
        data: text || '',
        parentNode: null,
        nextSibling: null,
        previousSibling: null
      };
    },
    
    getElementById: function(id) {
      const root = this.documentElement;
      let found = null;
      function traverse(node) {
        if (!node || found) return;
        const nodeId = node.getAttribute ? node.getAttribute('id') : (node.id || null);
        if (nodeId === id) {
          found = node;
          return;
        }
        if (node.childNodes && node.childNodes.length) {
          for (const child of node.childNodes) traverse(child);
        }
      }
      if (root && root.childNodes) traverse(root);
      return found;
    },
    
    getElementsByTagName: function(tagName) {
      const results = [];
      const root = this.documentElement;
      const searchTag = String(tagName || '*').toUpperCase();
      function traverse(node) {
        if (!node) return;
        if (node.nodeType === 1 && (searchTag === '*' || node.nodeName === searchTag)) {
          results.push(node);
        }
        if (node.childNodes) {
          node.childNodes.forEach(traverse);
        }
      }
      if (root) traverse(root);
      return results;
    },
    
    querySelector: function(selector) {
      return null;
    },
    
    querySelectorAll: function(selector) {
      return [];
    },
    
    createDocumentFragment: function() {
      return this.createElement('FRAGMENT');
    },
    
    // Document structure properties
    documentElement: {
      tagName: 'HTML',
      nodeName: 'HTML',
      nodeType: 1,
      dir: 'ltr',
      lang: 'en'
    },
    
    // Implementation object for compatibility
    implementation: {
      createHTMLDocument: function(title) {
        // Minimal HTMLDocument polyfill compatible with turndown.js parser
        const doc = {
          title: title || '',
          _buffer: '',
          createElement: function(tagName) {
            return createDOMElement(tagName, this);
          },
          createTextNode: function(text) {
            return {
              nodeType: 3,
              nodeName: '#text',
              textContent: text || '',
              data: text || ''
            };
          },
          documentElement: {
            tagName: 'HTML',
            nodeName: 'HTML',
            // Keep a simple child list for appendChild calls
            childNodes: [],
            appendChild: function(child) {
              this.childNodes.push(child);
              return child;
            },
            dir: 'ltr',
            lang: 'en'
          },
          body: null,
          // Basic selectors on the document
          getElementById: function(id) {
            const root = this.documentElement;
            let found = null;
            function traverse(node) {
              if (!node || found) return;
              const nodeId = node.getAttribute ? node.getAttribute('id') : (node.id || null);
              if (nodeId === id) {
                found = node;
                return;
              }
              if (node.childNodes && node.childNodes.length) {
                for (const child of node.childNodes) traverse(child);
              }
            }
            if (root) traverse(root);
            // Fallback: return first <x-turndown> wrapper if specific id not found
            if (!found && id === 'turndown-root') {
              const candidates = this.getElementsByTagName('x-turndown');
              if (candidates && candidates.length) return candidates[0];
            }
            return found;
          },
          getElementsByTagName: function(tagName) {
            const results = [];
            const root = this.documentElement;
            const searchTag = String(tagName || '*').toUpperCase();
            function traverse(node) {
              if (!node) return;
              if (node.nodeType === 1 && (searchTag === '*' || node.nodeName === searchTag)) {
                results.push(node);
              }
              if (node.childNodes) {
                node.childNodes.forEach(traverse);
              }
            }
            if (root) traverse(root);
            return results;
          },
          // Add open/write/close to support libraries that write HTML strings
          open: function() {
            this._buffer = '';
          },
          write: function(html) {
            if (html != null) {
              this._buffer += String(html);
            }
          },
          close: function() {
            try {
              const container = this.createElement('div');
              container.innerHTML = this._buffer || '';
              const body = this.createElement('body');
              body.appendChild(container);
              this.body = body;
              if (this.documentElement && this.documentElement.appendChild) {
                this.documentElement.appendChild(body);
              }
            } catch (e) {
              // As a last resort, ensure body exists
              this.body = this.body || this.createElement('body');
            }
          }
        };
        return doc;
      }
    }
  };
  
  // Add/override DOMParser to ensure text/html works reliably in Service Worker
  (function installDOMParserOverride(){
    const NativeDOMParser = globalThis.DOMParser || null;
    globalThis.DOMParser = function() {
      const native = NativeDOMParser ? new NativeDOMParser() : null;
      return {
        parseFromString: function(htmlString, mimeType) {
          const type = (mimeType || 'text/html').toLowerCase();
          if (type === 'text/html') {
            // Use our HTMLDocument polyfill to build a document
            const doc = globalThis.document.implementation.createHTMLDocument('');
            if (typeof doc.open === 'function') {
              doc.open();
              doc.write(htmlString || '');
              doc.close();
              return doc;
            }
            // Fallback: manual build similar to previous polyfill
            const container = doc.createElement('div');
            container.innerHTML = htmlString || '';
            const body = doc.createElement('body');
            body.appendChild(container);
            if (doc.documentElement && doc.documentElement.appendChild) {
              doc.documentElement.appendChild(body);
            }
            doc.body = body;
            return doc;
          }
          // Delegate non-html types to native if available
          if (native && typeof native.parseFromString === 'function') {
            try {
              return native.parseFromString(htmlString || '', mimeType);
            } catch (e) {}
          }
          // Last fallback
          const doc = globalThis.document.implementation.createHTMLDocument('');
          if (typeof doc.open === 'function') {
            doc.open();
            doc.write(htmlString || '');
            doc.close();
            return doc;
          }
          return doc;
        }
      };
    };
  })();
  
  domPolyfillInstalled = true;
  console.log("✅ Service Worker DOM polyfill installed with top-level createElement");
}

// CRITICAL FIX: Install DOM polyfill BEFORE importing turndown.js
// This prevents firstChild errors in turndown rules that are defined at load time
console.log("🔧 Installing DOM polyfill before loading turndown.js...");
ensureDOMPolyfill();

// CRITICAL: Force DOM polyfill installation by creating a test element
// This ensures all DOM APIs are available when turndown.js module is loaded
try {
  const testElement = document.createElement('div');
  testElement.innerHTML = '<p><code>test code</code></p>';
  const testFirstChild = testElement.firstChild;
  console.log("✅ DOM polyfill firstChild test successful:", testFirstChild ? testFirstChild.nodeName : 'null');
  
  // Test specific DOM operations that turndown.js uses
  if (testFirstChild && testFirstChild.firstChild) {
    console.log("✅ DOM polyfill nested firstChild test successful:", testFirstChild.firstChild.nodeName);
  }
  
  // Test getElementsByTagName that turndown also uses
  const codeElements = testElement.getElementsByTagName('code');
  console.log("✅ DOM polyfill getElementsByTagName test successful:", codeElements.length);
} catch (error) {
  console.error("❌ DOM polyfill test failed:", error);
  // Force re-installation
  domPolyfillInstalled = false;
  ensureDOMPolyfill();
  
  // Retry test after re-installation
  try {
    const retestElement = document.createElement('div');
    retestElement.innerHTML = '<p>retest</p>';
    console.log("✅ DOM polyfill retry successful:", retestElement.firstChild ? 'PASS' : 'FAIL');
  } catch (retryError) {
    console.error("❌ DOM polyfill retry failed:", retryError);
  }
}

// Import required dependencies
// Note: Service worker is in background/ directory, adjust paths accordingly
const requiredScripts = [
  'apache-mime-types.js',
  'moment.min.js', 
  'turndown.js',
  'turndown-plugin-gfm.js',
  'Readability.js',
  '../shared/context-menus.js',
  '../shared/default-options.js'
];

let loadedScripts = 0;
requiredScripts.forEach(script => {
  try {
    importScripts(script);
    console.log(`✅ ${script} loaded`);
    loadedScripts++;
  } catch (error) {
    console.error(`❌ Failed to load ${script}:`, error);
    // Provide more specific error information
    const errorMessage = error.message || 'Unknown error';
    if (errorMessage.includes('NetworkError') || errorMessage.includes('failed to fetch')) {
      console.error(`📁 Script not found at expected path: ${script}`);
      self.serviceWorkerStatus.errors.push(`${script} - File not found at path`);
    } else {
      self.serviceWorkerStatus.errors.push(`${script} failed: ${errorMessage}`);
    }
  }
});

self.serviceWorkerStatus.dependenciesLoaded = (loadedScripts === requiredScripts.length);
console.log(`📊 Loaded ${loadedScripts}/${requiredScripts.length} required scripts`);

// Store default escape function AFTER turndown.js is loaded and DOM polyfill is installed
if (self.serviceWorkerStatus.dependenciesLoaded && typeof TurndownService !== 'undefined') {
  TurndownService.prototype.defaultEscape = TurndownService.prototype.escape;
  console.log("✅ TurndownService default escape function stored");
}

// PERFORMANCE OPTIMIZATION: Content size limits and memory monitoring
const MAX_CONTENT_SIZE = 5 * 1024 * 1024; // 5MB limit
const MEMORY_WARNING_THRESHOLD = 50 * 1024 * 1024; // 50MB warning threshold

/**
 * Check content size and memory usage before processing
 * @param {string} content - Content to check
 * @param {string} operation - Operation name for logging
 * @returns {Object} - {allowed: boolean, reason?: string}
 */
function checkContentLimits(content, operation = 'processing') {
  const contentSize = new TextEncoder().encode(content).length;
  
  if (contentSize > MAX_CONTENT_SIZE) {
    const sizeMB = (contentSize / (1024 * 1024)).toFixed(2);
    console.warn(`⚠️ Content size ${sizeMB}MB exceeds limit of ${MAX_CONTENT_SIZE / (1024 * 1024)}MB for ${operation}`);
    return {
      allowed: false,
      reason: `Content size ${sizeMB}MB exceeds maximum allowed size of ${MAX_CONTENT_SIZE / (1024 * 1024)}MB. Consider selecting a smaller portion of the page.`
    };
  }
  
  // Memory usage warning (best effort)
  try {
    if (performance.memory && performance.memory.usedJSHeapSize > MEMORY_WARNING_THRESHOLD) {
      const memoryMB = (performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(2);
      console.warn(`⚠️ High memory usage detected: ${memoryMB}MB during ${operation}`);
    }
  } catch (e) {
    // performance.memory may not be available in all browsers
  }
  
  return { allowed: true };
}

// Validate browser API availability
if (typeof browser === 'undefined') {
  console.error("❌ Browser API not available - polyfill loading failed");
  self.serviceWorkerStatus.errors.push('Browser API undefined - polyfill loading failed');
  self.serviceWorkerStatus.initialized = false;
} else {
  console.log("✅ Browser API available");
  
  // Log platform and browser information
  try {
    browser.runtime.getPlatformInfo().then(async platformInfo => {
      const browserInfo = browser.runtime.getBrowserInfo ? await browser.runtime.getBrowserInfo() : "Can't get browser info";
      console.info("📱 Platform info:", platformInfo, browserInfo);
    }).catch(error => {
      console.warn("⚠️ Could not get platform info:", error.message);
    });
  } catch (error) {
    console.warn("⚠️ Browser API partially available:", error.message);
  }

  // Note: Message listener will be registered after all dependencies load to avoid conflicts

  // Create context menus on startup
  try {
    if (typeof createMenus === 'function') {
      createMenus();
      console.log("📋 Context menus creation initiated");
    } else {
      console.warn("⚠️ createMenus function not available");
      self.serviceWorkerStatus.errors.push('createMenus function not available');
    }
  } catch (error) {
    console.error("❌ Failed to create context menus:", error);
    self.serviceWorkerStatus.errors.push('Context menus failed: ' + error.message);
  }
}

// Mark service worker as initialized (even if some features failed)
self.serviceWorkerStatus.initialized = true;
console.log("🎯 Service Worker initialization completed");

// Log initialization status
if (self.serviceWorkerStatus.errors.length > 0) {
  console.warn(`📊 Initialization completed with ${self.serviceWorkerStatus.errors.length} errors:`, self.serviceWorkerStatus.errors);
  
  // Check if errors are critical
  const criticalErrors = self.serviceWorkerStatus.errors.filter(error => 
    error.includes('browser-polyfill failed') || 
    error.includes('Browser API undefined')
  );
  
  if (criticalErrors.length > 0) {
    console.error("❌ Critical initialization errors detected. Extension may not function properly.");
    self.serviceWorkerStatus.initialized = false;
  }
} else {
  console.log("✅ Service Worker initialized successfully with no errors");
}

// Provide detailed status report
console.log("📋 Service Worker Status Report:");
console.log(`- Initialized: ${self.serviceWorkerStatus.initialized}`);
console.log(`- Dependencies Loaded: ${self.serviceWorkerStatus.dependenciesLoaded} (${loadedScripts}/${requiredScripts.length})`);
console.log(`- Browser API Available: ${typeof browser !== 'undefined'}`);
console.log(`- Errors: ${self.serviceWorkerStatus.errors.length}`);
if (self.serviceWorkerStatus.errors.length > 0) {
  self.serviceWorkerStatus.errors.forEach((error, index) => {
    console.log(`  ${index + 1}. ${error}`);
  });
}

// Store default escape function - moved after DOM polyfill installation

/**
 * Extract color information from DOM element
 * @param {Element} node - DOM element with color information
 * @param {string} preservationMode - How to preserve color info
 * @returns {string} - Formatted content with color information
 */
function extractColorInfo(node, preservationMode) {
  const content = node.textContent || node.innerText || '';
  let colorValue = null;
  
  // Extract color from inline styles
  const style = node.getAttribute('style');
  if (style) {
    const colorMatch = style.match(/(?:^|;)\s*color:\s*([^;]+)/i);
    const bgColorMatch = style.match(/(?:^|;)\s*background-color:\s*([^;]+)/i);
    
    // Prefer foreground color over background color
    colorValue = colorMatch ? colorMatch[1].trim() : (bgColorMatch ? bgColorMatch[1].trim() : null);
  }
  
  // Extract color from data attributes
  if (!colorValue && node.hasAttribute('data-color')) {
    colorValue = node.getAttribute('data-color');
  }
  
  // Extract color from common class patterns
  if (!colorValue) {
    const className = node.getAttribute('class') || '';
    // 修复：只匹配真正的颜色类名，排除尺寸类名（如 xs, sm, md, lg, xl）
    const colorClasses = className.match(/(?:color-|text-|bg-)(?!(?:xs|sm|md|lg|xl|[0-9])\b)([a-zA-Z]+(?:-[a-zA-Z]+)*)/);
    if (colorClasses) {
      colorValue = colorClasses[1];
    }
  }
  
  if (!colorValue) {
    return content; // No color found, return original content
  }
  
  // Normalize and convert color value
  const normalizedColor = normalizeColorValue(colorValue);
  
  // Format based on preservation mode
  switch (preservationMode) {
    case 'description':
      return `${content}(${normalizedColor})`;
      
    case 'emoji':
      const emoji = colorToEmoji(normalizedColor);
      return emoji || `${content}(${normalizedColor})`;
      
    case 'html-comment':
      return `${content}<!-- ${normalizedColor} -->`;
      
    default:
      return content;
  }
}

/**
 * Normalize color value to a readable name
 * @param {string} colorValue - Raw color value from CSS
 * @returns {string} - Normalized color name
 */
function normalizeColorValue(colorValue) {
  const normalized = colorValue.toLowerCase().trim();
  
  // Handle hex colors
  if (normalized.startsWith('#')) {
    const colorName = hexToColorName(normalized);
    if (colorName) return colorName;
    
    // 如果没有直接匹配，尝试分析RGB值
    let hex = normalized.replace('#', '');
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const intelligentName = rgbToColorName(r, g, b);
      return intelligentName || normalized;
    }
    return normalized;
  }
  
  // Handle rgb/rgba colors
  if (normalized.startsWith('rgb')) {
    const rgbMatch = normalized.match(/rgba?\(([^)]+)\)/);
    if (rgbMatch) {
      const values = rgbMatch[1].split(',').map(v => parseInt(v.trim()));
      return rgbToColorName(values[0], values[1], values[2]) || normalized;
    }
  }
  
  // Handle hsl colors
  if (normalized.startsWith('hsl')) {
    return normalized; // Keep as-is for now
  }
  
  // Handle named colors
  const namedColors = {
    'red': 'red', 'green': 'green', 'blue': 'blue', 'yellow': 'yellow',
    'cyan': 'cyan', 'magenta': 'magenta', 'purple': 'purple', 'orange': 'orange',
    'pink': 'pink', 'brown': 'brown', 'black': 'black', 'white': 'white',
    'gray': 'gray', 'grey': 'gray', 'lime': 'lime', 'navy': 'navy',
    'teal': 'teal', 'olive': 'olive', 'maroon': 'maroon', 'silver': 'silver'
  };
  
  return namedColors[normalized] || normalized;
}

/**
 * Convert hex color to color name
 * @param {string} hex - Hex color value
 * @returns {string|null} - Color name or null
 */
function hexToColorName(hex) {
  const colorMap = {
    '#ff0000': 'red', '#00ff00': 'green', '#0000ff': 'blue',
    '#ffff00': 'yellow', '#ff00ff': 'magenta', '#00ffff': 'cyan',
    '#000000': 'black', '#ffffff': 'white', '#808080': 'gray'
  };
  return colorMap[hex.toLowerCase()] || null;
}

/**
 * Convert RGB values to color name (approximate)
 * @param {number} r - Red value
 * @param {number} g - Green value  
 * @param {number} b - Blue value
 * @returns {string|null} - Color name or null
 */
function rgbToColorName(r, g, b) {
  // 精确匹配优先（用户页面中的特定颜色）
  const exactMatches = {
    '255,107,157': 'pink',     // #ff6b9d
    '78,205,196': 'cyan',      // #4ecdc4  
    '255,140,105': 'orange',   // #ff8c69
    '220,20,60': 'crimson',    // #dc143c
    '168,168,168': 'lightgray', // #a8a8a8
    '184,168,144': 'tan',      // #b8a890
    '135,206,235': 'skyblue',  // #87ceeb
    '100,149,237': 'cornflowerblue', // #6495ed
    '65,105,225': 'royalblue', // #4169e1
    '25,25,112': 'midnightblue' // #191970
  };
  
  const key = `${r},${g},${b}`;
  if (exactMatches[key]) return exactMatches[key];
  
  // Color detection logic
  if (r < 50 && g < 50 && b < 50) return 'black';
  if (r > 200 && g > 200 && b > 200) return 'white';
  
  // Gray detection
  if (Math.abs(r - g) < 30 && Math.abs(g - b) < 30) {
    if (r > 180) return 'lightgray';
    if (r > 100) return 'gray';
    return 'darkgray';
  }
  
  // Color detection based on dominant color and brightness
  const brightness = (r + g + b) / 3;
  
  if (r > g && r > b) {  // Red dominant
    if (brightness > 150) return r > 200 && g > 128 ? 'pink' : 'lightred';
    return g > 50 ? 'orange' : 'red';
  }
  if (g > r && g > b) {  // Green dominant
    if (brightness > 150) return 'lightgreen';
    return b > 50 ? 'cyan' : 'green';
  }
  if (b > r && b > g) {  // Blue dominant
    if (brightness > 150) return r > 50 ? 'lightblue' : 'skyblue';
    return r > 50 ? 'purple' : 'blue';
  }
  
  // Mixed colors
  if (r > 128 && g > 128 && b < 50) return 'yellow';
  if (r > 128 && g < 50 && b > 128) return 'magenta';
  if (r < 50 && g > 128 && b > 128) return 'cyan';
  
  return null;
}

/**
 * Convert color name to emoji
 * @param {string} colorName - Color name
 * @returns {string|null} - Color emoji or null
 */
function colorToEmoji(colorName) {
  const colorEmojis = {
    'red': '🔴', 'green': '🟢', 'blue': '🔵', 'yellow': '🟡',
    'cyan': '🔵', 'magenta': '🟣', 'purple': '🟣', 'orange': '🟠',
    'pink': '🩷', 'brown': '🤎', 'black': '⚫', 'white': '⚪',
    'gray': '⚫', 'lime': '🟢', 'navy': '🔵', 'teal': '🔵',
    'olive': '🫒', 'maroon': '🔴', 'silver': '⚪'
  };
  
  return colorEmojis[colorName.toLowerCase()] || null;
}

/**
 * Convert article content to markdown using Turndown
 * @param {string} content - HTML content to convert
 * @param {Object} options - Conversion options
 * @param {Object} article - Article metadata
 * @returns {Object} - Converted markdown and image list
 */
function turndown(content, options, article) {
  console.log('🔧 turndown called with options:', JSON.stringify(options, null, 2));
  console.log('📊 Input content length:', content?.length || 0);
  console.log('📄 Input content preview:', content?.substring(0, 300) + "...");
  
  // CRITICAL: Validate input content
  if (!content) {
    console.error("❌ turndown: Content is null or undefined");
    throw new Error("Turndown input content is null or undefined");
  }
  
  if (typeof content !== 'string') {
    console.error("❌ turndown: Content is not a string", typeof content);
    throw new Error("Turndown input content must be a string");
  }
  
  if (content.trim().length === 0) {
    console.error("❌ turndown: Content is empty after trim");
    throw new Error("Turndown input content is empty");
  }
  
  // DOM polyfill is now installed at Service Worker startup, no need to call again
  
  // CRITICAL: Perform comprehensive TurndownService health check
  console.log('🔧 turndown: Performing TurndownService health check...');
  const healthCheck = performTurndownHealthCheck();
  
  if (!healthCheck.isHealthy) {
    console.error("❌ CRITICAL: TurndownService health check failed");
    console.log("🏥 Health check results:", JSON.stringify(healthCheck, null, 2));
    
    // Try to provide actionable error information
    const primaryError = healthCheck.errors[0] || 'Unknown health check failure';
    throw new Error(`TurndownService health check failed: ${primaryError}`);
  }
  
  if (healthCheck.warnings.length > 0) {
    console.warn("⚠️ TurndownService health check warnings:", healthCheck.warnings);
  }
  
  console.log('✅ TurndownService health check passed');
  console.log('🏥 Health diagnostics:', healthCheck.diagnostics);

  // NOW it's safe to set escape functions
  if (options.turndownEscape) TurndownService.prototype.escape = TurndownService.prototype.defaultEscape;
  else TurndownService.prototype.escape = s => s;

  // CRITICAL: Validate DOM polyfill is working before TurndownService processes content
  try {
    // Test basic DOM operations that TurndownService will use
    const testDoc = globalThis.document || global.document;
    if (!testDoc || typeof testDoc.createElement !== 'function') {
      throw new Error("DOM polyfill document.createElement not available");
    }
    
    const testElement = testDoc.createElement('div');
    if (!testElement || typeof testElement.appendChild !== 'function') {
      throw new Error("DOM polyfill element creation failed");
    }
    
    console.log("✅ DOM polyfill validation successful for TurndownService");
  } catch (domError) {
    console.error("❌ DOM polyfill validation failed:", domError);
    throw new Error(`DOM polyfill not working properly: ${domError.message}`);
  }

  // CRITICAL: Validate options object before passing to TurndownService
  if (!options || typeof options !== 'object') {
    console.error("❌ turndown: Options is not a valid object:", options);
    throw new Error("TurndownService options must be a valid object");
  }

  var turndownService;
  try {
    turndownService = new TurndownService(options);
    console.log("✅ TurndownService instantiated successfully");
  } catch (instantiationError) {
    console.error("❌ turndown: TurndownService instantiation failed:", instantiationError);
    console.log("📊 Options that caused failure:", JSON.stringify(options, null, 2));
    throw new Error(`TurndownService instantiation failed: ${instantiationError.message}`);
  }
  
  let imageList = {};
  
  // Add color preservation rule FIRST to ensure it has priority
  if (options.colorPreservation && options.colorPreservation !== 'none') {
    console.log('🎨 Adding color preservation rule with mode:', options.colorPreservation);
    turndownService.addRule('coloredElements', {
      filter: function (node) {
        // Check if element has inline color style or color-related classes
        if (node.nodeType === 1) { // Element node
          const style = node.getAttribute('style');
          const className = node.getAttribute('class');
          const tagName = node.tagName;
          
          // Check for inline color styles
          if (style && (style.includes('color:') || style.includes('background-color:'))) {
            console.log('🎨 Found colored element:', tagName, 'with style:', style);
            return true;
          }
          
          // Check for common color-related classes or data attributes
          if (className && (
            className.includes('color-') || 
            className.includes('text-') ||
            className.includes('bg-')
          )) {
            console.log('🎨 Found colored element:', tagName, 'with class:', className);
            return true;
          }
          
          // Check for data-color attributes
          if (node.hasAttribute('data-color')) {
            console.log('🎨 Found colored element:', tagName, 'with data-color:', node.getAttribute('data-color'));
            return true;
          }
        }
        return false;
      },
      replacement: function (content, node) {
        console.log('🎨 Processing colored element, content:', content);
        const colorInfo = extractColorInfo(node, options.colorPreservation);
        console.log('🎨 Color info result:', colorInfo);
        return colorInfo ? colorInfo : content;
      }
    });
  } else {
    console.log('🎨 Color preservation disabled, mode:', options.colorPreservation);
  }
  
  // Add other plugins and rules AFTER color preservation
  turndownService.use(turndownPluginGfm.gfm);
  turndownService.keep(['iframe', 'sub', 'sup', 'u', 'ins', 'del', 'small', 'big']);
  
  // Add image processing rule
  turndownService.addRule('images', {
    filter: function (node, tdopts) {
      if (node.nodeName == 'IMG') {
        let src = node.getAttribute('src');
        
        // Handle missing or empty src attribute
        if (!src || src.trim() === '') {
          // Check for alternative attributes like data-src, data-lazy-src
          src = node.getAttribute('data-src') || 
                node.getAttribute('data-lazy-src') ||
                node.getAttribute('data-original') ||
                node.getAttribute('srcset')?.split(' ')[0];
        }
        
        // If still no src, create a placeholder
        if (!src || src.trim() === '') {
          console.warn('Image found with no src attribute, using alt text or placeholder');
          const alt = node.getAttribute('alt') || 'Image';
          node.setAttribute('src', `placeholder:${alt}`);
          src = `placeholder:${alt}`;
        } else {
          // Validate and fix the URI
          try {
            src = validateUri(src, article.baseURI);
            node.setAttribute('src', src);
          } catch (error) {
            console.warn('Invalid image URI, using placeholder:', src);
            const alt = node.getAttribute('alt') || 'Image';
            src = `placeholder:${alt}`;
            node.setAttribute('src', src);
          }
        }
        
        if (options.downloadImages && !src.startsWith('placeholder:')) {
          let imageFilename = getImageFilename(src, options, false);
          if (!imageList[src] || imageList[src] != imageFilename) {
            let i = 1;
            while (Object.values(imageList).includes(imageFilename)) {
              const parts = imageFilename.split('.');
              if (i == 1) parts.splice(parts.length - 1, 0, i++);
              else parts.splice(parts.length - 2, 1, i++);
              imageFilename = parts.join('.');
            }
            imageList[src] = imageFilename;
          }
          
          const obsidianLink = options.imageStyle.startsWith("obsidian");
          const localSrc = options.imageStyle === 'obsidian-nofolder'
            ? imageFilename.substring(imageFilename.lastIndexOf('/') + 1)
            : imageFilename.split('/').map(s => obsidianLink ? s : encodeURI(s)).join('/');
          
          if(options.imageStyle != 'originalSource' && options.imageStyle != 'base64') {
            node.setAttribute('src', localSrc);
          }
        }
        return true;
      }
      return false;
    },
    replacement: function (content, node, tdopts) {
      if (options.imageStyle == 'noImage') return '';
      else if (options.imageStyle.startsWith('obsidian')) return `![[${node.getAttribute('src')}]]`;
      else {
        var alt = cleanAttribute(node.getAttribute('alt'));
        var src = node.getAttribute('src') || '';
        var title = cleanAttribute(node.getAttribute('title'));
        var titlePart = title ? ' "' + title + '"' : '';
        
        // Handle placeholder images
        if (src.startsWith('placeholder:')) {
          const placeholderText = src.replace('placeholder:', '');
          return `![${alt || placeholderText}](# "Image not available: ${placeholderText}")`;
        }
        
        if (options.imageRefStyle == 'referenced') {
          var id = this.references.length + 1;
          this.references.push('[fig' + id + ']: ' + src + titlePart);
          return '![' + alt + '][fig' + id + ']';
        }
        else return src ? '![' + alt + ']' + '(' + src + titlePart + ')' : '';
      }
    },
    references: [],
    append: function (options) {
      var references = '';
      if (this.references.length) {
        references = '\n\n' + this.references.join('\n') + '\n\n';
        this.references = [];
      }
      return references;
    }
  });

  // Add link processing rule
  turndownService.addRule('links', {
    filter: (node, tdopts) => {
      if (node.nodeName == 'A' && node.getAttribute('href')) {
        const href = node.getAttribute('href');
        node.setAttribute('href', validateUri(href, article.baseURI));
        return options.linkStyle == 'stripLinks';
      }
      return false;
    },
    replacement: (content, node, tdopts) => content
  });

  // Add math processing rule
  turndownService.addRule('mathjax', {
    filter(node, options) {
      return article.math.hasOwnProperty(node.id);
    },
    replacement(content, node, options) {
      const math = article.math[node.id];
      let tex = math.tex.trim().replaceAll('\xa0', '');

      if (math.inline) {
        tex = tex.replaceAll('\n', ' ');
        return `$${tex}$`;
      }
      else return `$$\n${tex}\n$$`;
    }
  });

  function repeat(character, count) {
    return Array(count + 1).join(character);
  }

  function convertToFencedCodeBlock(node, options) {
    node.innerHTML = node.innerHTML.replaceAll('<br-keep></br-keep>', '<br>');
    const langMatch = node.id?.match(/code-lang-(.+)/);
    const language = langMatch?.length > 0 ? langMatch[1] : '';

    const code = node.innerText;
    const fenceChar = options.fence.charAt(0);
    let fenceSize = 3;
    const fenceInCodeRegex = new RegExp('^' + fenceChar + '{3,}', 'gm');

    let match;
    while ((match = fenceInCodeRegex.exec(code))) {
      if (match[0].length >= fenceSize) {
        fenceSize = match[0].length + 1;
      }
    }

    const fence = repeat(fenceChar, fenceSize);
    return '\n\n' + fence + language + '\n' + code.replace(/\n$/, '') + '\n' + fence + '\n\n';
  }

  // Add fenced code block rule
  turndownService.addRule('fencedCodeBlock', {
    filter: function (node, options) {
      return (
        options.codeBlockStyle === 'fenced' &&
        node.nodeName === 'PRE' &&
        node.firstChild &&
        node.firstChild.nodeName === 'CODE'
      );
    },
    replacement: function (content, node, options) {
      return convertToFencedCodeBlock(node.firstChild, options);
    }
  });

  // Add pre tag rule
  turndownService.addRule('pre', {
    filter: (node, tdopts) => {
      return node.nodeName == 'PRE'
             && (!node.firstChild || node.firstChild.nodeName != 'CODE')
             && !node.querySelector('img');
    },
    replacement: (content, node, tdopts) => {
      return convertToFencedCodeBlock(node, tdopts);
    }
  });

  console.log('🔧 turndown: Calling turndownService.turndown...');
  console.log('🔍 DEEP DEBUG: Detailed pre-conversion analysis');
  console.log('📊 Content length:', content?.length || 0);
  console.log('📊 Content type:', typeof content);
  console.log('📊 Content is null/undefined:', content == null);
  console.log('📊 Content is empty string:', content === '');
  console.log('📊 Content trim length:', content?.trim()?.length || 0);
  
  // Sample content for debugging
  const contentSample = content.substring(0, 500);
  console.log('📄 Content sample:', contentSample);
  
  // Test DOM parsing capability before calling turndown
  try {
    const testDoc = globalThis.document || global.document;
    const testWrapper = '<x-turndown-test id="test-root"><p>Test content</p></x-turndown-test>';
    const parsedTestDoc = new globalThis.DOMParser().parseFromString(testWrapper, 'text/html');
    const testRoot = parsedTestDoc.getElementById('test-root');
    console.log('🧪 DOM parsing test result:', {
      parsedDoc: !!parsedTestDoc,
      rootFound: !!testRoot,
      hasChildNodes: testRoot?.childNodes?.length > 0
    });
    
    if (!testRoot) {
      console.error('❌ DOM parsing test failed - getElementById returned null');
      throw new Error('DOM parsing is not working properly in service worker');
    }
  } catch (domTestError) {
    console.error('❌ DOM parsing test failed with error:', domTestError);
    throw new Error(`DOM parsing test failed: ${domTestError.message}`);
  }
  
  let convertedMarkdown;
  try {
    // CRITICAL: Validate that turndownService has the turndown method
    if (!turndownService || typeof turndownService.turndown !== 'function') {
      throw new Error("TurndownService instance does not have a valid turndown method");
    }
    
    console.log('🔧 About to call turndownService.turndown() with validated content');
    
    // Wrap the actual conversion call with extensive error handling
    try {
      convertedMarkdown = turndownService.turndown(content);
      console.log('✅ turndownService.turndown() completed without throwing');
    } catch (conversionError) {
      console.error('❌ turndownService.turndown() threw an error:', conversionError);
      console.log('🔍 Error details:', {
        name: conversionError.name,
        message: conversionError.message,
        stack: conversionError.stack?.substring(0, 1000)
      });
      throw new Error(`Turndown conversion threw error: ${conversionError.message}`);
    }
    console.log('✅ turndown: Conversion completed');
    console.log('🔍 DEEP DEBUG: Detailed post-conversion analysis');
    console.log('📊 Converted markdown type:', typeof convertedMarkdown);
    console.log('📊 Converted markdown === null:', convertedMarkdown === null);
    console.log('📊 Converted markdown === undefined:', convertedMarkdown === undefined);
    console.log('📊 Converted markdown == null:', convertedMarkdown == null);
    console.log('📊 Converted markdown falsy check:', !convertedMarkdown);
    console.log('📊 Converted markdown length:', convertedMarkdown?.length || 'N/A');
    
    if (convertedMarkdown !== null && convertedMarkdown !== undefined) {
      console.log('📄 Converted markdown preview:', convertedMarkdown.substring(0, 300) + "...");
    } else {
      console.log('📄 Converted markdown is null/undefined - no preview available');
    }
    
    // CRITICAL: Additional validation of conversion result with detailed logging
    if (convertedMarkdown === null) {
      console.error('❌ CRITICAL: Conversion returned explicit null');
      console.log('🔍 Investigating null result...');
      
      // Try to understand why null was returned
      try {
        // Test with minimal content
        const minimalTest = turndownService.turndown('<p>test</p>');
        console.log('🧪 Minimal test result:', minimalTest);
        
        if (minimalTest === null) {
          console.error('❌ Even minimal content returns null - TurndownService is broken');
        } else {
          console.log('🔍 Minimal content works, issue is with input content');
          console.log('📄 Problematic content sample:', content.substring(0, 1000));
        }
      } catch (minimalTestError) {
        console.error('❌ Minimal test also failed:', minimalTestError);
      }
      
      throw new Error("TurndownService conversion returned null - DOM parsing or content processing failure");
    }
    
    if (convertedMarkdown === undefined) {
      console.error('❌ CRITICAL: Conversion returned undefined');
      console.log('🔍 This suggests the turndown method completed but returned undefined');
      console.log('🔍 Possible causes: processing function returned undefined, or postProcess issue');
      throw new Error("TurndownService conversion returned undefined - internal method failure");
    }
    
    // Additional type validation
    if (typeof convertedMarkdown !== 'string') {
      console.error('❌ CRITICAL: Conversion returned non-string type:', typeof convertedMarkdown);
      console.log('🔍 Actual value:', convertedMarkdown);
      throw new Error(`TurndownService conversion returned ${typeof convertedMarkdown} instead of string`);
    }
    
    // Check for empty string result
    if (convertedMarkdown.trim() === '') {
      console.warn('⚠️ WARNING: Conversion returned empty string');
      console.log('🔍 Original content length:', content?.length);
      console.log('🔍 Original content sample:', content?.substring(0, 500));
      // Don't throw error for empty string, as it might be legitimate
    }
    
  } catch (error) {
    console.error('❌ turndown: Conversion failed:', error);
    console.log('📊 Input content that failed:', content.substring(0, 500));
    console.log('📊 TurndownService state:', {
      defined: typeof TurndownService !== 'undefined',
      instance: !!turndownService,
      hasMethod: turndownService && typeof turndownService.turndown === 'function'
    });
    throw new Error(`Turndown conversion failed: ${error.message}`);
  }
  
  // CRITICAL: Validate conversion result
  if (!convertedMarkdown) {
    console.error("❌ turndown: Conversion returned null/undefined");
    throw new Error("Turndown conversion returned null or undefined");
  }
  
  if (typeof convertedMarkdown !== 'string') {
    console.error("❌ turndown: Conversion returned non-string:", typeof convertedMarkdown);
    throw new Error("Turndown conversion returned non-string result");
  }
  
  let markdown = options.frontmatter + convertedMarkdown + options.backmatter;
  
  // Strip out non-printing special characters
  markdown = markdown.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u00ad\u061c\u200b-\u200f\u2028\u2029\ufeff\ufff9-\ufffc]/g, '');
  
  // SPECIAL: Process image placeholders like [Image #1], [Image #2], etc.
  console.log('🖼️ Processing image placeholders...');
  let placeholderCount = 0;
  markdown = markdown.replace(/\[Image\s*#?(\d*)\]/gi, (match, imageNum) => {
    console.log(`🖼️ Found image placeholder: ${match}`);
    placeholderCount++;
    
    // Try to find corresponding image in imageList or create a meaningful placeholder
    const imageIndex = imageNum ? parseInt(imageNum) : placeholderCount;
    const altText = `Image ${imageIndex}`;
    
    // If we have images in the imageList, try to use them
    const imageKeys = Object.keys(imageList);
    if (imageKeys.length > 0 && imageKeys[imageIndex - 1]) {
      const imageUrl = imageKeys[imageIndex - 1];
      console.log(`🖼️ Using actual image URL: ${imageUrl}`);
      return `![${altText}](${imageUrl})`;
    }
    
    // Otherwise, create a descriptive placeholder
    return `![${altText}](# "Image placeholder - original image may not be available")`;
  });
  
  // Also handle generic [Image] placeholders without numbers
  markdown = markdown.replace(/\[Image\]/gi, (match) => {
    console.log(`🖼️ Found generic image placeholder: ${match}`);
    return `![Image](# "Image placeholder - original image may not be available")`;
  });
  
  if (placeholderCount > 0) {
    console.log(`🖼️ Processed ${placeholderCount} image placeholder(s)`);
  }
  
  console.log('📊 Final markdown length after cleanup:', markdown.length);
  console.log('📄 Final markdown preview:', markdown.substring(0, 300) + "...");
  
  // FINAL VALIDATION: Ensure we're not returning empty markdown
  if (markdown.trim().length === 0) {
    console.error("❌ turndown: Final markdown is empty");
    console.log('📊 Original content length:', content.length);
    console.log('📊 Converted markdown length:', convertedMarkdown.length);
    console.log('📊 Frontmatter length:', options.frontmatter?.length || 0);
    console.log('📊 Backmatter length:', options.backmatter?.length || 0);
    throw new Error("Final markdown output is empty");
  }
  
  const result = { markdown: markdown, imageList: imageList };
  console.log('🏁 Returning turndown result:', {
    markdownLength: result.markdown?.length || 0,
    imageListSize: Object.keys(result.imageList || {}).length,
    markdownType: typeof result.markdown
  });
  
  return result;
}

/**
 * Comprehensive TurndownService health check and diagnostics
 * @returns {Object} Health check results with detailed diagnostics
 */
function performTurndownHealthCheck() {
  console.log('🏥 Performing comprehensive TurndownService health check...');
  
  const healthCheck = {
    isHealthy: true,
    errors: [],
    warnings: [],
    diagnostics: {}
  };
  
  try {
    // Check 1: Global TurndownService availability
    healthCheck.diagnostics.turndownServiceExists = typeof TurndownService !== 'undefined';
    if (!healthCheck.diagnostics.turndownServiceExists) {
      healthCheck.isHealthy = false;
      healthCheck.errors.push('TurndownService global not defined');
      return healthCheck;
    }
    
    // Check 2: TurndownService constructor type
    healthCheck.diagnostics.isConstructor = typeof TurndownService === 'function';
    if (!healthCheck.diagnostics.isConstructor) {
      healthCheck.isHealthy = false;
      healthCheck.errors.push('TurndownService is not a constructor function');
      return healthCheck;
    }
    
    // Check 3: Basic instantiation
    let testInstance;
    try {
      testInstance = new TurndownService();
      healthCheck.diagnostics.canInstantiate = true;
    } catch (instantiationError) {
      healthCheck.isHealthy = false;
      healthCheck.errors.push(`Cannot instantiate TurndownService: ${instantiationError.message}`);
      healthCheck.diagnostics.canInstantiate = false;
      return healthCheck;
    }
    
    // Check 4: Method availability
    healthCheck.diagnostics.hasTurndownMethod = typeof testInstance.turndown === 'function';
    if (!healthCheck.diagnostics.hasTurndownMethod) {
      healthCheck.isHealthy = false;
      healthCheck.errors.push('TurndownService instance lacks turndown method');
      return healthCheck;
    }
    
    // Check 5: DOM polyfill functionality
    try {
      const testDoc = globalThis.document || global.document;
      const parser = new globalThis.DOMParser();
      const testHtml = '<div><p>Test content</p></div>';
      const parsedDoc = parser.parseFromString(testHtml, 'text/html');
      
      healthCheck.diagnostics.domPolyfillWorks = !!parsedDoc && typeof parsedDoc.querySelector === 'function';
      
      if (!healthCheck.diagnostics.domPolyfillWorks) {
        healthCheck.isHealthy = false;
        healthCheck.errors.push('DOM polyfill not functioning properly');
      }
    } catch (domError) {
      healthCheck.isHealthy = false;
      healthCheck.errors.push(`DOM polyfill error: ${domError.message}`);
      healthCheck.diagnostics.domPolyfillWorks = false;
    }
    
    // Check 6: Basic conversion test
    try {
      const testResult = testInstance.turndown('<p>Health check test</p>');
      healthCheck.diagnostics.basicConversionWorks = testResult === 'Health check test';
      healthCheck.diagnostics.basicConversionResult = testResult;
      
      if (!healthCheck.diagnostics.basicConversionWorks) {
        healthCheck.warnings.push(`Basic conversion returned unexpected result: "${testResult}"`);
      }
    } catch (conversionError) {
      healthCheck.isHealthy = false;
      healthCheck.errors.push(`Basic conversion failed: ${conversionError.message}`);
      healthCheck.diagnostics.basicConversionWorks = false;
    }
    
    // Check 7: Complex content test
    try {
      const complexHtml = '<div><h1>Test Header</h1><p>Paragraph with <strong>bold</strong> text</p><ul><li>List item</li></ul></div>';
      const complexResult = testInstance.turndown(complexHtml);
      healthCheck.diagnostics.complexConversionWorks = complexResult && complexResult.length > 0;
      healthCheck.diagnostics.complexConversionLength = complexResult?.length || 0;
      
      if (!healthCheck.diagnostics.complexConversionWorks) {
        healthCheck.warnings.push('Complex content conversion failed or returned empty result');
      }
    } catch (complexError) {
      healthCheck.warnings.push(`Complex conversion test failed: ${complexError.message}`);
      healthCheck.diagnostics.complexConversionWorks = false;
    }
    
    // Check 8: Memory and performance indicators
    healthCheck.diagnostics.serviceWorkerStatus = self.serviceWorkerStatus || {};
    healthCheck.diagnostics.dependenciesLoaded = self.serviceWorkerStatus?.dependenciesLoaded || false;
    
    console.log('🏥 Health check completed:', healthCheck);
    return healthCheck;
    
  } catch (unexpectedError) {
    healthCheck.isHealthy = false;
    healthCheck.errors.push(`Unexpected error during health check: ${unexpectedError.message}`);
    console.error('🏥 Health check failed with unexpected error:', unexpectedError);
    return healthCheck;
  }
}

/**
 * Test function to validate TurndownService fixes
 * @returns {Object} Test results
 */
function testTurndownServiceFixes() {
  console.log('🧪 Running TurndownService fix validation tests...');
  
  const testResults = {
    passed: 0,
    failed: 0,
    tests: []
  };
  
  // Test 1: Health Check
  try {
    const healthCheck = performTurndownHealthCheck();
    if (healthCheck.isHealthy) {
      testResults.passed++;
      testResults.tests.push({ name: 'Health Check', status: 'PASS', details: 'TurndownService is healthy' });
    } else {
      testResults.failed++;
      testResults.tests.push({ name: 'Health Check', status: 'FAIL', details: healthCheck.errors.join(', ') });
    }
  } catch (healthError) {
    testResults.failed++;
    testResults.tests.push({ name: 'Health Check', status: 'ERROR', details: healthError.message });
  }
  
  // Test 2: Basic Conversion
  try {
    const basicOptions = {
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      frontmatter: '',
      backmatter: '',
      turndownEscape: false
    };
    
    const basicResult = turndown('<p>Test paragraph</p>', basicOptions, { title: 'Test' });
    
    if (basicResult && typeof basicResult.markdown === 'string' && basicResult.markdown.trim().length > 0) {
      testResults.passed++;
      testResults.tests.push({ name: 'Basic Conversion', status: 'PASS', details: `Generated: "${basicResult.markdown.trim()}"` });
    } else {
      testResults.failed++;
      testResults.tests.push({ name: 'Basic Conversion', status: 'FAIL', details: 'Invalid result structure or empty markdown' });
    }
  } catch (basicError) {
    testResults.failed++;
    testResults.tests.push({ name: 'Basic Conversion', status: 'ERROR', details: basicError.message });
  }
  
  // Test 3: Complex Content
  try {
    const complexOptions = {
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      frontmatter: '',
      backmatter: '',
      turndownEscape: false
    };
    
    const complexHtml = '<div><h1>Header</h1><p>Text with <strong>bold</strong> and <em>italic</em></p><ul><li>Item 1</li><li>Item 2</li></ul></div>';
    const complexResult = turndown(complexHtml, complexOptions, { title: 'Complex Test' });
    
    if (complexResult && typeof complexResult.markdown === 'string' && 
        complexResult.markdown.includes('Header') && 
        complexResult.markdown.includes('**bold**') && 
        complexResult.markdown.includes('_italic_')) {
      testResults.passed++;
      testResults.tests.push({ name: 'Complex Conversion', status: 'PASS', details: 'All formatting preserved' });
    } else {
      testResults.failed++;
      testResults.tests.push({ name: 'Complex Conversion', status: 'FAIL', details: 'Formatting not properly converted' });
    }
  } catch (complexError) {
    testResults.failed++;
    testResults.tests.push({ name: 'Complex Conversion', status: 'ERROR', details: complexError.message });
  }
  
  // Test 4: Edge Cases
  try {
    const edgeOptions = {
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      frontmatter: '',
      backmatter: '',
      turndownEscape: false
    };
    
    // Test empty content handling
    const emptyResult = turndown('<div></div>', edgeOptions, { title: 'Empty Test' });
    
    if (emptyResult && typeof emptyResult.markdown === 'string') {
      testResults.passed++;
      testResults.tests.push({ name: 'Edge Cases', status: 'PASS', details: 'Handles empty content properly' });
    } else {
      testResults.failed++;
      testResults.tests.push({ name: 'Edge Cases', status: 'FAIL', details: 'Failed to handle empty content' });
    }
  } catch (edgeError) {
    testResults.failed++;
    testResults.tests.push({ name: 'Edge Cases', status: 'ERROR', details: edgeError.message });
  }
  
  console.log('🧪 Test Results:', testResults);
  return testResults;
}

/**
 * Fallback HTML to Markdown conversion when TurndownService fails
 * @param {string} htmlContent - HTML content to convert
 * @param {Object} article - Article metadata
 * @returns {Object} - Markdown and empty image list
 */
async function fallbackHtmlToMarkdown(htmlContent, article) {
  console.log("🔄 fallbackHtmlToMarkdown: Starting fallback conversion");
  
  if (!htmlContent || typeof htmlContent !== 'string') {
    throw new Error("Invalid HTML content for fallback conversion");
  }
  
  try {
    // Simple HTML tag removal and basic formatting
    let markdown = htmlContent
      // Remove script and style tags completely
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      // Convert headers
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
      .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
      .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
      .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')
      // Convert paragraphs
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      // Convert line breaks
      .replace(/<br\s*\/?>/gi, '\n')
      // Convert bold and italic
      .replace(/<(strong|b)[^>]*>(.*?)<\/(strong|b)>/gi, '**$2**')
      .replace(/<(em|i)[^>]*>(.*?)<\/(em|i)>/gi, '*$2*')
      // Convert links
      .replace(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)')
      // Convert images
      .replace(/<img[^>]*src=["']([^"']*)["'][^>]*alt=["']([^"']*)["'][^>]*>/gi, '![$2]($1)')
      .replace(/<img[^>]*alt=["']([^"']*)["'][^>]*src=["']([^"']*)["'][^>]*>/gi, '![$1]($2)')
      .replace(/<img[^>]*src=["']([^"']*)["'][^>]*>/gi, '![]($1)')
      // Convert lists
      .replace(/<ul[^>]*>/gi, '')
      .replace(/<\/ul>/gi, '\n')
      .replace(/<ol[^>]*>/gi, '')
      .replace(/<\/ol>/gi, '\n')
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
      // Convert code blocks
      .replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis, '```\n$1\n```\n')
      .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
      // Remove remaining HTML tags
      .replace(/<[^>]*>/g, '')
      // Decode HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Clean up whitespace
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .replace(/^\s+|\s+$/g, '')
      .trim();
    
    if (markdown.length === 0) {
      // If all conversion failed, provide a basic text representation
      const textContent = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      if (textContent.length > 0) {
        markdown = `# ${article.title || 'Extracted Content'}\n\n${textContent}`;
      } else {
        throw new Error("No content could be extracted using fallback method");
      }
    }
    
    // Add a note about fallback conversion
    const fallbackNote = "\n\n---\n*Note: This content was converted using a fallback method due to conversion issues. Formatting may be simplified.*";
    markdown += fallbackNote;
    
    console.log("✅ Fallback conversion completed");
    console.log("📊 Fallback markdown length:", markdown.length);
    
    return {
      markdown: markdown,
      imageList: {} // No image processing in fallback
    };
    
  } catch (error) {
    console.error("❌ Fallback conversion failed:", error);
    throw new Error(`Fallback HTML to markdown conversion failed: ${error.message}`);
  }
}

/**
 * Clean HTML attributes
 * @param {string} attribute - Attribute to clean
 * @returns {string} - Cleaned attribute
 */
function cleanAttribute(attribute) {
  return attribute ? attribute.replace(/(\n+\s*)+/g, '\n') : '';
}

/**
 * Validate and fix URI
 * @param {string} href - URI to validate
 * @param {string} baseURI - Base URI for relative links
 * @returns {string} - Valid URI
 */
function validateUri(href, baseURI) {
  try {
    // Early validation - reject obviously invalid URLs
    if (!href || typeof href !== 'string' || href.trim() === '') {
      throw new Error('Empty or invalid href');
    }
    
    // Handle data URLs (base64 images, etc.)
    if (href.startsWith('data:')) {
      return href; // Data URLs are valid as-is
    }
    
    // Handle blob URLs
    if (href.startsWith('blob:')) {
      return href; // Blob URLs are valid as-is
    }
    
    // Handle protocol-relative URLs
    if (href.startsWith('//')) {
      const baseUri = new URL(baseURI);
      href = baseUri.protocol + href;
    }
    
    // Try to create URL - will throw if invalid
    const url = new URL(href);
    
    // Additional validation for suspicious URLs
    if (url.protocol !== 'http:' && url.protocol !== 'https:' && 
        url.protocol !== 'data:' && url.protocol !== 'blob:') {
      console.warn('Suspicious URL protocol:', url.protocol);
    }
    
    return url.href;
  }
  catch (error) {
    console.log(`Attempting to resolve relative URL: ${href}`);
    
    try {
      const baseUri = new URL(baseURI);
      
      if (href.startsWith('/')) {
        // Absolute path
        href = baseUri.origin + href;
      } else {
        // Relative path - use URL constructor for proper resolution
        href = new URL(href, baseUri.href).href;
      }
      
      // Validate the resolved URL
      const resolvedUrl = new URL(href);
      console.log(`✅ Successfully resolved URL: ${resolvedUrl.href}`);
      return resolvedUrl.href;
    } catch (resolveError) {
      console.error('Failed to resolve URL:', resolveError);
      throw new Error(`Invalid URL: ${href} (base: ${baseURI})`);
    }
  }
}

/**
 * Generate image filename
 * @param {string} src - Image source URL
 * @param {Object} options - Extension options
 * @param {boolean} prependFilePath - Whether to prepend file path
 * @returns {string} - Generated filename
 */
function getImageFilename(src, options, prependFilePath = true) {
  const slashPos = src.lastIndexOf('/');
  const queryPos = src.indexOf('?');
  let filename = src.substring(slashPos + 1, queryPos > 0 ? queryPos : src.length);

  let imagePrefix = (options.imagePrefix || '');

  if (prependFilePath && options.title.includes('/')) {
    imagePrefix = options.title.substring(0, options.title.lastIndexOf('/') + 1) + imagePrefix;
  }
  else if (prependFilePath) {
    imagePrefix = options.title + (imagePrefix.startsWith('/') ? '' : '/') + imagePrefix;
  }
  
  if (filename.includes(';base64,')) {
    filename = 'image.' + filename.substring(0, filename.indexOf(';'));
  }
  
  let extension = filename.substring(filename.lastIndexOf('.'));
  if (extension == filename) {
    filename = filename + '.idunno';
  }

  filename = generateValidFileName(filename, options.disallowedChars);
  return imagePrefix + filename;
}

/**
 * Replace placeholder strings with article info
 * @param {string} string - String with placeholders
 * @param {Object} article - Article data
 * @param {string} disallowedChars - Characters to remove
 * @returns {string} - String with replacements
 */
function textReplace(string, article, disallowedChars = null) {
  for (const key in article) {
    if (article.hasOwnProperty(key) && key != "content") {
      let s = (article[key] || '') + '';
      if (s && disallowedChars) s = generateValidFileName(s, disallowedChars);

      string = string.replace(new RegExp('{' + key + '}', 'g'), s)
        .replace(new RegExp('{' + key + ':lower}', 'g'), s.toLowerCase())
        .replace(new RegExp('{' + key + ':upper}', 'g'), s.toUpperCase())
        .replace(new RegExp('{' + key + ':kebab}', 'g'), s.replace(/ /g, '-').toLowerCase())
        .replace(new RegExp('{' + key + ':mixed-kebab}', 'g'), s.replace(/ /g, '-'))
        .replace(new RegExp('{' + key + ':snake}', 'g'), s.replace(/ /g, '_').toLowerCase())
        .replace(new RegExp('{' + key + ':mixed_snake}', 'g'), s.replace(/ /g, '_'))
        .replace(new RegExp('{' + key + ':obsidian-cal}', 'g'), s.replace(/ /g, '-').replace(/-{2,}/g, "-"))
        .replace(new RegExp('{' + key + ':camel}', 'g'), s.replace(/ ./g, (str) => str.trim().toUpperCase()).replace(/^./, (str) => str.toLowerCase()))
        .replace(new RegExp('{' + key + ':pascal}', 'g'), s.replace(/ ./g, (str) => str.trim().toUpperCase()).replace(/^./, (str) => str.toUpperCase()));
    }
  }

  // Replace date formats
  const now = new Date();
  const dateRegex = /{date:(.+?)}/g;
  const matches = string.match(dateRegex);
  if (matches && matches.forEach) {
    matches.forEach(match => {
      const format = match.substring(6, match.length - 1);
      const dateString = moment(now).format(format);
      string = string.replaceAll(match, dateString);
    });
  }

  // Replace keywords
  const keywordRegex = /{keywords:?(.*)?}/g;
  const keywordMatches = string.match(keywordRegex);
  if (keywordMatches && keywordMatches.forEach) {
    keywordMatches.forEach(match => {
      let seperator = match.substring(10, match.length - 1);
      try {
        seperator = JSON.parse(JSON.stringify(seperator).replace(/\\\\/g, '\\'));
      }
      catch { }
      const keywordsString = (article.keywords || []).join(seperator);
      string = string.replace(new RegExp(match.replace(/\\/g, '\\\\'), 'g'), keywordsString);
    });
  }

  // Replace anything left in curly braces
  const defaultRegex = /{(.*?)}/g;
  string = string.replace(defaultRegex, '');
  return string;
}

/**
 * Convert article to markdown
 * @param {Object} article - Article data
 * @param {boolean} downloadImages - Whether to download images
 * @returns {Object} - Markdown and image list
 */
async function convertArticleToMarkdown(article, downloadImages = null) {
  console.log("🔧 convertArticleToMarkdown: Starting conversion");
  console.log("📊 Article content length:", article?.content?.length || 0);
  console.log("📄 Article content preview:", article?.content?.substring(0, 300) + "...");
  
  // CRITICAL: Validate article content before processing
  if (!article || !article.content) {
    console.error("❌ convertArticleToMarkdown: Article or content is missing");
    console.log("📊 Article object:", JSON.stringify(article, null, 2));
    throw new Error("Article content is missing or empty");
  }
  
  if (typeof article.content !== 'string') {
    console.error("❌ convertArticleToMarkdown: Article content is not a string");
    console.log("📊 Article content type:", typeof article.content);
    throw new Error("Article content must be a string");
  }
  
  if (article.content.trim().length === 0) {
    console.error("❌ convertArticleToMarkdown: Article content is empty after trim");
    throw new Error("Article content is empty");
  }

  const options = await getOptions();
  if (downloadImages != null) {
    options.downloadImages = downloadImages;
  }

  if (options.includeTemplate) {
    options.frontmatter = textReplace(options.frontmatter, article) + '\n';
    options.backmatter = '\n' + textReplace(options.backmatter, article);
  }
  else {
    options.frontmatter = options.backmatter = '';
  }

  options.imagePrefix = textReplace(options.imagePrefix, article, options.disallowedChars)
    .split('/').map(s=>generateValidFileName(s, options.disallowedChars)).join('/');

  console.log("🔧 convertArticleToMarkdown: Calling turndown with validated content");
  
  console.log('🔄 convertArticleToMarkdown: Starting turndown conversion...');
  console.log('📊 Article content validation:', {
    contentExists: !!article.content,
    contentType: typeof article.content,
    contentLength: article.content?.length || 0,
    isString: typeof article.content === 'string',
    isEmpty: !article.content || article.content.trim() === ''
  });

  let result;
  try {
    console.log('📞 Calling turndown() function...');
    result = turndown(article.content, options, article);
    console.log('✅ turndown() completed, validating result...');
    
    // CRITICAL: Comprehensive result validation
    console.log('🔍 Detailed result validation:', {
      resultExists: !!result,
      resultType: typeof result,
      hasMarkdownProperty: result && 'markdown' in result,
      markdownType: typeof result?.markdown,
      markdownLength: result?.markdown?.length || 0,
      hasImageListProperty: result && 'imageList' in result,
      imageListType: typeof result?.imageList,
      imageListSize: result?.imageList ? Object.keys(result.imageList).length : 0
    });
    
    if (!result) {
      console.error("❌ convertArticleToMarkdown: turndown returned null/undefined");
      throw new Error("Turndown conversion failed - null/undefined result");
    }
    
    if (typeof result !== 'object') {
      console.error("❌ convertArticleToMarkdown: turndown returned non-object:", typeof result);
      throw new Error("Turndown conversion failed - result is not an object");
    }
    
    if (!result.hasOwnProperty('markdown')) {
      console.error("❌ convertArticleToMarkdown: turndown result lacks markdown property");
      console.log("📊 turndown result properties:", Object.keys(result));
      throw new Error("Turndown conversion failed - missing markdown property");
    }
    
    if (typeof result.markdown !== 'string') {
      console.error("❌ convertArticleToMarkdown: turndown returned non-string markdown");
      console.log("📊 markdown property type:", typeof result.markdown);
      console.log("📊 markdown property value:", result.markdown);
      throw new Error("Turndown conversion failed - markdown is not a string");
    }
    
    if (result.markdown.trim().length === 0) {
      console.error("❌ convertArticleToMarkdown: turndown returned empty markdown");
      console.log("📊 Original content length:", article.content.length);
      console.log("📄 Original content preview:", article.content.substring(0, 500));
      console.log("📊 Raw markdown value:", JSON.stringify(result.markdown));
      throw new Error("Turndown conversion resulted in empty markdown");
    }
    
    console.log('✅ Result validation passed');
    
  } catch (turndownError) {
    console.error("❌ convertArticleToMarkdown: Turndown conversion failed:", turndownError);
    console.log('🔍 Turndown error analysis:', {
      errorType: typeof turndownError,
      errorName: turndownError.name,
      errorMessage: turndownError.message,
      errorStack: turndownError.stack?.substring(0, 500)
    });
    console.log("🔄 Attempting fallback conversion...");
    
    // FALLBACK: Simple HTML to text conversion
    try {
      result = await fallbackHtmlToMarkdown(article.content, article);
      console.log("✅ Fallback conversion successful");
    } catch (fallbackError) {
      console.error("❌ Fallback conversion also failed:", fallbackError);
      throw new Error(`Both primary and fallback markdown conversion failed. Primary: ${turndownError.message}. Fallback: ${fallbackError.message}`);
    }
  }
  
  console.log("✅ convertArticleToMarkdown: Conversion successful");
  console.log("📊 Final markdown length:", result.markdown.length);
  
  // Post-process markdown to handle image placeholders that may already exist in content
  result.markdown = processImagePlaceholders(result.markdown, article);
  
  if (options.downloadImages && options.downloadMode == 'downloadsApi') {
    result = await preDownloadImages(result.imageList, result.markdown);
  }
  return result;
}

/**
 * Process image placeholders in markdown content
 * @param {string} markdown - Markdown content to process
 * @param {object} article - Article object for context
 * @returns {string} - Processed markdown
 */
function processImagePlaceholders(markdown, article) {
  console.log('🔄 Processing image placeholders...');
  
  // Pattern to match [Image #1], [Image #2], etc.
  const imagePlaceholderPattern = /\[Image\s*#?(\d+)\]/gi;
  
  let processedMarkdown = markdown;
  let replacements = 0;
  
  // Replace image placeholders with proper markdown
  processedMarkdown = processedMarkdown.replace(imagePlaceholderPattern, (match, imageNumber) => {
    replacements++;
    console.log(`🖼️ Found image placeholder: ${match}`);
    
    // Try to find corresponding image in the original HTML content
    const imageInfo = extractImageFromContext(article.content, parseInt(imageNumber));
    
    if (imageInfo && imageInfo.src) {
      console.log(`✅ Found image source for placeholder ${imageNumber}: ${imageInfo.src}`);
      const altText = imageInfo.alt || `Image ${imageNumber}`;
      const title = imageInfo.title ? ` "${imageInfo.title}"` : '';
      return `![${altText}](${imageInfo.src}${title})`;
    } else {
      console.log(`⚠️ No image source found for placeholder ${imageNumber}, using fallback`);
      return `![Image ${imageNumber}](# "Image placeholder - source not available")`;
    }
  });
  
  if (replacements > 0) {
    console.log(`✅ Processed ${replacements} image placeholders`);
  }
  
  return processedMarkdown;
}

/**
 * Extract image information from HTML context based on position
 * @param {string} htmlContent - HTML content to search
 * @param {number} imageIndex - Index of the image to find (1-based)
 * @returns {object|null} - Image information or null
 */
function extractImageFromContext(htmlContent, imageIndex) {
  try {
    // Parse HTML to find images
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const images = doc.querySelectorAll('img');
    
    if (images.length >= imageIndex) {
      const img = images[imageIndex - 1]; // Convert to 0-based index
      return {
        src: img.getAttribute('src') || img.getAttribute('data-src'),
        alt: img.getAttribute('alt') || `Image ${imageIndex}`,
        title: img.getAttribute('title')
      };
    }
  } catch (error) {
    console.warn('Failed to extract image from context:', error);
  }
  
  return null;
}

/**
 * Generate valid filename
 * @param {string} title - Title to convert
 * @param {string} disallowedChars - Characters to remove
 * @returns {string} - Valid filename
 */
function generateValidFileName(title, disallowedChars = null) {
  if (!title) return '';
  else title = title + '';
  
  var illegalRe = /[\/\?<>\\:\*\|":]/g;
  var name = title.replace(illegalRe, "").replace(new RegExp('\u00A0', 'g'), ' ')
      .replace(new RegExp(/\s+/, 'g'), ' ')
      .trim();

  if (disallowedChars) {
    for (let c of disallowedChars) {
      if (`[\\^$.|?*+()`.includes(c)) c = `\\${c}`;
      name = name.replace(new RegExp(c, 'g'), '');
    }
  }
  
  // Return empty string if name is empty or only whitespace after cleaning
  return name.trim();
}

/**
 * Pre-download images and convert to proper format
 * @param {Object} imageList - List of images to download
 * @param {string} markdown - Markdown content
 * @returns {Object} - Updated image list and markdown
 */
async function preDownloadImages(imageList, markdown) {
  // Service Worker环境禁用图片预下载功能
  console.log("⚠️ Image pre-download disabled in Service Worker environment");
  return { imageList: {}, markdown: markdown };
}

/**
 * Download markdown file
 * @param {string} markdown - Markdown content
 * @param {string} title - File title
 * @param {number} tabId - Tab ID
 * @param {Object} imageList - List of images
 * @param {string} mdClipsFolder - Destination folder
 */
async function downloadMarkdown(markdown, title, tabId, imageList = {}, mdClipsFolder = '') {
  const options = await getOptions();
  
  if (options.downloadMode == 'downloadsApi' && browser.downloads) {
    // Service Worker无法使用URL.createObjectURL，改用Data URL
    const dataUrl = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(markdown);
    console.log("📁 Created data URL for download");
  
    try {
      if(mdClipsFolder && !mdClipsFolder.endsWith('/')) mdClipsFolder += '/';
      
      const sanitizedTitle = generateValidFileName(title, options.disallowedChars) || 'untitled';
      const id = await browser.downloads.download({
        url: dataUrl,
        filename: mdClipsFolder + sanitizedTitle + ".md",
        saveAs: options.saveAs
      });

      // Data URL不需要清理，所以简化监听器
      browser.downloads.onChanged.addListener(downloadListener(id, null));

      if (options.downloadImages) {
        let destPath = mdClipsFolder + title.substring(0, title.lastIndexOf('/'));
        if(destPath && !destPath.endsWith('/')) destPath += '/';
        
        Object.entries(imageList).forEach(async ([src, filename]) => {
          const imgId = await browser.downloads.download({
            url: src,
            filename: destPath ? destPath + filename : filename,
            saveAs: false
          });
          browser.downloads.onChanged.addListener(downloadListener(imgId, src));
        });
      }
    }
    catch (err) {
      console.error("Download failed", err);
    }
  }
  else {
    try {
      await ensureScripts(tabId);
      const sanitizedTitle = generateValidFileName(title, options.disallowedChars) || 'untitled';
      const filename = mdClipsFolder + sanitizedTitle + ".md";
      await browser.scripting.executeScript({
        target: { tabId: tabId },
        func: (filename, encodedMarkdown) => {
          if (typeof downloadMarkdown === 'function') {
            downloadMarkdown(filename, encodedMarkdown);
          }
        },
        args: [filename, base64EncodeUnicode(markdown)]
      });
    }
    catch (error) {
      console.error("Failed to execute script: " + error);
    }
  }
}

/**
 * Download listener for cleanup
 * @param {number} id - Download ID
 * @param {string} url - Object URL to revoke
 * @returns {Function} - Listener function
 */
function downloadListener(id, url) {
  const self = (delta) => {
    if (delta.id === id && delta.state && delta.state.current == "complete") {
      browser.downloads.onChanged.removeListener(self);
      // 只有Object URL需要撤销，Data URL不需要
      if (url && url.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(url);
        } catch (error) {
          console.log("💡 URL revocation skipped in Service Worker environment");
        }
      }
    }
  };
  return self;
}

/**
 * Base64 encode unicode string
 * @param {string} str - String to encode
 * @returns {string} - Base64 encoded string
 */
function base64EncodeUnicode(str) {
  const utf8Bytes = encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (match, p1) {
    return String.fromCharCode('0x' + p1);
  });
  return btoa(utf8Bytes);
}

/**
 * Handle messages from content scripts
 * @param {Object} message - Message object
 */
async function notify(message) {
  console.log("📨 Message received:", message.type);
  
  if (message.type == "clip") {
    try {
      console.log("📄 Processing clip data in service worker");
      
      // Create article object from the raw DOM data
      const article = await getArticleFromDom(
        message.dom, 
        message.baseURI, 
        message.pageTitle
      );
      
      // Use selection if provided, otherwise use full content
      if (message.clipSelection && message.selection) {
        article.content = message.selection;
        console.log("📄 Using selected content, length:", message.selection.length);
      }
      
      // Process content using Readability and Turndown
      const { markdown, imageList } = await convertArticleToMarkdown(article, false);
      const title = await formatTitle(article);
      
      console.log("✅ Content processed, sending back to popup");
      
      // Send processed markdown back to popup
      await browser.runtime.sendMessage({ 
        type: "display.md", 
        markdown: markdown,
        title: title,
        imageList: imageList
      });
      
      return true; // ✅ EXPLICIT SUCCESS RETURN
      
    } catch (error) {
      console.error("❌ Error processing clip data:", error);
      // Send error back to popup
      try {
        await browser.runtime.sendMessage({ 
          type: "display.md", 
          error: "Failed to process content: " + (error?.message || error || 'Unknown error')
        });
      } catch (sendError) {
        console.error("❌ Failed to send error message to popup:", sendError);
      }
      return false; // ✅ EXPLICIT ERROR RETURN
    }
  }
  else if (message.type == "download") {
    console.log("💾 Processing download request");
    
    // Prevent duplicate downloads
    if (globalDownloadInProgress) {
      console.log("⏳ Download already in progress, ignoring duplicate request");
      return false; // ✅ EXPLICIT DUPLICATE PREVENTION RETURN
    }
    
    globalDownloadInProgress = true;
    
    try {
      await downloadMarkdown(message.markdown, message.title, message.tab.id, message.imageList, message.mdClipsFolder);
      console.log("✅ Download completed successfully");
      return true; // ✅ EXPLICIT SUCCESS RETURN
    } catch (error) {
      console.error("❌ Download failed:", error);
      return false; // ✅ EXPLICIT ERROR RETURN
    } finally {
      // Reset flag after debounce time
      setTimeout(() => {
        globalDownloadInProgress = false;
      }, downloadDebounceTime);
    }
  }
  else if (message.type == "processMarkdown") {
    console.log("📝 Processing markdown from popup");
    
    // Prevent duplicate downloads
    if (globalDownloadInProgress) {
      console.log("⏳ Download already in progress, ignoring duplicate request");
      return false; // ✅ EXPLICIT DUPLICATE PREVENTION RETURN
    }
    
    globalDownloadInProgress = true;
    
    try {
      // 处理从popup发来的已转换的markdown
      await downloadMarkdown(message.markdown, message.title, message.tabId, message.imageList, message.mdClipsFolder);
      console.log("✅ Download completed successfully");
      return true; // ✅ EXPLICIT SUCCESS RETURN
    } catch (error) {
      console.error("❌ Download failed:", error);
      return false; // ✅ EXPLICIT ERROR RETURN
    } finally {
      // Reset flag after debounce time
      setTimeout(() => {
        globalDownloadInProgress = false;
      }, downloadDebounceTime);
    }
  }
  
  return false; // ✅ EXPLICIT DEFAULT RETURN
}

/**
 * Ensure content scripts are loaded
 * @param {number} tabId - Tab ID
 */
async function ensureScripts(tabId) {
  try {
    const results = await browser.scripting.executeScript({
      target: { tabId: tabId },
      func: () => typeof getSelectionAndDom === 'function'
    });
    
    if (!results || !results[0] || results[0].result !== true) {
      await browser.scripting.executeScript({
        target: { tabId: tabId },
        files: [
          "contentScript/contentScript.js"
        ]
      });
      
      // Only inject pageContext.js if it exists
      try {
        await browser.scripting.executeScript({
          target: { tabId: tabId },
          files: ["contentScript/pageContext.js"]
        });
      } catch (pageContextError) {
        console.debug("pageContext.js not found or failed to inject, continuing without it");
      }
    }
  } catch (error) {
    console.error("Failed to ensure scripts:", error);
    // Try to inject the script anyway
    try {
      await browser.scripting.executeScript({
        target: { tabId: tabId },
        files: ["contentScript/contentScript.js"]
      });
    } catch (injectError) {
      console.error("Failed to inject content script:", injectError);
      throw injectError;
    }
  }
}

/**
 * Enhanced content cleaning for Service Worker environment
 * Implements intelligent content extraction without DOM APIs
 * @param {string} htmlString - Raw HTML string
 * @returns {string} - Cleaned HTML string with main content only
 */
async function cleanHtmlString(htmlString) {
  // PERFORMANCE OPTIMIZATION: Combined regex patterns for single-pass processing
  // This reduces the number of regex operations from ~20 to 3 major passes
  
  // Check content size before processing
  const sizeCheck = checkContentLimits(htmlString, 'HTML cleaning');
  if (!sizeCheck.allowed) {
    // For cleaning, truncate oversized content instead of failing completely
    const maxLength = Math.floor(MAX_CONTENT_SIZE * 0.8); // Use 80% of limit for safety
    console.warn(`⚠️ Truncating oversized content for cleaning: ${htmlString.length} chars -> ${maxLength} chars`);
    htmlString = htmlString.substring(0, maxLength) + '<!-- Content truncated due to size limit -->';
  }
  
  let content = htmlString;
  
  // Phase 1: Single-pass removal of noise elements and structural content
  // Combines: style, script, link, meta, head, comments, nav, header, footer, aside, menu
  const noisePattern = /<(?:style|script|link|meta|head|nav|header|footer|aside|menu)[^>]*>[\s\S]*?<\/(?:style|script|head|nav|header|footer|aside|menu)>|<(?:link|meta)[^>]*>|<!--[\s\S]*?-->/gi;
  const beforeNoise = content.length;
  content = content.replace(noisePattern, '');
  console.log(`🔧 cleanHtmlString: Removed noise elements (${beforeNoise} -> ${content.length} chars)`);

  // Phase 2: Single-pass removal of advertisement patterns (but be more conservative)
  // Only remove clearly identified ad containers, not broad patterns
  const adPattern = /<(?:div|iframe)[^>]*(?:class|id)="[^"]*(?:advertisement|banner|google-ads)[^"]*"[^>]*>[\s\S]*?<\/(?:div|iframe)>|<iframe[^>]*src="[^"]*doubleclick[^"]*"[^>]*>[\s\S]*?<\/iframe>/gi;
  const beforeAds = content.length;
  content = content.replace(adPattern, '');
  console.log(`🔧 cleanHtmlString: Removed ads (${beforeAds} -> ${content.length} chars)`);

  // Phase 3: CONSERVATIVE removal of only inline styles (keep class attributes for content extraction)
  // This was too aggressive before - only remove inline styles, not all class attributes
  const stylePattern = /\.[a-zA-Z][\w-]*\s*\{[^}]*\}|@media[^{]*\{[^{}]*\{[^}]*\}[^}]*\}|:root\s*\{[^}]*\}|style\s*=\s*"[^"]*"/gi;
  const beforeStyles = content.length;
  content = content.replace(stylePattern, '');
  console.log(`🔧 cleanHtmlString: Removed inline styles (${beforeStyles} -> ${content.length} chars)`);

  // Phase 4: Normalize whitespace (single operation)
  content = content
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .trim();

  return content;
}

/**
 * Extract math elements from HTML string using regex
 * @param {string} htmlString - HTML string to process
 * @returns {Object} - Math elements object
 */
async function extractMathFromString(htmlString) {
  const math = {};
  
  // Extract MathJax elements
  const mathJaxRegex = /<script[^>]*id="MathJax-Element-[^"]*"[^>]*type="([^"]*)"[^>]*>(.*?)<\/script>/gi;
  let match;
  let counter = 0;
  
  while ((match = mathJaxRegex.exec(htmlString)) !== null) {
    const randomId = 'math-' + (counter++);
    const type = match[1];
    const tex = match[2];
    math[randomId] = {
      tex: tex,
      inline: type ? !type.includes('mode=display') : false
    };
  }
  
  return math;
}

/**
 * Extract article content using intelligent content detection
 * Mimics Readability.js behavior without DOM APIs
 * @param {string} htmlString - HTML string
 * @param {string} title - Page title
 * @param {string} baseURI - Base URI
 * @returns {Object} - Article-like object
 */
async function extractArticleFromString(htmlString, title, baseURI) {
  console.log("🔧 extractArticleFromString: Starting extraction");
  console.log("📊 Input HTML length:", htmlString?.length || 0);
  console.log("📄 Input HTML preview:", htmlString?.substring(0, 300) + "...");
  
  // PERFORMANCE OPTIMIZATION: Check content size before processing
  const sizeCheck = checkContentLimits(htmlString, 'article extraction');
  if (!sizeCheck.allowed) {
    console.error("❌ extractArticleFromString: Content size check failed:", sizeCheck.reason);
    throw new Error(sizeCheck.reason);
  }
  
  // Extract body content
  const bodyMatch = htmlString.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let bodyContent = bodyMatch ? bodyMatch[1] : htmlString;
  console.log("📊 Body content length after extraction:", bodyContent.length);
  console.log("📄 Body content preview:", bodyContent.substring(0, 300) + "...");
  
  // Pre-clean obvious noise
  console.log("🔧 extractArticleFromString: Cleaning HTML content");
  bodyContent = await cleanHtmlString(bodyContent);
  console.log("📊 Body content length after cleaning:", bodyContent.length);
  console.log("📄 Body content preview after cleaning:", bodyContent.substring(0, 300) + "...");
  
  // CRITICAL: Check if cleaning removed all content
  if (bodyContent.trim().length === 0) {
    console.error("❌ extractArticleFromString: Content is empty after cleaning");
    console.log("📊 Original HTML length:", htmlString.length);
    console.log("📊 Body match found:", !!bodyMatch);
    throw new Error("Content extraction resulted in empty content after cleaning");
  }
  
  // Phase 1: Identify main content containers
  const mainContentCandidates = [];
  
  // PERFORMANCE OPTIMIZATION: Process semantic tags with yielding for large content
  const mainTags = ['<main', '<article', '<section'];
  for (let i = 0; i < mainTags.length; i++) {
    const tag = mainTags[i];
    const regex = new RegExp(`${tag}[^>]*>([\\s\\S]*?)<\\/${tag.slice(1)}>`, 'gi');
    const matches = bodyContent.match(regex);
    if (matches) {
      mainContentCandidates.push(...matches);
    }
    
    // Yield control after processing each tag type for large documents
    if (bodyContent.length > 100000 && i < mainTags.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  
  // Phase 2: Score content blocks by text density and quality with chunked processing
  let bestContent = '';
  let bestScore = 0;
  
  console.log("🔧 extractArticleFromString: Found", mainContentCandidates.length, "semantic containers");
  
  // If we found semantic containers, use them
  if (mainContentCandidates.length > 0) {
    for (let i = 0; i < mainContentCandidates.length; i++) {
      const candidate = mainContentCandidates[i];
      const score = scoreContentBlock(candidate);
      console.log(`📊 Candidate ${i}: score=${score}, length=${candidate.length}`);
      if (score > bestScore) {
        bestScore = score;
        bestContent = candidate;
        console.log(`✅ New best content found: score=${score}`);
      }
      
      // Yield control every 10 candidates for large sets
      if (mainContentCandidates.length > 10 && i % 10 === 9) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
  }
  
  // Phase 3: Fallback to paragraph-based extraction with chunked processing
  if (!bestContent) {
    console.log("🔧 extractArticleFromString: No semantic containers found, trying paragraph blocks");
    // Find the largest consecutive block of paragraphs
    const paragraphBlocks = findParagraphBlocks(bodyContent);
    console.log("📊 Found", paragraphBlocks.length, "paragraph blocks");
    
    for (let i = 0; i < paragraphBlocks.length; i++) {
      const block = paragraphBlocks[i];
      const score = scoreContentBlock(block);
      console.log(`📊 Paragraph block ${i}: score=${score}, length=${block.length}`);
      if (score > bestScore) {
        bestScore = score;
        bestContent = block;
        console.log(`✅ New best paragraph content found: score=${score}`);
      }
      
      // Yield control every 5 blocks for large sets
      if (paragraphBlocks.length > 5 && i % 5 === 4) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
  }
  
  // Phase 4: Final fallback - use entire cleaned body
  if (!bestContent) {
    console.log("⚠️ extractArticleFromString: No good content blocks found, using entire cleaned body");
    bestContent = bodyContent;
  }
  
  console.log("📊 Best content selected - length:", bestContent.length, "score:", bestScore);
  console.log("📄 Best content preview:", bestContent.substring(0, 300) + "...");
  
  // Final cleaning pass
  console.log("🔧 extractArticleFromString: Applying final cleanup");
  bestContent = await finalContentCleanup(bestContent);
  console.log("📊 Content length after final cleanup:", bestContent.length);
  
  // CRITICAL: Ensure we still have content after final cleanup
  if (bestContent.trim().length === 0) {
    console.error("❌ extractArticleFromString: Content is empty after final cleanup");
    console.log("📊 Original body content length:", bodyContent.length);
    throw new Error("Content extraction resulted in empty content after final cleanup");
  }
  
  // Extract text for metadata
  const textContent = bestContent.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  
  return {
    title: title || 'Untitled',
    byline: extractByline(bestContent),
    dir: 'ltr',
    lang: extractLanguage(htmlString),
    content: bestContent,
    textContent: textContent,
    length: textContent.length,
    excerpt: textContent.substring(0, 200),
    siteName: extractSiteName(htmlString, baseURI),
    publishedTime: extractPublishDate(bestContent)
  };
}

/**
 * Score content block based on text density and quality indicators
 * @param {string} content - HTML content block
 * @returns {number} - Quality score
 */
function scoreContentBlock(content) {
  const textContent = content.replace(/<[^>]*>/g, '');
  const textLength = textContent.length;
  
  // LESS AGGRESSIVE: Lower minimum threshold from 50 to 20
  if (textLength < 20) return 0; // Too short
  
  let score = textLength; // Base score on text length
  
  // Positive indicators (increased weights)
  if (content.includes('<p>')) score += 200; // Paragraphs are good
  if (content.includes('<h1>') || content.includes('<h2>') || content.includes('<h3>')) score += 100; // Headers
  if (content.includes('<blockquote>')) score += 50; // Quotes
  if (content.includes('<ol>') || content.includes('<ul>')) score += 50; // Lists
  if (content.includes('<em>') || content.includes('<strong>')) score += 25; // Emphasis
  if (content.includes('<a ')) score += 25; // Links indicate content
  
  // LESS AGGRESSIVE: Reduce negative scoring to avoid removing legitimate content
  if (content.toLowerCase().includes('cookie policy')) score -= 50; // Cookie notices (more specific)
  if (content.toLowerCase().includes('newsletter')) score -= 30; // Newsletter prompts (more specific)
  if (content.toLowerCase().includes('advertisement')) score -= 100; // Ads
  if (content.toLowerCase().includes('follow us on')) score -= 30; // Social widgets (more specific)
  
  console.log(`📊 Content block scoring: length=${textLength}, final score=${score}`);
  return score;
}

/**
 * Find consecutive paragraph blocks in content
 * @param {string} content - HTML content
 * @returns {Array} - Array of paragraph blocks
 */
function findParagraphBlocks(content) {
  const blocks = [];
  const paragraphs = content.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || [];
  
  if (paragraphs.length === 0) return [content];
  
  // Group consecutive paragraphs
  let currentBlock = '';
  for (const p of paragraphs) {
    if (currentBlock.length < 1000) { // Max block size
      currentBlock += p;
    } else {
      if (currentBlock) blocks.push(currentBlock);
      currentBlock = p;
    }
  }
  if (currentBlock) blocks.push(currentBlock);
  
  return blocks;
}

/**
 * Final cleanup of extracted content
 * @param {string} content - HTML content
 * @returns {string} - Cleaned content
 */
async function finalContentCleanup(content) {
  return content
    .replace(/<div[^>]*class="[^"]*empty[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '') // Empty divs
    .replace(/<span[^>]*style="[^"]*display:\s*none[^"]*"[^>]*>[\s\S]*?<\/span>/gi, '') // Hidden spans
    .replace(/\s*data-[^=]*="[^"]*"/gi, '') // Data attributes
    .replace(/\s*aria-[^=]*="[^"]*"/gi, '') // ARIA attributes
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Extract byline/author information
 * @param {string} content - HTML content
 * @returns {string} - Author information
 */
function extractByline(content) {
  const bylinePatterns = [
    /<span[^>]*class="[^"]*author[^"]*"[^>]*>([^<]+)<\/span>/i,
    /<div[^>]*class="[^"]*byline[^"]*"[^>]*>([^<]+)<\/div>/i,
    /<p[^>]*class="[^"]*author[^"]*"[^>]*>([^<]+)<\/p>/i
  ];
  
  for (const pattern of bylinePatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return '';
}

/**
 * Extract language from HTML
 * @param {string} htmlString - Full HTML string
 * @returns {string} - Language code
 */
function extractLanguage(htmlString) {
  const langMatch = htmlString.match(/<html[^>]*lang=["']([^"']+)["'][^>]*>/i);
  return langMatch ? langMatch[1] : 'en';
}

/**
 * Extract site name
 * @param {string} htmlString - Full HTML string
 * @param {string} baseURI - Base URI
 * @returns {string} - Site name
 */
function extractSiteName(htmlString, baseURI) {
  const siteNameMatch = htmlString.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  if (siteNameMatch && siteNameMatch[1]) {
    return siteNameMatch[1];
  }
  
  try {
    return new URL(baseURI).hostname;
  } catch {
    return '';
  }
}

/**
 * Extract publish date
 * @param {string} content - HTML content
 * @returns {string} - Publish date
 */
function extractPublishDate(content) {
  const datePatterns = [
    /<time[^>]*datetime=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]*property=["']article:published_time["'][^>]*content=["']([^"']+)["'][^>]*>/i
  ];
  
  for (const pattern of datePatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return '';
}

/**
 * Process Reddit content using string-based processing
 * @param {string} htmlContent - Raw HTML content
 * @returns {string} - Processed content
 */
async function processRedditStringContent(htmlContent) {
  console.log('🔧 Processing Reddit content with string-based method...');
  
  // Clean up Reddit-specific noise patterns
  let content = htmlContent
    .replace(/window\.__servedBy[\s\S]*?__servedByRes\([^)]*\)/g, '')
    .replace(/Skip to main content/g, '')
    .replace(/window\.shouldTrackTTC[\s\S]*?;/g, '')
    .replace(/\.snoo-cls-[\d]+[\s\S]*?}/g, '')
    .replace(/:root[\s\S]*?}/g, '')
    .replace(/@media[\s\S]*?}/g, '')
    .replace(/Go to \w+/g, '')
    .replace(/\s*•\s*/g, ' ')
    .replace(/\d+\s+days?\s+ago/g, '')
    .replace(/💬\s*Discussion/g, '')
    .replace(/\[.*?\]\(\/r\/.*?\)/g, '')
    .replace(/\[.*?\]\(\/user\/.*?\)/g, '')
    .replace(/Pretty-Minute-\d+/g, '')
    .replace(/Open menu Open navigation/g, '')
    .replace(/Advertise on Reddit/g, '')
    .replace(/Create Create post/g, '')
    .replace(/Expand user menu/g, '')
    .replace(/Current Status: Beta testing/g, '');
  
  // Remove excessive whitespace
  content = content
    .replace(/\s+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  return content;
}

/**
 * Get article from string content instead of DOM (Service Worker compatible)
 * @param {string} htmlString - HTML string
 * @param {string} baseURI - Base URI
 * @param {string} pageTitle - Page title
 * @returns {Object} - Article object
 */
async function getArticleFromStringContent(htmlString, baseURI, pageTitle) {
  console.log("🔧 Using string-based content extraction for Service Worker compatibility");
  
  const titleMatch = htmlString.match(/<title[^>]*>(.*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : pageTitle || "Untitled";
  
  const article = await extractArticleFromString(htmlString, title, baseURI);
  
  // Add Service Worker compatible metadata
  article.baseURI = baseURI || "https://example.com";
  article.pageTitle = title;
  article.math = await extractMathFromString(htmlString);
  
  // Extract URL info
  const urlInfo = extractUrlInfo(baseURI);
  Object.assign(article, urlInfo);
  
  // Extract keywords from meta tags using string parsing
  const keywordsMatch = htmlString.match(/<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']*)["']/i);
  if (keywordsMatch) {
    article.keywords = keywordsMatch[1].split(',').map(s => s.trim());
  }
  
  // Extract other meta tags using regex
  const metaMatches = htmlString.matchAll(/<meta[^>]*(?:name|property)=["']([^"']*)["'][^>]*content=["']([^"']*)["']/gi);
  for (const match of metaMatches) {
    const key = match[1];
    const val = match[2];
    if (key && val && !article[key]) {
      article[key] = val;
    }
  }
  
  return article;
}

/**
 * Get article from DOM string
 * @param {string} domString - DOM HTML string
 * @returns {Object} - Article object
 */
async function getArticleFromDom(domString, baseURI, pageTitle) {
  console.log("🔄 getArticleFromDom: Processing DOM content for extraction");
  console.log("📊 DOM string length:", domString?.length || 0);
  console.log("📊 DOM preview:", domString?.substring(0, 300) + "...");
  
  // Service workers cannot use DOMParser - must process content without DOM manipulation
  console.log("⚠️ Service Worker: DOM parsing not available, using text-based processing");
  
  try {
    // Extract basic content without DOM parsing
    return await getArticleFromStringContent(domString, baseURI, pageTitle);
  } catch (error) {
    console.error("❌ Error in getArticleFromDom:", error);
    
    // Emergency fallback: extract basic content without DOM processing
    console.warn("⚠️ Using emergency fallback content extraction");
    const titleMatch = domString.match(/<title[^>]*>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : pageTitle || "Untitled";
    
    return {
      content: await cleanHtmlString(domString),
      title: title,
      byline: "",
      excerpt: "",
      baseURI: baseURI || "https://example.com",
      pageTitle: title,
      math: {},
      keywords: [],
      ...extractUrlInfo(baseURI)
    };
  }
}

/**
 * Extract article content from DOM with enhanced processing
 * @param {Document} dom - Parsed DOM document
 * @param {string} baseURI - Base URI
 * @param {string} pageTitle - Page title
 * @returns {Object} - Article object
 */
async function getArticleFromDomEnhanced(dom, baseURI, pageTitle) {
  console.log("🔄 getArticleFromDomEnhanced: Processing DOM content for extraction");
  
  try {
    const url = new URL(baseURI || "https://example.com");
    const hostname = url.hostname.replace(/^www\./, '');
    
    console.log(`🔧 Processing ${hostname} content`);

    // Check for site-specific configuration
    const siteConfig = getSiteConfiguration(hostname);
    
    if (siteConfig) {
      console.log(`🎯 Using site-specific configuration for ${hostname}`);
      return getArticleFromDomWithSiteConfig(dom, siteConfig);
    }

    // Note: This function is designed for Service Worker compatibility
    // DOM processing is not available, so we'll redirect to string-based processing
    console.log("⚠️ getArticleFromDomEnhanced: Redirecting to string-based processing for Service Worker compatibility");
    
    // Convert DOM to string for processing (this would be passed as domString in Service Worker)
    const domString = dom.documentElement ? dom.documentElement.outerHTML : dom;
    return await getArticleFromStringContent(domString, baseURI, pageTitle);
    
  } catch (error) {
    console.error("❌ Error in getArticleFromDomEnhanced:", error);
    
    // Fallback to string-based processing
    console.warn("⚠️ Using emergency fallback string content extraction");
    const domString = typeof dom === 'string' ? dom : dom.documentElement?.outerHTML || '';
    return await getArticleFromStringContent(domString, baseURI, pageTitle);
  }
}

/**
 * Get site-specific configuration for content extraction
 * @param {string} hostname - Website hostname
 * @returns {Object|null} - Site configuration or null
 */
function getSiteConfiguration(hostname) {
  // Simple site configuration lookup
  const DEFAULT_SITE_CONFIGURATIONS = {
    'reddit.com': {
      name: 'Reddit',
      contentSelectors: [
        '[data-testid="post-content"]',
        '[data-test-id="post-content"]', 
        '.usertext-body',
        '[data-click-id="text"]',
        '.Post__content',
        '.usertext',
        '[slot="text-body"]',
        'shreddit-post',
        '[class*="RichTextJSON"]'
      ],
      titleSelectors: [
        'h1',
        '[data-testid="post-content"] h3',
        '.Post__title',
        '.title'
      ],
      cleanupRules: {
        removeSelectors: [
          'script', 'style', 'noscript', 'meta', 'link[rel="stylesheet"]',
          'head', 'header', 'nav', 'footer', 'aside',
          '.subreddit-header', '.side', '.sidebar', '.linkinfo',
          '.midcol', '.arrow', '.score', '.voting',
          '.tabmenu', '.menuarea', '.buttons', '.flat-list', 
          '.give-gold-button', '.share', '.save-button', '.hide-button',
          '.ad', '.promoted', '.sponsorlink', '.advertisement',
          '.tagline', '.subreddit', '.domain',
          '.author', '.edited-timestamp', '.live-timestamp',
          'img[src*="communityIcon"]', 'img[src*="icon"]',
          'a[href*="/r/"]', 'a[href*="/user/"]',
          '.vote', '.upvote', '.downvote',
          '.posted-ago', '.timeago',
          '[class*="darkreader"]', '[class*="theme"]',
          '[class*="color"]', '[style*="color"]',
          'p:empty', 'div:empty', 'span:empty',
          '[class*="snoo"]', '[class*="reddit"]',
          '[class*="navigation"]', '[class*="menu"]',
          '[role="banner"]', '[role="navigation"]', '[role="complementary"]'
        ],
        textReplacements: [
          { pattern: 'window\\.__servedBy[\\s\\S]*?__servedByRes\\([^)]*\\)', replacement: '' },
          { pattern: 'Skip to main content', replacement: '' },
          { pattern: 'window\\.shouldTrackTTC[\\s\\S]*?;', replacement: '' },
          { pattern: '\\.snoo-cls-[\\d]+[\\s\\S]*?}', replacement: '' },
          { pattern: ':root[\\s\\S]*?}', replacement: '' },
          { pattern: '@media[\\s\\S]*?}', replacement: '' },
          { pattern: 'Go to \\w+', replacement: '' },
          { pattern: '\\s*•\\s*', replacement: ' ' },
          { pattern: '\\d+\\s+days?\\s+ago', replacement: '' },
          { pattern: '💬\\s*Discussion', replacement: '' },
          { pattern: '\\[.*?\\]\\(\\/r\\/.*?\\)', replacement: '' },
          { pattern: '\\[.*?\\]\\(\\/user\\/.*?\\)', replacement: '' },
          { pattern: 'Pretty-Minute-\\d+', replacement: '' },
          { pattern: 'Open menu Open navigation', replacement: '' },
          { pattern: 'Advertise on Reddit', replacement: '' },
          { pattern: 'Create Create post', replacement: '' },
          { pattern: 'Expand user menu', replacement: '' },
          { pattern: 'Current Status: Beta testing', replacement: '' }
        ]
      }
    }
  };

  // Direct match
  if (DEFAULT_SITE_CONFIGURATIONS[hostname]) {
    return DEFAULT_SITE_CONFIGURATIONS[hostname];
  }

  // Domain matching (e.g., subdomain.reddit.com matches reddit.com)
  for (const [domain, config] of Object.entries(DEFAULT_SITE_CONFIGURATIONS)) {
    if (hostname.includes(domain)) {
      return config;
    }
  }

  return null;
}

/**
 * Extract article using site-specific configuration
 * @param {Document} dom - Parsed DOM
 * @param {Object} siteConfig - Site configuration
 * @returns {Object} - Article object
 */
async function getArticleFromDomWithSiteConfig(dom, siteConfig) {
  console.log(`🔧 Processing with site config: ${siteConfig.name}`);
  
  // First, apply cleanup rules to remove unwanted elements
  if (siteConfig.cleanupRules && siteConfig.cleanupRules.removeSelectors) {
    siteConfig.cleanupRules.removeSelectors.forEach(selector => {
      try {
        const elements = dom.querySelectorAll(selector);
        elements.forEach(el => {
          if (el && el.parentNode) {
            el.parentNode.removeChild(el);
          }
        });
      } catch (e) {
        console.warn(`Invalid selector: ${selector}`, e);
      }
    });
  }

  // Extract content using site-specific selectors
  let contentElement = null;
  let contentHtml = '';
  
  if (siteConfig.contentSelectors) {
    for (const selector of siteConfig.contentSelectors) {
      try {
        contentElement = dom.querySelector(selector);
        if (contentElement) {
          console.log(`✅ Content found with selector: ${selector}`);
          contentHtml = contentElement.innerHTML || contentElement.textContent || '';
          break;
        }
      } catch (e) {
        console.warn(`Invalid content selector: ${selector}`, e);
      }
    }
  }

  // If no content found with site config, fallback to body
  if (!contentHtml) {
    console.log('⚠️ No content found with site selectors, using body as fallback');
    contentHtml = dom.body ? dom.body.innerHTML : '';
  }

  // Extract title using site-specific selectors
  let title = '';
  if (siteConfig.titleSelectors) {
    for (const selector of siteConfig.titleSelectors) {
      try {
        const titleElement = dom.querySelector(selector);
        if (titleElement) {
          title = titleElement.textContent || titleElement.getAttribute('content') || '';
          if (title.trim()) {
            console.log(`✅ Title found with selector: ${selector}`);
            break;
          }
        }
      } catch (e) {
        console.warn(`Invalid title selector: ${selector}`, e);
      }
    }
  }

  // Fallback to document title if no title found
  if (!title.trim()) {
    title = dom.title || '';
  }

  // Apply text replacements to clean up the content
  if (siteConfig.cleanupRules && siteConfig.cleanupRules.textReplacements) {
    siteConfig.cleanupRules.textReplacements.forEach(rule => {
      try {
        const regex = new RegExp(rule.pattern, 'gi');
        contentHtml = contentHtml.replace(regex, rule.replacement);
        title = title.replace(regex, rule.replacement);
      } catch (e) {
        console.warn(`Invalid text replacement pattern: ${rule.pattern}`, e);
      }
    });
  }

  // Special processing for Reddit content
  if (siteConfig.name === 'Reddit') {
    contentHtml = processRedditContent(contentHtml);
  } else {
    // Clean up extra whitespace and formatting issues for other sites
    contentHtml = contentHtml
      .replace(/\s+/g, ' ')  // Replace multiple whitespace with single space
      .replace(/\n\s*\n\s*\n/g, '\n\n')  // Replace multiple newlines with double newline
      .trim();
  }
  
  title = title.replace(/\s+/g, ' ').trim();

  // Build article object similar to Readability output
  const article = {
    title: title,
    byline: '',
    dir: dom.documentElement.dir || 'ltr',
    lang: dom.documentElement.lang || 'en',
    content: contentHtml,
    textContent: contentHtml.replace(/<[^>]*>/g, ''), // Strip HTML tags for text content
    length: contentHtml.replace(/<[^>]*>/g, '').length,
    excerpt: '',
    siteName: siteConfig.name,
    publishedTime: ''
  };

  // Add URL and base information
  if (dom.baseURI) {
    article.baseURI = dom.baseURI;
    const url = new URL(dom.baseURI);
    article.hash = url.hash;
    article.host = url.host;
    article.origin = url.origin;
    article.hostname = url.hostname;
    article.pathname = url.pathname;
    article.port = url.port;
    article.protocol = url.protocol;
    article.search = url.search;
  }

  // Add page title
  article.pageTitle = dom.title || title;

  // Add keywords if available
  if (dom.head) {
    article.keywords = dom.head.querySelector('meta[name="keywords"]')?.content?.split(',')?.map(s => s.trim());

    // Add all meta tags
    dom.head.querySelectorAll('meta[name][content], meta[property][content]')?.forEach(meta => {
      const key = (meta.getAttribute('name') || meta.getAttribute('property'));
      const val = meta.getAttribute('content');
      if (key && val && !article[key]) {
        article[key] = val;
      }
    });
  }

  // Add empty math object for compatibility
  article.math = {};

  console.log(`📄 Extracted article: ${article.title} (${article.length} chars)`);
  return article;
}

/**
 * Process Reddit content to improve structure and readability
 * @param {string} htmlContent - Raw HTML content
 * @returns {string} - Processed content
 */
function processRedditContent(htmlContent) {
  console.log('🔧 Processing Reddit content structure...');
  
  // Convert HTML to a more structured format
  let content = htmlContent;
  
  // Remove excessive whitespace but preserve paragraph structure
  content = content
    .replace(/\s+/g, ' ')  // Replace multiple whitespace with single space
    .replace(/\s*\n\s*/g, '\n')  // Clean up newlines
    .replace(/\n{3,}/g, '\n\n')  // Limit consecutive newlines to 2
    .trim();
  
  // Structure the main post content
  const lines = content.split('\n');
  const processedLines = [];
  let inCommentSection = false;
  let currentComment = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines initially
    if (!line) continue;
    
    // Detect start of comments section
    if (line.includes('Cancel') && lines[i + 1]?.includes('Comment')) {
      inCommentSection = true;
      processedLines.push('\n## Comments\n');
      i++; // Skip the "Comment" line
      continue;
    }
    
    // Process comments
    if (inCommentSection) {
      // Detect username pattern
      if (isRedditUsername(line)) {
        // Save previous comment if exists
        if (currentComment) {
          processedLines.push(formatRedditComment(currentComment));
          currentComment = null;
        }
        
        // Start new comment
        currentComment = {
          username: line,
          timestamp: '',
          content: []
        };
        
        // Check next line for timestamp
        if (i + 1 < lines.length && isTimestamp(lines[i + 1])) {
          i++;
          currentComment.timestamp = lines[i].trim();
        }
        continue;
      }
      
      // Add content to current comment
      if (currentComment && line && !isRedditNoise(line)) {
        currentComment.content.push(line);
      } else if (!currentComment && line && !isRedditNoise(line)) {
        // Standalone content in comments section
        processedLines.push(line + '\n');
      }
    } else {
      // Main post content
      if (!isRedditNoise(line)) {
        processedLines.push(line + '\n');
      }
    }
  }
  
  // Add final comment if exists
  if (currentComment) {
    processedLines.push(formatRedditComment(currentComment));
  }
  
  return processedLines.join('\n').replace(/\n{3,}/g, '\n\n');
}

/**
 * Check if line contains a Reddit username
 * @param {string} line - Line to check
 * @returns {boolean} - True if username pattern
 */
function isRedditUsername(line) {
  // Common patterns for Reddit usernames in the extracted content
  return /^[a-zA-Z0-9_-]+$/.test(line) && 
         line.length > 2 && 
         line.length < 50 && 
         !line.includes(' ') &&
         !isTimestamp(line) &&
         !isRedditNoise(line);
}

/**
 * Check if line is a timestamp
 * @param {string} line - Line to check
 * @returns {boolean} - True if timestamp pattern
 */
function isTimestamp(line) {
  return /\*\(\d+\s*d\s*ago\)\*/.test(line) || 
         /•.*ago/.test(line) ||
         /\d+\s*days?\s*ago/.test(line);
}

/**
 * Check if line is Reddit UI noise that should be removed
 * @param {string} line - Line to check
 * @returns {boolean} - True if noise pattern
 */
function isRedditNoise(line) {
  const noisePatterns = [
    /^More replies\.\.\.$/,
    /^💬.*More replies/,
    /^Cancel$/,
    /^Comment$/,
    /^Share$/,
    /^Sort by:/,
    /^Best$/, /^Top$/, /^New$/, /^Old$/, /^Q&A$/,
    /^Controversial$/,
    /^Open comment sort options$/,
    /track me$/,
    /^•$/
  ];
  
  return noisePatterns.some(pattern => pattern.test(line));
}

/**
 * Format a Reddit comment structure
 * @param {Object} comment - Comment object
 * @returns {string} - Formatted comment
 */
function formatRedditComment(comment) {
  if (!comment || !comment.username) return '';
  
  let formatted = `\n**${comment.username}**`;
  
  if (comment.timestamp) {
    formatted += ` ${comment.timestamp}`;
  }
  
  formatted += '\n\n';
  
  if (comment.content.length > 0) {
    formatted += comment.content.join(' ').trim() + '\n';
  }
  
  return formatted;
}

/**
 * Extract URL information from base URI
 * @param {string} baseURI - Base URI
 * @returns {Object} - URL info object
 */
function extractUrlInfo(baseURI) {
  try {
    const url = new URL(baseURI || "https://example.com");
    return {
      hash: url.hash,
      host: url.host,
      origin: url.origin,
      hostname: url.hostname,
      pathname: url.pathname,
      port: url.port,
      protocol: url.protocol,
      search: url.search
    };
  } catch (e) {
    console.warn("Invalid URL:", baseURI);
    return {
      hash: "",
      host: "",
      origin: "",
      hostname: "",
      pathname: "",
      port: "",
      protocol: "",
      search: ""
    };
  }
}

/**
 * Get article from tab content
 * @param {number} tabId - Tab ID
 * @param {boolean} selection - Whether to get selection only
 * @returns {Object} - Article object
 */
async function getArticleFromContent(tabId, selection = false) {
  try {
    const results = await browser.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        if (typeof getSelectionAndDom === 'function') {
          return getSelectionAndDom();
        }
        return null;
      }
    });

    if (results && results[0] && results[0].result && results[0].result.dom) {
      const article = await getArticleFromDom(results[0].result.dom, results[0].result.baseURI, results[0].result.pageTitle);

      if (selection && results[0].result.selection) {
        article.content = results[0].result.selection;
      }

      return article;
    }
    else return null;
  } catch (error) {
    console.error("Failed to get article from content:", error);
    return null;
  }
}

/**
 * Format title using template
 * @param {Object} article - Article object
 * @returns {string} - Formatted title
 */
async function formatTitle(article) {
  let options = await getOptions();
  let title = textReplace(options.title, article, options.disallowedChars + '/');
  title = title.split('/').map(s=>generateValidFileName(s, options.disallowedChars)).join('/');
  return title;
}

/**
 * Format MD clips folder
 * @param {Object} article - Article object
 * @returns {string} - Formatted folder path
 */
async function formatMdClipsFolder(article) {
  let options = await getOptions();
  let mdClipsFolder = '';
  
  if (options.mdClipsFolder && options.downloadMode == 'downloadsApi') {
    mdClipsFolder = textReplace(options.mdClipsFolder, article, options.disallowedChars);
    mdClipsFolder = mdClipsFolder.split('/').map(s => generateValidFileName(s, options.disallowedChars)).join('/');
    if (!mdClipsFolder.endsWith('/')) mdClipsFolder += '/';
  }

  return mdClipsFolder;
}

/**
 * Format Obsidian folder
 * @param {Object} article - Article object
 * @returns {string} - Formatted folder path
 */
async function formatObsidianFolder(article) {
  let options = await getOptions();
  let obsidianFolder = '';
  
  if (options.obsidianFolder) {
    obsidianFolder = textReplace(options.obsidianFolder, article, options.disallowedChars);
    obsidianFolder = obsidianFolder.split('/').map(s => generateValidFileName(s, options.disallowedChars)).join('/');
    if (!obsidianFolder.endsWith('/')) obsidianFolder += '/';
  }

  return obsidianFolder;
}

// Command handlers
browser.commands.onCommand.addListener(async function (command) {
  // Get the active tab instead of current tab
  const tabs = await browser.tabs.query({ currentWindow: true, active: true });
  const tab = tabs && tabs[0];
  
  if (!tab) {
    console.error("No active tab found for command:", command);
    return;
  }
  
  if (command == "download_tab_as_markdown") {
    const info = { menuItemId: "download-markdown-all" };
    downloadMarkdownFromContext(info, tab);
  }
  else if (command == "copy_tab_as_markdown") {
    const info = { menuItemId: "copy-markdown-all" };
    copyMarkdownFromContext(info, tab);
  }
  else if (command == "copy_selection_as_markdown") {
    const info = { menuItemId: "copy-markdown-selection" };
    copyMarkdownFromContext(info, tab);
  }
  else if (command == "copy_tab_as_markdown_link") {
    copyTabAsMarkdownLink(tab);
  }
  else if (command == "copy_selected_tab_as_markdown_link") {
    copySelectedTabAsMarkdownLink(tab);
  }
  else if (command == "copy_selection_to_obsidian") {
    const info = { menuItemId: "copy-markdown-obsidian" };
    copyMarkdownFromContext(info, tab);
  }
  else if (command == "copy_tab_to_obsidian") {
    const info = { menuItemId: "copy-markdown-obsall" };
    copyMarkdownFromContext(info, tab);
  }
});

// Context menu click handler
browser.contextMenus.onClicked.addListener(function (info, tab) {
  if (info.menuItemId.startsWith("copy-markdown")) {
    copyMarkdownFromContext(info, tab);
  }
  else if (info.menuItemId == "download-markdown-alltabs" || info.menuItemId == "tab-download-markdown-alltabs") {
    downloadMarkdownForAllTabs(info);
  }
  else if (info.menuItemId.startsWith("download-markdown")) {
    downloadMarkdownFromContext(info, tab);
  }
  else if (info.menuItemId.startsWith("copy-tab-as-markdown-link-all")) {
    copyTabAsMarkdownLinkAll(tab);
  }
  else if (info.menuItemId.startsWith("copy-tab-as-markdown-link-selected")) {
    copySelectedTabAsMarkdownLink(tab);
  }
  else if (info.menuItemId.startsWith("copy-tab-as-markdown-link")) {
    copyTabAsMarkdownLink(tab);
  }
  else if (info.menuItemId.startsWith("toggle-") || info.menuItemId.startsWith("tabtoggle-")) {
    toggleSetting(info.menuItemId.split('-')[1]);
  }
});

/**
 * Toggle extension setting
 * @param {string} setting - Setting name
 * @param {Object} options - Options object
 */
async function toggleSetting(setting, options = null) {
  if (options == null) {
    await toggleSetting(setting, await getOptions());
  }
  else {
    options[setting] = !options[setting];
    await browser.storage.sync.set(options);
    
    if (setting == "includeTemplate") {
      // Update main context menu
      await browser.contextMenus.update("toggle-includeTemplate", {
        checked: options.includeTemplate
      });
      
      // Update tab context menu (only exists in Firefox)
      try {
        await browser.contextMenus.update("tabtoggle-includeTemplate", {
          checked: options.includeTemplate
        });
      } catch (error) {
        console.debug("Tab context menu not available:", error.message);
      }
    }
    
    if (setting == "downloadImages") {
      // Update main context menu
      await browser.contextMenus.update("toggle-downloadImages", {
        checked: options.downloadImages
      });
      
      // Update tab context menu (only exists in Firefox)
      try {
        await browser.contextMenus.update("tabtoggle-downloadImages", {
          checked: options.downloadImages
        });
      } catch (error) {
        console.debug("Tab context menu not available:", error.message);
      }
    }
  }
}

/**
 * Download markdown from context menu
 * @param {Object} info - Context menu info
 * @param {Object} tab - Tab object
 */
async function downloadMarkdownFromContext(info, tab) {
  // Prevent duplicate downloads
  if (globalDownloadInProgress) {
    console.log("⏳ Download already in progress, ignoring duplicate request");
    return;
  }
  
  globalDownloadInProgress = true;
  console.log("💾 Starting download from context/shortcut...");
  
  try {
    await ensureScripts(tab.id);
    const article = await getArticleFromContent(tab.id, info.menuItemId == "download-markdown-selection");
    const title = await formatTitle(article);
    const { markdown, imageList } = await convertArticleToMarkdown(article);
    const mdClipsFolder = await formatMdClipsFolder(article);
    await downloadMarkdown(markdown, title, tab.id, imageList, mdClipsFolder);
    console.log("✅ Download completed successfully");
  } catch (error) {
    console.error("❌ Download failed:", error);
    throw error;
  } finally {
    // Reset flag after debounce time
    setTimeout(() => {
      globalDownloadInProgress = false;
    }, downloadDebounceTime);
  }
}

/**
 * Copy tab as markdown link
 * @param {Object} tab - Tab object
 */
async function copyTabAsMarkdownLink(tab) {
  try {
    await ensureScripts(tab.id);
    const article = await getArticleFromContent(tab.id);
    const title = await formatTitle(article);
    const markdownLink = `[${title}](${article.baseURI})`;
    await browser.scripting.executeScript({
      target: { tabId: tab.id },
      func: (link) => {
        if (typeof copyToClipboard === 'function') {
          copyToClipboard(link);
        }
      },
      args: [markdownLink]
    });
  }
  catch (error) {
    console.error("Failed to copy as markdown link: " + error);
  }
}

/**
 * Copy all tabs as markdown links
 * @param {Object} tab - Current tab
 */
async function copyTabAsMarkdownLinkAll(tab) {
  try {
    const options = await getOptions();
    options.frontmatter = options.backmatter = '';
    const tabs = await browser.tabs.query({ currentWindow: true });
    
    const links = [];
    for(const tab of tabs) {
      await ensureScripts(tab.id);
      const article = await getArticleFromContent(tab.id);
      const title = await formatTitle(article);
      const link = `${options.bulletListMarker} [${title}](${article.baseURI})`;
      links.push(link);
    }
    
    const markdown = links.join(`\n`);
    await browser.scripting.executeScript({
      target: { tabId: tab.id },
      func: (content) => {
        if (typeof copyToClipboard === 'function') {
          copyToClipboard(content);
        }
      },
      args: [markdown]
    });
  }
  catch (error) {
    console.error("Failed to copy as markdown link: " + error);
  }
}

/**
 * Copy selected tabs as markdown links
 * @param {Object} tab - Current tab
 */
async function copySelectedTabAsMarkdownLink(tab) {
  try {
    const options = await getOptions();
    options.frontmatter = options.backmatter = '';
    const tabs = await browser.tabs.query({ currentWindow: true, highlighted: true });

    const links = [];
    for (const tab of tabs) {
      await ensureScripts(tab.id);
      const article = await getArticleFromContent(tab.id);
      const title = await formatTitle(article);
      const link = `${options.bulletListMarker} [${title}](${article.baseURI})`;
      links.push(link);
    }

    const markdown = links.join(`\n`);
    await browser.scripting.executeScript({
      target: { tabId: tab.id },
      func: (content) => {
        if (typeof copyToClipboard === 'function') {
          copyToClipboard(content);
        }
      },
      args: [markdown]
    });
  }
  catch (error) {
    console.error("Failed to copy as markdown link: " + error);
  }
}

/**
 * Copy markdown from context menu
 * @param {Object} info - Context menu info
 * @param {Object} tab - Tab object
 */
async function copyMarkdownFromContext(info, tab) {
  try{
    await ensureScripts(tab.id);

    const platformOS = navigator.platform;
    var folderSeparator = platformOS.indexOf("Win") === 0 ? "\\" : "/";

    if (info.menuItemId == "copy-markdown-link") {
      const options = await getOptions();
      options.frontmatter = options.backmatter = '';
      const article = await getArticleFromContent(tab.id, false);
      const { markdown } = turndown(`<a href="${info.linkUrl}">${info.linkText || info.selectionText}</a>`, { ...options, downloadImages: false }, article);
      await browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: (content) => {
          if (typeof copyToClipboard === 'function') {
            copyToClipboard(content);
          }
        },
        args: [markdown]
      });
    }
    else if (info.menuItemId == "copy-markdown-image") {
      const imageMarkdown = `![](${info.srcUrl})`;
      await browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: (content) => {
          if (typeof copyToClipboard === 'function') {
            copyToClipboard(content);
          }
        },
        args: [imageMarkdown]
      });
    }
    else if(info.menuItemId == "copy-markdown-obsidian") {
      const article = await getArticleFromContent(tab.id, info.menuItemId == "copy-markdown-obsidian");
      const title = await formatTitle(article);
      const options = await getOptions();
      const obsidianVault = options.obsidianVault;
      const obsidianFolder = await formatObsidianFolder(article);
      const { markdown } = await convertArticleToMarkdown(article, false);
      await browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: (content) => {
          if (typeof copyToClipboard === 'function') {
            copyToClipboard(content);
          }
        },
        args: [markdown]
      });
      await browser.tabs.update({url: "obsidian://advanced-uri?vault=" + obsidianVault + "&clipboard=true&mode=new&filepath=" + obsidianFolder + (generateValidFileName(title) || 'untitled')});
    }
    else if(info.menuItemId == "copy-markdown-obsall") {
      const article = await getArticleFromContent(tab.id, info.menuItemId == "copy-markdown-obsall");
      const title = await formatTitle(article);
      const options = await getOptions();
      const obsidianVault = options.obsidianVault;
      const obsidianFolder = await formatObsidianFolder(article);
      const { markdown } = await convertArticleToMarkdown(article, false);
      await browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: (content) => {
          if (typeof copyToClipboard === 'function') {
            copyToClipboard(content);
          }
        },
        args: [markdown]
      });
      await browser.tabs.update({url: "obsidian://advanced-uri?vault=" + obsidianVault + "&clipboard=true&mode=new&filepath=" + obsidianFolder + (generateValidFileName(title) || 'untitled')});
    }
    else {
      const article = await getArticleFromContent(tab.id, info.menuItemId == "copy-markdown-selection");
      const { markdown } = await convertArticleToMarkdown(article, false);
      await browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: (content) => {
          if (typeof copyToClipboard === 'function') {
            copyToClipboard(content);
          }
        },
        args: [markdown]
      });
    }
  }
  catch (error) {
    console.error("Failed to copy text: " + error);
  }
}

/**
 * Download markdown for all tabs
 * @param {Object} info - Context menu info
 */
async function downloadMarkdownForAllTabs(info) {
  const tabs = await browser.tabs.query({ currentWindow: true });
  tabs.forEach(tab => {
    downloadMarkdownFromContext(info, tab);
  });
}

// String.prototype.replaceAll polyfill
if (!String.prototype.replaceAll) {
  String.prototype.replaceAll = function(str, newStr){
    if (Object.prototype.toString.call(str).toLowerCase() === '[object regexp]') {
      return this.replace(str, newStr);
    }
    return this.replace(new RegExp(str, 'g'), newStr);
  };
}

// Message listener for handling messages from content scripts and popup
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("📥 Service Worker received message:", message?.type || 'undefined', "from:", sender.tab?.id || 'popup');
  
  // Validate message structure
  if (!message || typeof message !== 'object' || typeof message.type !== 'string') {
    console.error("❌ Invalid message received:", message);
    sendResponse({ error: "Invalid message format" });
    return false;
  }
  
  // Handle message types that need immediate response
  if (message.type === "healthCheck") {
    sendResponse({
      status: 'healthy',
      initialized: self.serviceWorkerStatus.initialized,
      dependenciesLoaded: self.serviceWorkerStatus.dependenciesLoaded,
      errors: self.serviceWorkerStatus.errors,
      timestamp: Date.now()
    });
    return false; // No async response needed
  }
  
  // For async operations, send immediate acknowledgment
  if (message.type === "clip" || message.type === "download" || message.type === "processMarkdown") {
    // Send immediate acknowledgment
    sendResponse(true);
    
    // Process asynchronously without blocking response channel
    (async () => {
      try {
        await notify(message);
      } catch (error) {
        console.error("❌ Error in async processing:", error);
        // Send error via separate message
        try {
          await browser.runtime.sendMessage({ 
            type: "display.md", 
            error: error?.message || error || 'Unknown error'
          });
        } catch (sendError) {
          console.error("❌ Failed to send async error message to popup:", sendError);
        }
      }
    })();
    
    return false; // Response already sent
  }
  
  // Handle other message types synchronously
  (async () => {
    try {
      let result;
      if (message.type === "getOptions") {
        result = await getOptions();
      } else if (message.type === "setOptions") {
        await browser.storage.sync.set(message.options);
        result = true;
      } else if (message.type === "preDownloadImages") {
        result = await preDownloadImages(message.imageList, message.options);
      } else {
        result = false;
      }
      sendResponse(result);
    } catch (error) {
      sendResponse({ error: error.message });
    }
  })();
  
  return true; // Keep channel open for async response
});

// Initialize context menus when service worker starts
if (typeof browser !== 'undefined') {
  try {
    browser.runtime.onStartup.addListener(async () => {
      try {
        if (typeof createMenus === 'function') {
          await createMenus();
          console.log("📋 Context menus recreated on startup");
        }
      } catch (error) {
        console.error("❌ Failed to create menus on startup:", error);
      }
    });

    browser.runtime.onInstalled.addListener(async () => {
      try {
        if (typeof createMenus === 'function') {
          await createMenus();
          console.log("📋 Context menus created on install");
        }
      } catch (error) {
        console.error("❌ Failed to create menus on install:", error);
      }
    });

    console.log("✅ Runtime event listeners registered");
  } catch (error) {
    console.error("❌ Failed to register runtime event listeners:", error);
  }
} else {
  console.error("❌ Browser API not available - cannot register runtime listeners");
}

// Log platform information
console.log("MarkDownload Service Worker started on:", navigator.platform);