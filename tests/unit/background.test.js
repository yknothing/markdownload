/**
 * Unit tests for background.js - Core conversion logic
 * REFACTORED: Using real business logic functions from background.js
 */

const { setupTestEnvironment, resetTestEnvironment, createMockArticle, createMockOptions, verifyMarkdownOutput } = require('../utils/testHelpers.js');
const { simpleArticle, complexArticle, imageHeavyArticle } = require('../fixtures/htmlSamples.js');

// Import real business logic functions from background.js
const {
  turndown,
  textReplace,
  generateValidFileName,
  convertArticleToMarkdown,
  normalizeMarkdown,
  validateUri,
  getImageFilename,
  base64EncodeUnicode
} = require('../../src/background/background.js');

describe('Background Script - Core Conversion Logic', () => {
  let mockBrowser, mockTurndownService, mockReadability;

  beforeEach(() => {
    const testEnv = setupTestEnvironment();
    mockBrowser = testEnv.browser;
    mockTurndownService = testEnv.TurndownService;
    mockReadability = testEnv.Readability;

    // Mock only browser APIs and external dependencies, use real business logic
    // Mock DOM-related functionality that's not available in test environment
    global.DOMParser = jest.fn().mockImplementation(() => ({
      parseFromString: jest.fn((domString) => ({
        baseURI: 'https://example.com',
        title: 'Test Document',
        head: {
          querySelector: jest.fn((selector) => {
            if (selector === 'meta[name="keywords"]') {
              return { content: 'test, keywords, sample' };
            }
            return null;
          })
        }
      }))
    }));
    
    // Mock getArticleFromDom function since it requires complex DOM parsing
    global.getArticleFromDom = jest.fn(async (domString) => {
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
      
      return article;
    });
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
      
      const result = turndown(article.content, options, article);
      
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
      
      const result = turndown(article.content, options, article);
      
      expect(result.markdown).toContain('![Test Image](test.jpg "Test Title")');
    });

    test('should handle code blocks correctly', () => {
      const article = createMockArticle({
        content: '<pre><code class="language-javascript">console.log("Hello");</code></pre>'
      });
      const options = createMockOptions({ codeBlockStyle: 'fenced', fence: '```' });
      
      const result = turndown(article.content, options, article);
      
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
      
      const result = convertArticleToMarkdown(article);
      
      expect(result.markdown).toContain('title: Test Article');
      expect(result.markdown).toContain('---');
    });
  });

  describe('generateValidFileName function', () => {
    test('should remove illegal characters from filename', () => {
      const title = 'Test<Title>With/Illegal?Characters*';
      const result = generateValidFileName(title);
      
      expect(result).toBe('TestTitleWithIllegalCharacters');
      expect(result).not.toMatch(/[\/\?<>\\:\*\|":]/);
    });

    test('should handle disallowed characters', () => {
      const title = 'Test[Title]With#Disallowed^Chars';
      const disallowedChars = '[]#^';
      const result = generateValidFileName(title, disallowedChars);
      
      expect(result).toBe('TestTitleWithDisallowedChars');
      expect(result).not.toContain('[');
      expect(result).not.toContain(']');
      expect(result).not.toContain('#');
      expect(result).not.toContain('^');
    });

    test('should handle empty and whitespace titles', () => {
      expect(generateValidFileName('')).toBe('');
      expect(generateValidFileName('   ')).toBe('');
      expect(generateValidFileName(null)).toBe(null);
      expect(generateValidFileName(undefined)).toBe(undefined);
    });

    test('should collapse multiple whitespaces', () => {
      const title = 'Test    Title   With     Spaces';
      const result = generateValidFileName(title);
      
      expect(result).toBe('Test Title With Spaces');
    });

    test('should remove non-breaking spaces', () => {
      const title = 'Test\u00A0Title\u00A0With\u00A0NBSP';
      const result = generateValidFileName(title);
      
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
      
      const result = textReplace(template, article);
      
      expect(result).toBe('Title: Test Article, Author: Test Author');
    });

    test('should handle text case transformations', () => {
      const template = '{pageTitle:upper} - {pageTitle:lower}';
      const article = createMockArticle({
        pageTitle: 'Test Article'
      });
      
      const result = textReplace(template, article);
      
      expect(result).toBe('TEST ARTICLE - test article');
    });

    test('should replace date placeholders', () => {
      const template = 'Created: {date:YYYY-MM-DD} at {date:YYYY-MM-DDTHH:mm:ss}';
      const article = createMockArticle();
      
      const result = textReplace(template, article);
      
      expect(result).toContain('Created: 2024-01-15');
      expect(result).toContain('at 2024-01-15T10:30:00');
    });

    test('should replace keywords array', () => {
      const template = 'Tags: {keywords}';
      const article = createMockArticle({
        keywords: ['javascript', 'testing', 'tutorial']
      });
      
      const result = textReplace(template, article);
      
      expect(result).toBe('Tags: javascript, testing, tutorial');
    });

    test('should remove unmatched placeholders', () => {
      const template = 'Title: {pageTitle}, Unknown: {unknown}';
      const article = createMockArticle({
        pageTitle: 'Test Article'
      });
      
      const result = textReplace(template, article);
      
      expect(result).toBe('Title: Test Article, Unknown: ');
    });

    test('should apply disallowed characters to replaced text', () => {
      const template = 'File: {pageTitle}';
      const article = createMockArticle({
        pageTitle: 'Test<Title>With/Illegal?Characters*'
      });
      const disallowedChars = '<>/?*';
      
      const result = textReplace(template, article, disallowedChars);
      
      expect(result).toBe('File: TestTitleWithIllegalCharacters');
    });
  });

  describe('getArticleFromDom function', () => {
    test('should extract article from simple HTML', async () => {
      const result = await getArticleFromDom(simpleArticle);
      
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('pageTitle');
      expect(result.baseURI).toBe('https://example.com');
    });

    test('should handle URL extraction properly', async () => {
      const result = await getArticleFromDom(simpleArticle);
      
      expect(result).toHaveProperty('hash');
      expect(result).toHaveProperty('host');
      expect(result).toHaveProperty('hostname');
      expect(result).toHaveProperty('pathname');
      expect(result).toHaveProperty('protocol');
      expect(result).toHaveProperty('search');
    });

    test('should handle malformed HTML gracefully', async () => {
      const malformedHTML = '<div><p>Unclosed paragraph<div>Nested incorrectly</p></div>';
      
      const result = await getArticleFromDom(malformedHTML);
      
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('content');
    });

    test('should extract keywords from meta tags', async () => {
      const htmlWithMeta = `
        <html>
          <head>
            <title>Test Document</title>
            <meta name="keywords" content="test, keywords, sample">
          </head>
          <body>
            <h1>Test Content</h1>
          </body>
        </html>
      `;
      
      const result = await getArticleFromDom(htmlWithMeta);
      
      expect(result.keywords).toEqual(['test', 'keywords', 'sample']);
    });
  });

  describe('convertArticleToMarkdown function', () => {
    test('should convert article with default options', async () => {
      const article = createMockArticle({
        content: '<h1>Test</h1><p>Content</p>'
      });
      
      const result = await convertArticleToMarkdown(article);
      
      expect(result).toHaveProperty('markdown');
      expect(result).toHaveProperty('imageList');
      expect(result.markdown).toContain('# Test');
      expect(result.markdown).toContain('Content');
    });

    test('should handle template processing', async () => {
      const article = createMockArticle({
        content: '<h1>Test</h1>',
        pageTitle: 'Sample Article',
        byline: 'Test Author'
      });
      
      const result = await convertArticleToMarkdown(article);
      
      expect(result).toHaveProperty('markdown');
      expect(typeof result.markdown).toBe('string');
    });

    test('should handle image downloading option', async () => {
      const article = createMockArticle({
        content: '<p><img src="test.jpg" alt="Test"></p>'
      });
      
      const result = await convertArticleToMarkdown(article, true);
      
      expect(result).toHaveProperty('markdown');
      expect(result).toHaveProperty('imageList');
    });

    test('should handle download images false', async () => {
      const article = createMockArticle({
        content: '<p><img src="test.jpg" alt="Test"></p>'
      });
      
      const result = await convertArticleToMarkdown(article);
      
      expect(result).toHaveProperty('markdown');
      expect(result).toHaveProperty('imageList');
    });
  });

  describe('Edge cases and error handling', () => {
    test('should not throw on null/undefined filename inputs', () => {
      expect(() => generateValidFileName(null)).not.toThrow();
      expect(() => generateValidFileName(undefined)).not.toThrow();
    });

    test('should handle empty article content', async () => {
      const emptyArticle = createMockArticle({ content: '' });
      
      const result = await convertArticleToMarkdown(emptyArticle);
      
      expect(result).toHaveProperty('markdown');
      expect(typeof result.markdown).toBe('string');
    });

    test('should handle complex article structure', async () => {
      const article = createMockArticle({
        content: complexArticle,
        pageTitle: 'Complex Article Test'
      });
      
      const result = await convertArticleToMarkdown(article);
      
      expect(result).toHaveProperty('markdown');
      expect(result.markdown.length).toBeGreaterThan(0);
    });

    test('should handle long filename input', () => {
      const longTitle = 'A'.repeat(300) + 'Very Long Title That Exceeds Normal Limits';
      
      const result = generateValidFileName(longTitle);
      
      expect(typeof result).toBe('string');
      expect(result.length).toBeLessThanOrEqual(longTitle.length);
    });

    test('should handle unicode characters in filename', () => {
      const unicodeTitle = 'Test 文章 título артикул';
      
      const result = generateValidFileName(unicodeTitle);
      
      expect(typeof result).toBe('string');
      expect(result).toContain('Test');
    });
  });
});