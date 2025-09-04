// Turndown Converter Module
// Handles HTML to Markdown conversion using Turndown.js

(function() {
  'use strict';

  console.log('🔧 Loading Turndown Manager module...');

  // 🚨 SECURITY: Define SecurityError class for security-related exceptions
  class SecurityError extends Error {
    constructor(message) {
      super(message);
      this.name = 'SecurityError';
      this.isSecurityError = true;
    }
  }

  // Turndown service instance
  let turndownService = null;

  // Image list for current conversion
  let currentImageList = {};

  // References for image reference style
  let imageReferences = [];

  /**
   * Convert HTML content to Markdown
   */
  async function convertToMarkdown(content, options = {}, article = {}) {
    try {
      console.log('📝 Converting HTML to Markdown...');

      // Reset state
      currentImageList = {};
      imageReferences = [];

      // Initialize Turndown service
      const service = getTurndownService(options);

      // Configure service with options
      configureTurndownService(service, options, article);

      // Convert HTML to Markdown
      let markdown = (options.frontmatter || '') + service.turndown(content) + (options.backmatter || '');

      // Clean up special characters
      markdown = cleanSpecialCharacters(markdown);

      // Add image references if needed
      if (options.imageRefStyle === 'referenced' && imageReferences.length > 0) {
        markdown += '\n\n' + imageReferences.join('\n') + '\n\n';
        imageReferences = []; // Reset for next conversion
      }

      console.log('✅ HTML to Markdown conversion completed');
      return {
        success: true,
        markdown: markdown,
        imageList: currentImageList,
        references: imageReferences
      };

    } catch (error) {
      console.error('❌ HTML to Markdown conversion failed:', error);
      if (self.ErrorHandler) {
        self.ErrorHandler.handleTurndownError(error, content, 'html-conversion');
      }
      return {
        success: false,
        error: error.message,
        markdown: '',
        imageList: {},
        references: []
      };
    }
  }

  /**
   * Get or create Turndown service instance
   */
  function getTurndownService(options) {
    if (!turndownService) {
      turndownService = new TurndownService(options);
      console.log('✅ TurndownService instance created');
    }

    // Configure escape function
    if (options.turndownEscape) {
      TurndownService.prototype.escape = TurndownService.prototype.defaultEscape;
    } else {
      TurndownService.prototype.escape = s => s;
    }

    return turndownService;
  }

  /**
   * Configure Turndown service with rules and options
   */
  function configureTurndownService(service, options, article) {
    console.log('⚙️ Configuring Turndown service...');

    // Add GFM plugin
    service.use(turndownPluginGfm.gfm);

    // Configure elements to keep
    service.keep(['iframe', 'sub', 'sup', 'u', 'ins', 'del', 'small', 'big']);

    // Add custom rules
    addImageRule(service, options, article);
    addLinkRule(service, options, article);
    addMathRule(service, options, article);
    addCodeBlockRules(service, options, article);

    console.log('✅ Turndown service configured');
  }

  /**
   * Add image processing rule
   */
  function addImageRule(service, options, article) {
    service.addRule('images', {
      filter: function (node, tdopts) {
        // Check if this is an img node with a src
        if (node.nodeName === 'IMG' && node.getAttribute('src')) {
          const src = node.getAttribute('src');

          // Validate and update src URI
          node.setAttribute('src', validateUri(src, article.baseURI));

          // Handle image downloading if enabled
          if (options.downloadImages) {
            const imageFilename = generateImageFilename(src, options);

            // Ensure unique filename
            let uniqueFilename = imageFilename;
            let counter = 1;
            while (Object.values(currentImageList).includes(uniqueFilename)) {
              const parts = imageFilename.split('.');
              if (counter === 1) {
                parts.splice(parts.length - 1, 0, counter++);
              } else {
                parts.splice(parts.length - 2, 1, counter++);
              }
              uniqueFilename = parts.join('.');
            }

            // Add to image list
            currentImageList[src] = uniqueFilename;

            // Determine local src for markdown
            const obsidianLink = options.imageStyle.startsWith('obsidian');
            const localSrc = options.imageStyle === 'obsidian-nofolder'
              ? uniqueFilename.substring(uniqueFilename.lastIndexOf('/') + 1)
              : uniqueFilename.split('/').map(s => obsidianLink ? s : encodeURI(s)).join('/');

            // Update node src for markdown generation
            if (options.imageStyle !== 'originalSource' && options.imageStyle !== 'base64') {
              node.setAttribute('src', localSrc);
            }

            // Pass filter for obsidian links or stripping
            return options.imageStyle.startsWith('obsidian') || options.imageStyle === 'noImage';
          }

          return true;
        }

        // Don't pass filter, output normal markdown link
        return false;
      },

      replacement: function (content, node, tdopts) {
        const src = node.getAttribute('src') || '';
        const alt = cleanAttribute(node.getAttribute('alt'));
        const title = cleanAttribute(node.getAttribute('title'));
        const titlePart = title ? ' "' + title + '"' : '';

        // Handle different image styles
        if (options.imageStyle === 'noImage') {
          return ''; // Strip images
        } else if (options.imageStyle.startsWith('obsidian')) {
          return `![[${src}]]`; // Obsidian style
        } else if (options.imageRefStyle === 'referenced') {
          // Referenced style
          const id = imageReferences.length + 1;
          imageReferences.push('[fig' + id + ']: ' + src + titlePart);
          return '![' + alt + '][fig' + id + ']';
        } else {
          // Inline style (default)
          return src ? '![' + alt + '](' + src + titlePart + ')' : '';
        }
      },

      references: imageReferences,

      append: function (options) {
        // This is handled in the main conversion function
        return '';
      }
    });
  }

  /**
   * Add link processing rule
   */
  function addLinkRule(service, options, article) {
    service.addRule('links', {
      filter: (node, tdopts) => {
        // Check if this is a link with href
        if (node.nodeName === 'A' && node.getAttribute('href')) {
          const href = node.getAttribute('href');

          // Validate and update href URI
          node.setAttribute('href', validateUri(href, article.baseURI));

          // Pass filter if we're stripping links
          return options.linkStyle === 'stripLinks';
        }

        return false;
      },

      // If filter passes, we're stripping links, so just return content
      replacement: (content, node, tdopts) => content
    });
  }

  /**
   * Add math processing rule
   */
  function addMathRule(service, options, article) {
    if (!article.math) return;

    service.addRule('mathjax', {
      filter(node, options) {
        return article.math && article.math.hasOwnProperty(node.id);
      },

      replacement(content, node, options) {
        const math = article.math[node.id];
        let tex = math.tex.trim().replace(/\xa0/g, '');

        if (math.inline) {
          tex = tex.replace(/\n/g, ' ');
          return `$${tex}$`;
        } else {
          return `$$\n${tex}\n$$`;
        }
      }
    });
  }

  /**
   * Add code block processing rules
   */
  function addCodeBlockRules(service, options, article) {
    // Helper function to create fenced code blocks
    function repeat(character, count) {
      return Array(count + 1).join(character);
    }

    function convertToFencedCodeBlock(node, options) {
      node.innerHTML = node.innerHTML.replace(/<br-keep><\/br-keep>/g, '<br>');
      const langMatch = node.id?.match(/code-lang-(.+)/);
      const language = langMatch?.length > 0 ? langMatch[1] : '';

      const code = node.innerText;
      const fenceChar = options.fence.charAt(0);
      let fenceSize = 3;

      // Ensure fence is long enough
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

    // Rule for fenced code blocks
    service.addRule('fencedCodeBlock', {
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

    // Rule for pre elements as code blocks
    service.addRule('pre', {
      filter: (node, tdopts) => {
        return node.nodeName === 'PRE' &&
               (!node.firstChild || node.firstChild.nodeName !== 'CODE') &&
               !node.querySelector('img');
      },
      replacement: (content, node, tdopts) => {
        return convertToFencedCodeBlock(node, tdopts);
      }
    });
  }

  /**
   * Generate filename for image
   */
  function generateImageFilename(src, options) {
    // Extract filename from URL
    const urlParts = src.split('/');
    const filename = urlParts[urlParts.length - 1];

    // Handle URLs without extensions
    if (!filename.includes('.')) {
      return filename + '.idunno'; // Will be resolved later
    }

    // Clean filename
    const cleanFilename = filename.split('?')[0].split('#')[0];

    // Apply prefix if specified
    const prefix = options.imagePrefix || '';
    return prefix + cleanFilename;
  }

  /**
   * 🚨 SECURITY: Validate and resolve URI with comprehensive security checks
   */
  function validateUri(href, baseURI) {
    try {
      if (!href || typeof href !== 'string') {
        throw new Error('Invalid href: must be a non-empty string');
      }

      // 🚨 SECURITY: Remove null bytes and control characters
      href = href.replace(/[\x00-\x1F\x7F]/g, '');

      // 🚨 SECURITY: Basic URL format validation
      const urlPattern = /^https?:\/\/[^\/\s?#]+[^\s]*$/i;
      if (!urlPattern.test(href)) {
        // Allow relative URLs for internal references
        if (!href.startsWith('#') && !href.startsWith('./') && !href.startsWith('../')) {
          throw new Error('Invalid URL format: ' + href);
        }
      }

      // 🚨 SECURITY: Check for dangerous protocols
      const dangerousProtocols = [
        'javascript:', 'vbscript:', 'data:', 'file:', 'ftp:', 'mailto:'
      ];

      const lowerHref = href.toLowerCase();
      for (const protocol of dangerousProtocols) {
        if (lowerHref.startsWith(protocol)) {
          console.warn(`🚨 SECURITY: Blocked dangerous protocol: ${protocol}`);
          throw new SecurityError(`Dangerous protocol blocked: ${protocol}`);
        }
      }

      // 🚨 SECURITY: Prevent directory traversal attacks
      if (href.includes('..') || href.includes('\\')) {
        console.warn('🚨 SECURITY: Blocked potential directory traversal:', href);
        throw new SecurityError('Directory traversal detected');
      }

      // 🚨 SECURITY: Limit URL length to prevent DoS
      if (href.length > 2048) {
        console.warn('🚨 SECURITY: URL too long, truncating');
        href = href.substring(0, 2048);
      }

      // 🚨 SECURITY: Validate domain against whitelist (if provided)
      if (baseURI) {
        try {
          const url = new URL(href, baseURI);
          const domain = url.hostname.toLowerCase();

          // 🚨 SECURITY: Block suspicious domains
          const suspiciousDomains = [
            'localhost', '127.0.0.1', '0.0.0.0',
            '10.0.0.0', '172.16.0.0', '192.168.0.0'
          ];

          if (suspiciousDomains.some(suspicious => domain.includes(suspicious))) {
            console.warn(`🚨 SECURITY: Blocked suspicious domain: ${domain}`);
            throw new SecurityError(`Suspicious domain blocked: ${domain}`);
          }

        } catch (urlError) {
          // If URL parsing fails, continue with original validation
          console.warn('⚠️ URL parsing failed, continuing with basic validation:', urlError.message);
        }
      }

      return href;

    } catch (error) {
      console.error('🚨 SECURITY: URI validation failed:', error.message);

      // 🚨 SECURITY: Return safe fallback instead of potentially dangerous href
      if (error instanceof SecurityError) {
        return '#'; // Safe anchor for blocked links
      }

      // For non-security errors, return original href but log the issue
      console.warn('⚠️ URI validation error (non-security):', error.message);
      return href;
    }
  }

  /**
   * Clean attribute value
   */
  function cleanAttribute(attribute) {
    if (!attribute) return '';
    return attribute.replace(/"/g, '&quot;').replace(/\n/g, ' ').trim();
  }

  /**
   * Clean special characters from markdown
   */
  function cleanSpecialCharacters(markdown) {
    // Strip out non-printing special characters which CodeMirror displays as red dots
    return markdown.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u00ad\u061c\u200b-\u200f\u2028\u2029\ufeff\ufff9-\ufffc]/g, '');
  }

  /**
   * Get current image list
   */
  function getImageList() {
    return { ...currentImageList };
  }

  /**
   * Clear current state
   */
  function clearState() {
    currentImageList = {};
    imageReferences = [];
    console.log('🧹 Turndown state cleared');
  }

  /**
   * Get conversion statistics
   */
  function getStats() {
    return {
      imagesProcessed: Object.keys(currentImageList).length,
      referencesGenerated: imageReferences.length,
      serviceConfigured: !!turndownService
    };
  }

  // Export module interface
  self.TurndownManager = {
    convert: convertToMarkdown,
    convertToMarkdown: convertToMarkdown, // Alias for compatibility
    getImageList: getImageList,
    clearState: clearState,
    getStats: getStats,

    // Internal functions for testing/advanced usage
    getService: getTurndownService,
    configureService: configureTurndownService,
    validateUri: validateUri // Export for testing
  };

  console.log('✅ Turndown Manager module loaded');

  // Export for Jest testing compatibility
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = self.TurndownManager;
  }

})();
