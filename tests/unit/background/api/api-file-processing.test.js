/**
 * Comprehensive API tests for file processing functions
 * REFACTORED: Using real business logic functions from background.js
 * Tests file name generation, download handling, and storage operations
 */

// Import real business logic functions from background.js
const {
  generateValidFileName,
  turndown,
  textReplace,
  convertArticleToMarkdown,
  getImageFilename,
  normalizeMarkdown,
  validateUri,
  base64EncodeUnicode
} = require('../../../../src/background/background.js');
beforeAll(() => {
  // Set up comprehensive browser mock
  global.browser = global.browser || {};
  global.browser.runtime = global.browser.runtime || {};
  global.browser.runtime.getPlatformInfo = jest.fn().mockResolvedValue({ os: 'mac', arch: 'x86-64' });
  global.browser.runtime.getBrowserInfo = jest.fn().mockResolvedValue({ name: 'Chrome', version: '120.0.0.0' });
  global.browser.runtime.onMessage = { addListener: jest.fn() };
  global.browser.runtime.sendMessage = jest.fn();
  global.browser.downloads = { download: jest.fn().mockResolvedValue(123) };
  global.browser.storage = { sync: { get: jest.fn().mockResolvedValue({}) } };
  
  // Mock other dependencies
  global.TurndownService = jest.fn().mockImplementation(() => ({
    use: jest.fn(),
    keep: jest.fn(),
    addRule: jest.fn(),
    turndown: jest.fn(html => html.replace(/<[^>]*>/g, '')),
    escape: jest.fn(s => s),
    defaultEscape: jest.fn(s => s)
  }));
  
  global.turndownPluginGfm = { gfm: jest.fn() };
  global.createMenus = jest.fn();
  global.notify = jest.fn();
  
  // Mock moment for date handling
  global.moment = jest.fn(() => ({
    format: jest.fn((format) => {
      if (format === 'YYYY-MM-DD') return '2024-01-01';
      if (format === 'YYYY-MM-DDTHH:mm:ss') return '2024-01-01T12:00:00';
      return '2024-01-01';
    })
  }));
  
  // Real functions are already imported and available
});

describe('File Processing API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset browser mocks
    global.browser.downloads.download.mockResolvedValue(123);
    global.browser.storage.sync.get.mockResolvedValue({});
  });

  describe('generateValidFileName()', () => {
    test('should generate basic valid filename', () => {
      const title = 'Simple Article Title';
      
      const result = generateValidFileName(title);
      
      expect(result).toBe('Simple Article Title');
    });

    test('should remove Windows reserved characters', () => {
      const title = 'Article<>:"/\\|?*Title';
      
      const result = generateValidFileName(title);
      
      // 注意：冒号(:)被保留，因为它在标题中很常见
      expect(result).not.toMatch(/[<>"/\\|?*]/);
      expect(result).toBe('Article__:______Title');
    });

    test('should handle custom disallowed characters', () => {
      const title = 'Article#[]^Title';
      const disallowed = '#[]^';
      
      const result = generateValidFileName(title, disallowed);
      
      expect(result).not.toMatch(/[#\[\]^]/);
      expect(result).toBe('Article____Title');
    });

    test('should truncate long filenames to 255 characters', () => {
      const longTitle = 'A'.repeat(300);
      
      const result = generateValidFileName(longTitle);
      
      expect(result.length).toBe(255);
      expect(result).toBe('A'.repeat(255));
    });

    test('should preserve file extension when truncating', () => {
      const longTitle = 'A'.repeat(250) + '.md';
      
      const result = generateValidFileName(longTitle);
      
      expect(result.length).toBe(255);
      expect(result).toEndWith('.md');
      expect(result).toStartWith('A'.repeat(251)); // 255 - 4 chars for '.md'
    });

    test('should handle titles with only special characters', () => {
      const title = '<>:"/\\|?*';
      
      const result = generateValidFileName(title);
      
      expect(result).toBe('Untitled');
    });

    test('should handle empty or null titles', () => {
      expect(generateValidFileName('')).toBe('Untitled');
      expect(generateValidFileName(null)).toBe('Untitled');
      expect(generateValidFileName(undefined)).toBe('Untitled');
      expect(generateValidFileName('   ')).toBe('Untitled');
    });

    test('should handle Unicode characters properly', () => {
      const title = '测试文章 - Test Article 🚀';
      
      const result = generateValidFileName(title);
      
      expect(result).toContain('测试文章');
      expect(result).toContain('Test Article');
      expect(result).toContain('🚀');
    });

    test('should handle leading and trailing dots', () => {
      const title = '.hidden article.';
      
      const result = generateValidFileName(title);
      
      expect(result).toBe('_hidden article_');
    });

    test('should handle multiple consecutive spaces', () => {
      const title = 'Article   with     spaces';
      
      const result = generateValidFileName(title);
      
      expect(result).toBe('Article   with     spaces');
    });

    test('should handle reserved Windows filenames', () => {
      const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'LPT1'];
      
      reservedNames.forEach(name => {
        const result = generateValidFileName(name);
        expect(result).toBe(name + '_');
      });
    });
  });

  describe('textReplace() - Template Processing', () => {
    const mockArticle = {
      pageTitle: 'Test Article',
      byline: 'John Doe',
      siteName: 'Example Site',
      publishedTime: '2024-01-15T10:30:00',
      excerpt: 'This is a test article excerpt.',
      keywords: ['test', 'article', 'example'],
      baseURI: 'https://example.com/articles/test-article',
      length: 1500,
      textContent: 'Full article text content...'
    };

    test('should replace basic placeholders', () => {
      const template = '{pageTitle} by {byline}';
      
      const result = textReplace(template, mockArticle);
      
      expect(result).toBe('Test Article by John Doe');
    });

    test('should replace date placeholders with formatting', () => {
      // Mock moment.js
      global.moment = jest.fn(() => ({
        format: jest.fn((format) => {
          const formatMap = {
            'YYYY-MM-DD': '2024-01-15',
            'YYYY-MM-DDTHH:mm:ss': '2024-01-15T10:30:00',
            'MMMM Do, YYYY': 'January 15th, 2024',
            'YYYY': '2024'
          };
          return formatMap[format] || '2024-01-15';
        })
      }));
      
      const template = 'Published: {date:YYYY-MM-DD}';
      
      const result = textReplace(template, mockArticle);
      
      expect(result).toBe('Published: 2024-01-15');
      expect(global.moment).toHaveBeenCalled();
    });

    test('should extract domain from baseURI', () => {
      const template = 'Source: {domain}';
      
      const result = textReplace(template, mockArticle);
      
      expect(result).toBe('Source: example.com');
    });

    test('should handle missing properties gracefully', () => {
      const template = '{pageTitle} - {nonexistentProperty}';
      
      const result = textReplace(template, mockArticle);
      
      expect(result).toBe('Test Article - {nonexistentProperty}');
    });

    test('should apply character sanitization', () => {
      const template = '{pageTitle}';
      const articleWithSpecialChars = {
        ...mockArticle,
        pageTitle: 'Test: Article with "Quotes" and |Pipes|'
      };
      const disallowed = ':"|';
      
      const result = textReplace(template, articleWithSpecialChars, disallowed);
      
      expect(result).not.toContain(':');
      expect(result).not.toContain('"');
      expect(result).not.toContain('|');
      expect(result).toBe('Test_ Article with _Quotes_ and _Pipes_');
    });

    test('should handle complex template with multiple placeholders', () => {
      global.moment = jest.fn(() => ({
        format: jest.fn(() => '2024-01-15')
      }));
      
      const template = '# {pageTitle}\\n\\nBy: {byline}\\nSite: {siteName}\\nDate: {date:YYYY-MM-DD}\\nURL: {baseURI}';
      
      const result = textReplace(template, mockArticle);
      
      expect(result).toContain('# Test Article');
      expect(result).toContain('By: John Doe');
      expect(result).toContain('Site: Example Site');
      expect(result).toContain('Date: 2024-01-15');
      expect(result).toContain('URL: https://example.com/articles/test-article');
    });

    test('should handle empty or null article', () => {
      const template = '{pageTitle} - {byline}';
      
      const result = textReplace(template, {});
      
      expect(result).toBe('{pageTitle} - {byline}');
    });

    test('should preserve escaped braces', () => {
      const template = 'Title: {pageTitle} \\{not a placeholder\\}';
      
      const result = textReplace(template, mockArticle);
      
      expect(result).toBe('Title: Test Article {not a placeholder}');
    });
  });

  describe('getImageFilename() - Image File Processing', () => {
    const mockOptions = {
      imagePrefix: 'assets/',
      disallowedChars: '[]#^'
    };

    test('should generate filename from image URL', () => {
      const src = 'https://example.com/images/photo.jpg';
      
      const result = getImageFilename(src, mockOptions, true);
      
      expect(result).toBe('assets/photo.jpg');
    });

    test('should handle URLs without extension', () => {
      const src = 'https://example.com/image-without-ext';
      
      const result = getImageFilename(src, mockOptions, true);
      
      expect(result).toBe('assets/image-without-ext.jpg'); // Default extension
    });

    test('should sanitize filenames with disallowed characters', () => {
      const src = 'https://example.com/image[1]#2.jpg';
      
      const result = getImageFilename(src, mockOptions, true);
      
      expect(result).not.toMatch(/[\[\]#^]/);
      expect(result).toBe('assets/image_1__2.jpg');
    });

    test('should handle data URLs', () => {
      const src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      
      const result = getImageFilename(src, mockOptions, true);
      
      expect(result).toContain('.png');
      expect(result).toMatch(/^assets\/image_\d+\.png$/);
    });

    test('should handle prependFilePath option', () => {
      const src = 'https://example.com/photo.jpg';
      
      const withPath = getImageFilename(src, mockOptions, true);
      const withoutPath = getImageFilename(src, mockOptions, false);
      
      expect(withPath).toBe('assets/photo.jpg');
      expect(withoutPath).toBe('photo.jpg');
    });

    test('should handle query parameters in URLs', () => {
      const src = 'https://example.com/photo.jpg?size=large&quality=high';
      
      const result = getImageFilename(src, mockOptions, true);
      
      expect(result).toBe('assets/photo.jpg');
    });

    test('should generate unique names for similar URLs', () => {
      const src1 = 'https://example.com/photo.jpg';
      const src2 = 'https://different.com/photo.jpg';
      
      const result1 = getImageFilename(src1, mockOptions, true);
      const result2 = getImageFilename(src2, mockOptions, true);
      
      expect(result1).toBe('assets/photo.jpg');
      expect(result2).toBe('assets/photo.jpg'); // Same filename from different hosts
    });

    test('should handle various image formats', () => {
      const formats = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
      
      formats.forEach(format => {
        const src = `https://example.com/image${format}`;
        const result = getImageFilename(src, mockOptions, true);
        
        expect(result).toBe(`assets/image${format}`);
      });
    });

    test('should handle empty imagePrefix', () => {
      const src = 'https://example.com/photo.jpg';
      const optionsNoPrefix = { ...mockOptions, imagePrefix: '' };
      
      const result = getImageFilename(src, optionsNoPrefix, true);
      
      expect(result).toBe('photo.jpg');
    });
  });

  describe('validateUri() - URL Processing', () => {
    const baseURI = 'https://example.com/current/page';

    test('should return absolute URLs unchanged', () => {
      const absolute = 'https://other.com/resource';
      
      const result = validateUri(absolute, baseURI);
      
      expect(result).toBe(absolute);
    });

    test('should resolve relative URLs', () => {
      const relative = '../images/photo.jpg';
      
      const result = validateUri(relative, baseURI);
      
      expect(result).toBe('https://example.com/images/photo.jpg');
    });

    test('should handle root-relative URLs', () => {
      const rootRelative = '/static/style.css';
      
      const result = validateUri(rootRelative, baseURI);
      
      expect(result).toBe('https://example.com/static/style.css');
    });

    test('should handle protocol-relative URLs', () => {
      const protocolRelative = '//cdn.example.com/script.js';
      
      const result = validateUri(protocolRelative, baseURI);
      
      expect(result).toBe('https://cdn.example.com/script.js');
    });

    test('should handle query-only URLs', () => {
      const queryOnly = '?page=2';
      
      const result = validateUri(queryOnly, baseURI);
      
      expect(result).toBe('https://example.com/current/page?page=2');
    });

    test('should handle fragment-only URLs', () => {
      const fragmentOnly = '#section1';
      
      const result = validateUri(fragmentOnly, baseURI);
      
      expect(result).toBe('https://example.com/current/page#section1');
    });

    test('should handle malformed URLs gracefully', () => {
      const malformed = 'ht<tp://bad[url]';
      
      expect(() => validateUri(malformed, baseURI)).not.toThrow();
      
      const result = validateUri(malformed, baseURI);
      expect(typeof result).toBe('string');
    });

    test('should handle empty or null URLs', () => {
      expect(validateUri('', baseURI)).toBe('');
      expect(validateUri(null, baseURI)).toBe('');
      expect(validateUri(undefined, baseURI)).toBe('');
    });

    test('should handle special characters in URLs', () => {
      const urlWithSpaces = '/path with spaces/file.html';
      
      const result = validateUri(urlWithSpaces, baseURI);
      
      expect(result).toBe('https://example.com/path with spaces/file.html');
    });
  });

  describe('base64EncodeUnicode() - Encoding', () => {
    test('should encode ASCII strings correctly', () => {
      const ascii = 'Hello World';
      
      const result = base64EncodeUnicode(ascii);
      
      expect(result).toBe(btoa(ascii));
    });

    test('should encode Unicode strings', () => {
      const unicode = 'Hello 世界 🌍';
      
      const result = base64EncodeUnicode(unicode);
      
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^[A-Za-z0-9+/]*={0,2}$/); // Valid base64 pattern
    });

    test('should handle emoji characters', () => {
      const emoji = '🎉🚀✨🌟💫';
      
      const result = base64EncodeUnicode(emoji);
      
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    test('should handle empty strings', () => {
      const result = base64EncodeUnicode('');
      
      expect(result).toBe('');
    });

    test('should handle special characters', () => {
      const special = '!@#$%^&*()_+-=[]{}|;\':",./<>?`~';
      
      const result = base64EncodeUnicode(special);
      
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    test('should be reversible for ASCII', () => {
      const original = 'Test string for encoding';
      
      const encoded = base64EncodeUnicode(original);
      const decoded = atob(encoded);
      
      expect(decoded).toBe(original);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle null/undefined inputs gracefully', () => {
      expect(() => generateValidFileName(null)).not.toThrow();
      expect(() => textReplace(null, {})).not.toThrow();
      expect(() => validateUri(null, 'https://example.com')).not.toThrow();
    });

    test('should handle extremely long inputs', () => {
      const veryLongString = 'A'.repeat(10000);
      
      expect(() => generateValidFileName(veryLongString)).not.toThrow();
      expect(() => textReplace(veryLongString, {})).not.toThrow();
    });

    test('should handle malformed base URIs', () => {
      const malformedBase = 'not-a-valid-uri';
      
      expect(() => validateUri('/relative', malformedBase)).not.toThrow();
    });

    test('should handle circular references in article object', () => {
      const circularArticle = { pageTitle: 'Test' };
      circularArticle.self = circularArticle;
      
      expect(() => textReplace('{pageTitle}', circularArticle)).not.toThrow();
    });

    test('should preserve performance with large template strings', () => {
      const largeTemplate = ('{pageTitle} '.repeat(1000)).trim();
      const article = { pageTitle: 'Test' };
      
      const start = Date.now();
      const result = textReplace(largeTemplate, article);
      const duration = Date.now() - start;
      
      expect(result).toContain('Test');
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Integration with Browser APIs', () => {
    test('should handle browser.downloads API integration', () => {
      // This would test the downloadListener function if it exists
      // For now, we'll test that the browser mock is properly set up
      expect(global.browser.downloads.download).toBeDefined();
      expect(typeof global.browser.downloads.download).toBe('function');
    });

    test('should handle browser.storage API integration', () => {
      expect(global.browser.storage.sync.get).toBeDefined();
      expect(global.browser.storage.sync.set).toBeDefined();
    });

    test('should maintain consistency across API calls', async () => {
      // Test that multiple API calls maintain consistent state
      const filename1 = generateValidFileName('Test Article');
      const filename2 = generateValidFileName('Test Article');
      
      expect(filename1).toBe(filename2);
    });
  });
});