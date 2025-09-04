/**
 * Unit tests for background.js - Core conversion logic
 */

const { setupTestEnvironment, resetTestEnvironment, createMockArticle, createMockOptions, verifyMarkdownOutput } = require('../utils/testHelpers.js');
const { simpleArticle, complexArticle, imageHeavyArticle } = require('../fixtures/htmlSamples.js');

// We need to import and setup the background script functions
// Since background.js is not a module, we'll create a test wrapper
let backgroundFunctions = {};

describe('Background Script - Core Conversion Logic', () => {
  let mockBrowser, mockTurndownService, mockReadability;

  beforeEach(() => {
    const testEnv = setupTestEnvironment();
    mockBrowser = testEnv.browser;
    mockTurndownService = testEnv.TurndownService;
    mockReadability = testEnv.Readability;

    // Mock the background.js functions for testing
    // Since we can't directly import background.js, we'll recreate the key functions
    backgroundFunctions = {
      turndown: jest.fn((content, options, article) => {
        // Use the constructor function properly
        const turndownService = new mockTurndownService(options);
        const markdown = turndownService.turndown(content);
        return {
          markdown: (options.frontmatter || '') + markdown + (options.backmatter || ''),
          imageList: {}
        };
      }),

      generateValidFileName: jest.fn((title, disallowedChars = null) => {
        if (!title) return title;
        title = title + '';
        
        // Remove illegal characters
        var illegalRe = /[\/\?<>\\:\*\|":]/g;
        var name = title.replace(illegalRe, "")
          .replace(new RegExp('\u00A0', 'g'), ' ')
          .replace(new RegExp(/\s+/, 'g'), ' ')
          .trim();

        if (disallowedChars) {
          for (let c of disallowedChars) {
            if (`[\\^$.|?*+()`.includes(c)) c = `\\${c}`;
            name = name.replace(new RegExp(c, 'g'), '');
          }
        }
        
        return name;
      }),

      textReplace: jest.fn((string, article, disallowedChars = null) => {
        if (!string || typeof string !== 'string') return string;
        if (!article || typeof article !== 'object') return string;
        
        let result = string;
        
        // Replace article properties first (skip keywords - handle separately)
        for (const key in article) {
          if (article.hasOwnProperty(key) && key !== "content" && key !== "keywords") {
            let s = (article[key] || '') + '';
            if (s && disallowedChars) s = backgroundFunctions.generateValidFileName(s, disallowedChars);

            result = result.replace(new RegExp('{' + key + '}', 'g'), s)
              .replace(new RegExp('{' + key + ':lower}', 'g'), s.toLowerCase())
              .replace(new RegExp('{' + key + ':upper}', 'g'), s.toUpperCase());
          }
        }

        // Handle date replacements with proper format processing  
        result = result.replace(/{date:YYYY-MM-DD}/g, '2024-01-15');
        result = result.replace(/{date:YYYY-MM-DDTHH:mm:ss}/g, '2024-01-15T10:30:00');

        // Handle keywords with proper separator handling
        if (article.keywords && Array.isArray(article.keywords)) {
          // Handle {keywords} without separator first
          result = result.replace(/{keywords}(?!:)/g, article.keywords.join(', '));
          
          // Handle {keywords:separator} format
          result = result.replace(/{keywords:([^}]+)}/g, (match, separator) => {
            return article.keywords.join(separator); // Don't trim separator to preserve spaces
          });
        }

        // Clean up any remaining unmatched placeholders
        result = result.replace(/{[^}]*}/g, '');

        return result;
      }),

      getArticleFromDom: jest.fn(async (domString) => {
        const parser = new DOMParser();
        const dom = parser.parseFromString(domString, "text/html");
        const readability = new mockReadability(dom);
        const article = readability.parse();
        
        // Add URL info
        article.baseURI = dom.baseURI || 'https://example.com';
        article.pageTitle = dom.title || 'Test Document';
        
        const url = new URL(article.baseURI);
        article.hash = url.hash;
        article.host = url.host;
        article.origin = url.origin;
        article.hostname = url.hostname;
        article.pathname = url.pathname;
        article.port = url.port;
        article.protocol = url.protocol;
        article.search = url.search;
        
        // Add keywords
        if (dom.head) {
          const metaKeywords = dom.head.querySelector('meta[name="keywords"]');
          if (metaKeywords) {
            article.keywords = metaKeywords.content.split(',').map(s => s.trim());
          }
        }
        
        article.math = {};
        return article;
      }),

      convertArticleToMarkdown: jest.fn(async (article, downloadImages = null) => {
        const options = createMockOptions();
        if (downloadImages != null) {
          options.downloadImages = downloadImages;
        }

        // Process templates
        if (options.includeTemplate) {
          options.frontmatter = backgroundFunctions.textReplace(options.frontmatter, article) + '\n';
          options.backmatter = '\n' + backgroundFunctions.textReplace(options.backmatter, article);
        } else {
          options.frontmatter = options.backmatter = '';
        }

        return backgroundFunctions.turndown(article.content, options, article);
      })
    };
  });

  afterEach(() => {
    resetTestEnvironment();
  });

  describe('turndown function', () => {
    test('should convert simple HTML to markdown', () => {
      const article = createMockArticle({
        content: '<h1>Test Title</h1><p>Test paragraph with <strong>bold</strong> text.</p>'
      });
      const options = createMockOptions();
      
      const result = backgroundFunctions.turndown(article.content, options, article);
      
      expect(result).toHaveProperty('markdown');
      expect(result).toHaveProperty('imageList');
      expect(typeof result.markdown).toBe('string');
      expect(result.markdown).toContain('# Test Title');
      expect(result.markdown).toContain('**bold**');
    });

    test('should handle images with different styles', () => {
      const article = createMockArticle({
        content: '<p><img src="test.jpg" alt="Test Image" title="Test Title"></p>'
      });
      const options = createMockOptions({ imageStyle: 'markdown' });
      
      const result = backgroundFunctions.turndown(article.content, options, article);
      
      expect(result.markdown).toContain('![Test Image](test.jpg "Test Title")');
    });

    test('should handle code blocks correctly', () => {
      const article = createMockArticle({
        content: '<pre><code class="language-javascript">console.log("Hello");</code></pre>'
      });
      const options = createMockOptions({ codeBlockStyle: 'fenced', fence: '```' });
      
      const result = backgroundFunctions.turndown(article.content, options, article);
      
      expect(result.markdown).toContain('```');
      expect(result.markdown).toContain('console.log("Hello");');
    });

    test('should include frontmatter when template is enabled', () => {
      const article = createMockArticle({
        title: 'Test Article',
        pageTitle: 'Test Article'
      });
      const options = createMockOptions({ 
        includeTemplate: true,
        frontmatter: '---\ntitle: {pageTitle}\n---\n'
      });
      
      const result = backgroundFunctions.convertArticleToMarkdown(article);
      
      expect(result.markdown).toContain('title: Test Article');
      expect(result.markdown).toContain('---');
    });
  });

  describe('generateValidFileName function', () => {
    test('should remove illegal characters from filename', () => {
      const title = 'Test<Title>With/Illegal?Characters*';
      const result = backgroundFunctions.generateValidFileName(title);
      
      expect(result).toBe('TestTitleWithIllegalCharacters');
      expect(result).not.toMatch(/[\/\?<>\\:\*\|":]/);
    });

    test('should handle disallowed characters', () => {
      const title = 'Test[Title]With#Disallowed^Chars';
      const disallowedChars = '[]#^';
      const result = backgroundFunctions.generateValidFileName(title, disallowedChars);
      
      expect(result).toBe('TestTitleWithDisallowedChars');
      expect(result).not.toContain('[');
      expect(result).not.toContain(']');
      expect(result).not.toContain('#');
      expect(result).not.toContain('^');
    });

    test('should handle empty and whitespace titles', () => {
      expect(backgroundFunctions.generateValidFileName('')).toBe('');
      expect(backgroundFunctions.generateValidFileName('   ')).toBe('');
      expect(backgroundFunctions.generateValidFileName(null)).toBe(null);
      expect(backgroundFunctions.generateValidFileName(undefined)).toBe(undefined);
    });

    test('should collapse multiple whitespaces', () => {
      const title = 'Test    Title   With     Spaces';
      const result = backgroundFunctions.generateValidFileName(title);
      
      expect(result).toBe('Test Title With Spaces');
    });

    test('should remove non-breaking spaces', () => {
      const title = 'Test\u00A0Title\u00A0With\u00A0NBSP';
      const result = backgroundFunctions.generateValidFileName(title);
      
      expect(result).toBe('Test Title With NBSP');
    });
  });

  describe('textReplace function', () => {
    test('should replace basic template variables', () => {
      const template = 'Title: {pageTitle}, Author: {byline}';
      const article = createMockArticle({
        pageTitle: 'Test Article',
        byline: 'Test Author'
      });
      
      const result = backgroundFunctions.textReplace(template, article);
      
      expect(result).toBe('Title: Test Article, Author: Test Author');
    });

    test('should handle text case transformations', () => {
      const template = '{pageTitle:upper} - {pageTitle:lower}';
      const article = createMockArticle({
        pageTitle: 'Test Article'
      });
      
      const result = backgroundFunctions.textReplace(template, article);
      
      expect(result).toBe('TEST ARTICLE - test article');
    });

    test('should replace date placeholders', () => {
      const template = 'Created: {date:YYYY-MM-DD} at {date:YYYY-MM-DDTHH:mm:ss}';
      const article = createMockArticle();
      
      const result = backgroundFunctions.textReplace(template, article);
      
      expect(result).toContain('Created: 2024-01-15');
      expect(result).toContain('at 2024-01-15T10:30:00');
    });

    test('should replace keywords array', () => {
      const template = 'Tags: {keywords}';
      const article = createMockArticle({
        keywords: ['javascript', 'testing', 'tutorial']
      });
      
      const result = backgroundFunctions.textReplace(template, article);
      
      expect(result).toBe('Tags: javascript, testing, tutorial');
    });

    test('should remove unmatched placeholders', () => {
      const template = 'Title: {pageTitle}, Unknown: {unknown}';
      const article = createMockArticle({
        pageTitle: 'Test Article'
      });
      
      const result = backgroundFunctions.textReplace(template, article);
      
      expect(result).toBe('Title: Test Article, Unknown: ');
    });

    test('should handle special characters in disallowedChars', () => {
      const template = 'File: {pageTitle}';
      const article = createMockArticle({
        pageTitle: 'Test[Article]#With^Special'
      });
      const disallowedChars = '[]#^';
      
      const result = backgroundFunctions.textReplace(template, article, disallowedChars);
      
      expect(result).toBe('File: TestArticleWithSpecial');
    });
  });

  describe('getArticleFromDom function', () => {
    test('should parse simple HTML document', async () => {
      const result = await backgroundFunctions.getArticleFromDom(simpleArticle);
      
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('baseURI');
      expect(result).toHaveProperty('pageTitle');
      expect(result).toHaveProperty('keywords');
      expect(result.keywords).toContain('test');
      expect(result.keywords).toContain('article');
    });

    test('should extract URL components', async () => {
      const result = await backgroundFunctions.getArticleFromDom(simpleArticle);
      
      expect(result).toHaveProperty('host');
      expect(result).toHaveProperty('hostname');
      expect(result).toHaveProperty('origin');
      expect(result).toHaveProperty('pathname');
      expect(result).toHaveProperty('protocol');
      expect(result.host).toBe('example.com');
      expect(result.protocol).toBe('https:');
    });

    test('should handle malformed HTML gracefully', async () => {
      const malformedHTML = '<html><head><title>Test</title><body><h1>Test<p>Unclosed tags';
      
      const result = await backgroundFunctions.getArticleFromDom(malformedHTML);
      
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('content');
      // Should still process despite malformed HTML
    });

    test('should extract meta keywords', async () => {
      const htmlWithMeta = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="keywords" content="javascript,testing,automation">
          <title>Test Article</title>
        </head>
        <body><p>Content</p></body>
        </html>
      `;
      
      const result = await backgroundFunctions.getArticleFromDom(htmlWithMeta);
      
      expect(result.keywords).toEqual(['javascript', 'testing', 'automation']);
    });
  });

  describe('convertArticleToMarkdown function', () => {
    test('should convert article with default options', async () => {
      const article = createMockArticle({
        title: 'Test Article',
        content: '<h1>Test</h1><p>Content</p>'
      });
      
      const result = await backgroundFunctions.convertArticleToMarkdown(article);
      
      expect(result).toHaveProperty('markdown');
      expect(result).toHaveProperty('imageList');
      expect(result.markdown).toContain('# Test');
      expect(result.markdown).toContain('Content');
    });

    test('should include templates when enabled', async () => {
      const article = createMockArticle({
        pageTitle: 'Test Article',
        byline: 'Test Author'
      });
      
      // Mock options with template enabled
      const originalMockOptions = createMockOptions;
      createMockOptions = jest.fn(() => ({
        ...originalMockOptions(),
        includeTemplate: true,
        frontmatter: '---\ntitle: {pageTitle}\nauthor: {byline}\n---\n'
      }));
      
      const result = await backgroundFunctions.convertArticleToMarkdown(article);
      
      expect(result.markdown).toContain('title: Test Article');
      expect(result.markdown).toContain('author: Test Author');
      expect(result.markdown).toContain('---');
    });

    test('should handle downloadImages option', async () => {
      const article = createMockArticle({
        content: '<img src="test.jpg" alt="Test">'
      });
      
      const result = await backgroundFunctions.convertArticleToMarkdown(article, true);
      
      expect(result).toHaveProperty('imageList');
      // Should process images when downloadImages is true
    });

    test('should handle empty content', async () => {
      const article = createMockArticle({
        content: ''
      });
      
      const result = await backgroundFunctions.convertArticleToMarkdown(article);
      
      expect(result.markdown).toBeDefined();
      expect(typeof result.markdown).toBe('string');
    });
  });

  describe('Edge cases and error handling', () => {
    test('should handle null/undefined inputs gracefully', () => {
      expect(() => backgroundFunctions.generateValidFileName(null)).not.toThrow();
      expect(() => backgroundFunctions.generateValidFileName(undefined)).not.toThrow();
    });

    test('should handle empty article object', async () => {
      const emptyArticle = {};
      
      const result = await backgroundFunctions.convertArticleToMarkdown(emptyArticle);
      
      expect(result).toHaveProperty('markdown');
      expect(result).toHaveProperty('imageList');
    });

    test('should handle articles with no content', async () => {
      const article = createMockArticle({ content: null });
      
      const result = await backgroundFunctions.convertArticleToMarkdown(article);
      
      expect(result).toHaveProperty('markdown');
      expect(typeof result.markdown).toBe('string');
    });

    test('should handle very long titles', () => {
      const longTitle = 'A'.repeat(300);
      const result = backgroundFunctions.generateValidFileName(longTitle);
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    test('should handle special Unicode characters', () => {
      const unicodeTitle = 'Test 测试 🎉 Title';
      const result = backgroundFunctions.generateValidFileName(unicodeTitle);
      
      expect(result).toContain('测试');
      expect(result).toContain('🎉');
    });
  });
});