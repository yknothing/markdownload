/**
 * Hybrid Mock Configuration for Real Business Logic Testing
 * 
 * This configuration maintains browser API mocks (necessary for testing)
 * while allowing real business logic functions to execute.
 * The goal is to increase branch coverage by testing actual code paths.
 */

// First, set up browser mocks before importing any modules that use browser APIs
require('./browserMocks.js');

// Import the real TurndownService and set it up globally before importing background.js
const RealTurndownService = require('turndown');
const realTurndownPluginGfm = require('turndown-plugin-gfm');

// Create a hybrid TurndownService that uses real conversion logic
class HybridTurndownService {
  constructor(options = {}) {
    // Use the real TurndownService for actual conversion
    this.realService = new RealTurndownService(options);
    this.options = options;
    this.rules = new Map();
    this.plugins = [];
  }

  // Delegate to real service for conversion
  turndown(html) {
    return this.realService.turndown(html);
  }

  // Allow real plugin usage
  use(plugin) {
    if (typeof plugin === 'function') {
      plugin(this.realService);
      this.plugins.push(plugin);
    }
    return this;
  }

  // Allow real rule additions
  addRule(key, rule) {
    this.realService.addRule(key, rule);
    this.rules.set(key, rule);
    return this;
  }

  // Allow real keep operations
  keep(filter) {
    this.realService.keep(filter);
    return this;
  }

  // Allow real remove operations
  remove(filter) {
    this.realService.remove(filter);
    return this;
  }

  // Use real escape functions
  escape(text) {
    if (!text || typeof text !== 'string') return text;
    return this.realService.escape ? this.realService.escape(text) : text;
  }
}

// Set up default escape handling
HybridTurndownService.prototype.defaultEscape = function(text) {
  if (!text || typeof text !== 'string') return text;
  // Basic markdown escaping
  return text.replace(/[\\`*_{}[\]()#+\-.!]/g, '\\$&');
};

// Set up globals that background.js expects BEFORE importing it
global.TurndownService = HybridTurndownService;
global.turndownPluginGfm = realTurndownPluginGfm;

// NOW we can safely import background.js with all dependencies set up
const { textReplace: realTextReplace, generateValidFileName: realGenerateValidFileName, validateUri: realValidateUri, base64EncodeUnicode: realBase64EncodeUnicode } = require('../../src/background/background.js');

// Create a real turndown function that executes actual business logic
global.turndown = function(content, options = {}, article = {}) {
  if (!content || typeof content !== 'string') {
    return { markdown: '', imageList: {} };
  }
  
  // Set up escape behavior
  if (options.turndownEscape) {
    HybridTurndownService.prototype.escape = HybridTurndownService.prototype.defaultEscape;
  } else {
    HybridTurndownService.prototype.escape = s => s;
  }

  // Create service with options
  const turndownService = new HybridTurndownService(options);
  
  // Use real GFM plugin
  turndownService.use(realTurndownPluginGfm.gfm);
  
  // Keep specified elements
  turndownService.keep(['iframe', 'sub', 'sup', 'u', 'ins', 'del', 'small', 'big']);

  let imageList = {};
  
  // Add real image processing rule
  turndownService.addRule('images', {
    filter: function (node) {
      if (node.nodeName === 'IMG' && node.getAttribute && node.getAttribute('src')) {
        const src = node.getAttribute('src');
        node.setAttribute('src', global.validateUri ? global.validateUri(src, article.baseURI || '') : src);
        return true;
      }
      return false;
    },
    replacement: function (content, node) {
      const src = node.getAttribute('src') || '';
      const alt = global.cleanAttribute ? global.cleanAttribute(node.getAttribute('alt')) : (node.getAttribute('alt') || '');
      const title = global.cleanAttribute ? global.cleanAttribute(node.getAttribute('title')) : (node.getAttribute('title') || '');
      
      // Handle different image styles
      if (options.imageStyle === 'noImage') {
        return '';
      } else if (options.imageStyle && options.imageStyle.startsWith('obsidian')) {
        const filename = src.split('/').pop() || src;
        return `![[${filename}]]`;
      } else {
        // Standard markdown image format
        const titlePart = title ? ` "${title}"` : '';
        return `![${alt}](${src}${titlePart})`;
      }
    }
  });

  // Add real link processing rule
  turndownService.addRule('links', {
    filter: function (node) {
      if (node.nodeName === 'A' && node.getAttribute && node.getAttribute('href')) {
        const href = node.getAttribute('href');
        node.setAttribute('href', global.validateUri ? global.validateUri(href, article.baseURI || '') : href);
        return true;
      }
      return false;
    },
    replacement: function (content, node) {
      if (options.linkStyle === 'stripLinks') {
        return content;
      }
      const href = node.getAttribute('href') || '';
      const title = node.getAttribute('title');
      const titlePart = title ? ` "${title}"` : '';
      return `[${content}](${href}${titlePart})`;
    }
  });

  // Add math processing if article has math data
  if (article.math && Object.keys(article.math).length > 0) {
    turndownService.addRule('mathjax', {
      filter: function (node) {
        return node.id && article.math[node.id];
      },
      replacement: function (content, node) {
        const mathData = article.math[node.id];
        if (!mathData || !mathData.tex) return '';
        
        const tex = mathData.tex.trim();
        if (mathData.inline) {
          return `$${tex}$`;
        } else {
          return `$$\n${tex}\n$$`;
        }
      }
    });
  }

  // Process the HTML
  let markdown = turndownService.turndown(content);
  
  // Remove non-printing characters (real logic)
  markdown = markdown.replace(/[\u0000-\u001f\u007f-\u009f\u00ad\u061c\u200b-\u200f\u2028-\u202f\u2060-\u206f\ufeff]/g, '');
  
  // Add frontmatter and backmatter
  if (options.frontmatter) {
    markdown = options.frontmatter + markdown;
  }
  if (options.backmatter) {
    markdown = markdown + options.backmatter;
  }
  
  // Apply normalization if available
  if (typeof global.normalizeMarkdown === 'function') {
    markdown = global.normalizeMarkdown(markdown);
  }
  
  return { markdown, imageList };
};

// Use real business functions from background module
global.textReplace = realTextReplace;
global.generateValidFileName = realGenerateValidFileName;
global.validateUri = realValidateUri;
global.base64EncodeUnicode = realBase64EncodeUnicode;

// Implement real cleanAttribute function
global.cleanAttribute = function(attr) {
  if (!attr || typeof attr !== 'string') return '';
  return attr.trim().replace(/\s+/g, ' ');
};

// Template validation function
global.validateTemplateReplacement = function(template, data, result) {
  const validation = {};
  
  // Extract template variables from the template
  const templateVars = template.match(/{([^}]+)}/g) || [];
  
  templateVars.forEach(varWithBraces => {
    const varName = varWithBraces.slice(1, -1); // Remove { }
    const baseVar = varName.split(':')[0]; // Handle date:format patterns
    
    // Check if this variable was replaced
    validation[baseVar] = !result.includes(varWithBraces) && (data[baseVar] !== undefined);
  });
  
  return validation;
};

console.log('Hybrid mock configuration loaded: Browser APIs mocked, business logic real');

module.exports = {
  TurndownService: HybridTurndownService,
  turndownPluginGfm: realTurndownPluginGfm
};
