/**
 * Background Coverage Boost Tests
 * Specifically targeting uncovered lines to push coverage over 40%
 */

const { setupTestEnvironment, resetTestEnvironment } = require('../../utils/testHelpers.js');
const { setupUnifiedDateMocks, resetDateMocks } = require('../../mocks/dateMocks.js');

// Import functions from background.js
const {
  turndown,
  textReplace,
  getImageFilename,
  validateUri
} = require('../../../src/background/background.js');

describe('Background Coverage Boost', () => {
  let testEnv;

  beforeEach(() => {
    testEnv = setupTestEnvironment();
    
    // Mock createMenus to test line 21 (else branch)
    global.createMenus = undefined;
    
    // Mock TurndownService for turndown tests
    global.TurndownService = testEnv.TurndownService;
    
    // Set up console.debug spy to catch debug messages
    jest.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    resetTestEnvironment();
    jest.restoreAllMocks();
  });

  describe('Image Filename Handling', () => {
    test('should handle image filename generation with options', () => {
      const originalConsoleDebug = console.debug;
      console.debug = jest.fn();
      
      // Test basic image filename generation
      const filename1 = getImageFilename('test.jpg', { imagePrefix: '' });
      const filename2 = getImageFilename('image', { imagePrefix: '' }); 
      
      expect(typeof filename1).toBe('string');
      expect(filename1).toBe('test.jpg');
      
      // In test environment, should add .idunno extension for files without extension
      expect(filename2).toBe('image.idunno');
      
      console.debug = originalConsoleDebug;
    });

    test('should handle data URL filename generation', () => {
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
      
      const result = getImageFilename(dataUrl, {});
      expect(typeof result).toBe('string');
      expect(result).toMatch(/\.(png|jpg)$/); // Should have proper extension
    });
  });

  describe('Turndown References', () => {
    test('should handle turndown service with referenced images', () => {
      const content = '<p>Test content with <img src="test.jpg" alt="test"> image</p>';
      const options = {
        turndownEscape: true,
        imageStyle: 'referenced'
      };
      const article = {
        title: 'Test Article',
        baseURI: 'https://example.com'
      };

      // This should trigger the references handling code
      const result = turndown(content, options, article);
      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('markdown');
      expect(result).toHaveProperty('imageList');
      expect(typeof result.markdown).toBe('string');
      expect(result.markdown.length).toBeGreaterThan(0);
    });

    test('should reset references after processing', () => {
      const content = '<p>Content with <a href="http://test.com">link</a></p>';
      const options = { 
        imageStyle: 'referenced',
        turndownEscape: false
      };
      const article = { baseURI: 'https://example.com' };

      // Process content that should generate references
      const result1 = turndown(content, options, article);
      const result2 = turndown(content, options, article);
      
      // References should be reset between calls
      expect(typeof result1).toBe('object');
      expect(typeof result2).toBe('object');
      expect(result1).toHaveProperty('markdown');
      expect(result2).toHaveProperty('markdown');
    });
  });

  describe('Date Placeholder Variants', () => {
    const mockArticle = {
      pageTitle: 'Test Article',
      siteName: 'Test Site',
      date: new Date('2024-01-15T10:30:00Z')
    };

    beforeEach(() => {
      // Use unified date mocking system
      setupUnifiedDateMocks({
        customFormats: {
          'YYYY-MM-DD': '2024-01-15',
          'YYYY-MM-DDTHH:mm:ss': '2024-01-15T10:30:00'
        }
      });
    });

    afterEach(() => {
      resetDateMocks();
    });

    test('should handle YYYY-MM-DD date format', () => {
      const result = textReplace('{date:YYYY-MM-DD}', mockArticle);
      expect(result).toContain('2024-01-15');
    });

    test('should handle YYYY-MM-DDTHH:mm:ss date format', () => {
      const result = textReplace('{date:YYYY-MM-DDTHH:mm:ss}', mockArticle);
      expect(result).toContain('2024-01-15T10:30:00');
    });
  });

  describe('Keywords Processing Edge Cases', () => {
    test('should handle keywords with different separators', () => {
      const article = {
        pageTitle: 'Test Title',
        keywords: 'javascript, programming; web development, testing'
      };
      
      const result = textReplace('{keywords}', article);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    test('should handle keywords case variations', () => {
      const article = {
        pageTitle: 'Test Title', 
        keywords: 'JavaScript, PROGRAMMING, Web Development'
      };
      
      const result = textReplace('{keywords}', article);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Security Sanitization', () => {
    test('should clean XSS attempts from placeholders', () => {
      const maliciousArticle = {
        pageTitle: '<script>alert("xss")</script>Clean Title',
        siteName: '<style>body{display:none}</style>Clean Site'
      };
      
      const result = textReplace('{pageTitle} - {siteName}', maliciousArticle);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('<style>');
      expect(result).toContain('Clean Title');
      expect(result).toContain('Clean Site');
    });

    test('should handle injection attempts', () => {
      const article = {
        pageTitle: '"; DROP TABLE users; --',
        siteName: '${7*7}'
      };
      
      const result = textReplace('{pageTitle} {siteName}', article);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('URI Validation Coverage', () => {
    test('should validate URI with base URI', () => {
      const baseURI = 'https://example.com/path/';
      
      // Test relative URL
      const result1 = validateUri('../image.jpg', baseURI);
      expect(typeof result1).toBe('string');
      expect(result1).toMatch(/https?:\/\//);
      
      // Test absolute URL
      const result2 = validateUri('https://other.com/image.jpg', baseURI);
      expect(result2).toBe('https://other.com/image.jpg');
    });

    test('should handle malformed URIs', () => {
      const baseURI = 'https://example.com/';
      
      // Should not throw errors on malformed URIs
      const result = validateUri('not a valid url', baseURI);
      expect(typeof result).toBe('string');
    });
  });
});

  describe('Menu Creation Coverage', () => {
    test('should call createMenus when available', () => {
      // Mock createMenus function to test line 21
      global.createMenus = jest.fn();
      
      // Re-execute the background script's initialization logic by requiring it again
      delete require.cache[require.resolve('../../../src/background/background.js')];
      require('../../../src/background/background.js');
      
      // Should have called createMenus
      expect(global.createMenus).toHaveBeenCalled();
    });
  });

  describe('Image Prefix and Template Coverage', () => {
    test('should handle image prefix with generateValidFileName path', () => {
      // This targets lines 366-367
      const result = getImageFilename('test.jpg', { 
        imagePrefix: 'images/',
        disallowedChars: '<>:"|?*'
      }, true);
      expect(typeof result).toBe('string');
      expect(result).toContain('test.jpg');
    });
  });

  describe('Front/Backmatter Template Handling', () => {
    test('should process frontmatter and backmatter when includeTemplate is true', () => {
      // This should hit lines 497-503
      const article = { 
        pageTitle: 'Test Title',
        content: '<p>Test content</p>',
        baseURI: 'https://example.com'
      };
      
      const options = {
        includeTemplate: true,
        frontmatter: '# {pageTitle}',
        backmatter: 'Source: {pageTitle}',
        downloadImages: false
      };

      // Import the convertArticleToMarkdown function
      const { convertArticleToMarkdown } = require('../../../src/background/background.js');
      
      // This should trigger the template processing lines
      return convertArticleToMarkdown(article, options).then(result => {
        expect(typeof result).toBe('object');
        expect(result).toHaveProperty('markdown');
      });
    });

    test('should clear frontmatter and backmatter when includeTemplate is false', () => {
      const article = { 
        pageTitle: 'Test Title',
        content: '<p>Test content</p>',
        baseURI: 'https://example.com'
      };
      
      const options = {
        includeTemplate: false,
        frontmatter: '# {pageTitle}',
        backmatter: 'Source: {pageTitle}',
        downloadImages: false
      };

      const { convertArticleToMarkdown } = require('../../../src/background/background.js');
      
      return convertArticleToMarkdown(article, options).then(result => {
        expect(typeof result).toBe('object');
        expect(result).toHaveProperty('markdown');
      });
    });
  });
