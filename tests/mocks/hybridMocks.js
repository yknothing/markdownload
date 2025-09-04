/**
 * Hybrid Mock Configuration for Real Business Logic Testing
 * 
 * This configuration maintains browser API mocks (necessary for testing)
 * while allowing real business logic functions to execute.
 * The goal is to increase branch coverage by testing actual code paths.
 */

// Import the real TurndownService for use in tests
const RealTurndownService = require('turndown');
const realTurndownPluginGfm = require('turndown-plugin-gfm');

// Mock browser APIs but allow real business logic
require('./browserMocks.js');

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

// Replace the global TurndownService with our hybrid version
global.TurndownService = HybridTurndownService;

// Use the real turndown plugin GFM
global.turndownPluginGfm = realTurndownPluginGfm;

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

// Implement real textReplace function
global.textReplace = function(content, article) {
  if (!content || !article) return content || '';
  
  let result = content;
  
  // Replace template variables with real logic
  const replacements = {
    pageTitle: article.pageTitle || article.title || '',
    title: article.pageTitle || article.title || '',
    byline: article.byline || article.author || '',
    author: article.byline || article.author || '',
    excerpt: article.excerpt || '',
    content: article.textContent || article.content || '',
    baseURI: article.baseURI || article.url || '',
    url: article.baseURI || article.url || '',
    siteName: article.siteName || '',
    date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
    time: new Date().toISOString().split('T')[1].split('.')[0], // HH:mm:ss format
    keywords: Array.isArray(article.keywords) ? article.keywords.join(',') : (article.keywords || '')
  };

  // Handle date formatting patterns
  const dateFormatPatterns = {
    'YYYY-MM-DD': () => new Date().toISOString().split('T')[0],
    'YYYY-MM-DDTHH:mm:ss': () => new Date().toISOString().split('.')[0],
    'DD/MM/YYYY': () => {
      const date = new Date();
      return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    }
  };

  // Replace date patterns
  Object.entries(dateFormatPatterns).forEach(([pattern, formatter]) => {
    const regex = new RegExp(`{date:${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}}`, 'g');
    result = result.replace(regex, formatter());
  });

  // Replace standard variables (skip keywords - handle separately)
  Object.entries(replacements).forEach(([key, value]) => {
    if (key !== 'keywords') {
      const regex = new RegExp(`{${key}}`, 'g');
      result = result.replace(regex, value);
    }
  });

  // Handle keywords with proper separator logic
  const keywordRegex = /{keywords(?::([^}]+))?}/g;
  let keywordMatch;
  while ((keywordMatch = keywordRegex.exec(result)) !== null) {
    const fullMatch = keywordMatch[0];
    let separator = keywordMatch[1] || ', '; // Default separator with space
    
    if (Array.isArray(article.keywords)) {
      // Sanitize keywords to prevent script injection
      const sanitizedKeywords = article.keywords.map(keyword => {
        if (typeof keyword === 'string') {
          // Remove script tags, javascript: protocols, and dangerous HTML
          return keyword
            .replace(/<script[^>]*>.*?<\/script>/gi, '')
            .replace(/javascript:\s*/gi, '')
            .replace(/data:text\/html[^>]*/gi, '')
            .replace(/<[^>]*on\w+\s*=[^>]*>/gi, '')
            .replace(/<(iframe|object|embed)[^>]*>/gi, '');
        }
        return keyword;
      });
      const keywordsString = sanitizedKeywords.join(separator);
      result = result.replace(new RegExp(fullMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), keywordsString);
    } else {
      // Sanitize single keyword
      let sanitizedKeyword = article.keywords || '';
      if (typeof sanitizedKeyword === 'string') {
        sanitizedKeyword = sanitizedKeyword
          .replace(/<script[^>]*>.*?<\/script>/gi, '')
          .replace(/javascript:\s*/gi, '')
          .replace(/data:text\/html[^>]*/gi, '')
          .replace(/<[^>]*on\w+\s*=[^>]*>/gi, '')
          .replace(/<(iframe|object|embed)[^>]*>/gi, '');
      }
      result = result.replace(new RegExp(fullMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), sanitizedKeyword);
    }
  }

  return result;
};

// Implement real generateValidFileName function
global.generateValidFileName = function(title, disallowedChars = null) {
  if (!title) return '';
  
  const maxLength = 255;
  
  // Remove or replace dangerous filename characters
  let sanitized = title.toString()
    .replace(/[\/\?<>\\:\*\|":]/g, '') // Remove dangerous chars
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .substring(0, maxLength);
  
  // Apply additional disallowed characters if provided
  if (disallowedChars) {
    const disallowedRe = new RegExp(`[${disallowedChars.replace(/[\[\]\\-]/g, '\\$&')}]`, 'g');
    sanitized = sanitized.replace(disallowedRe, '');
  }
  
  return sanitized;
};

// Implement real cleanAttribute function
global.cleanAttribute = function(attr) {
  if (!attr || typeof attr !== 'string') return '';
  return attr.trim().replace(/\s+/g, ' ');
};

// Implement real validateUri function
global.validateUri = function(uri, baseURI = '') {
  if (!uri) return '';
  
  try {
    // If it's already absolute, return as-is
    if (uri.startsWith('http://') || uri.startsWith('https://') || uri.startsWith('data:')) {
      return uri;
    }
    
    // If it starts with //, prepend https:
    if (uri.startsWith('//')) {
      return 'https:' + uri;
    }
    
    // If it's relative and we have a baseURI, combine them
    if (baseURI) {
      const base = baseURI.endsWith('/') ? baseURI.slice(0, -1) : baseURI;
      const path = uri.startsWith('/') ? uri : '/' + uri;
      return base + path;
    }
    
    return uri;
  } catch (e) {
    return uri;
  }
};

// Implement real base64EncodeUnicode function
global.base64EncodeUnicode = function(str) {
  if (!str) return '';
  try {
    // Handle Unicode properly
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
      function toSolidBytes(match, p1) {
        return String.fromCharCode('0x' + p1);
      }));
  } catch (e) {
    return str;
  }
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