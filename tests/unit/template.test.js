/**
 * Unit tests for template variable replacement functionality
 * REFACTORED: Using real business logic functions from background.js
 */

const { setupTestEnvironment, resetTestEnvironment, createMockArticle, createTemplateTestData, validateTemplateReplacement } = require('../utils/testHelpers.js');
const { textReplace } = require('../../src/background/background.js');

describe('Template Variable Replacement Tests', () => {
  let mockMoment;

  beforeEach(() => {
    const testEnv = setupTestEnvironment();
    mockMoment = testEnv.moment;
  });

  afterEach(() => {
    resetTestEnvironment();
  });

  describe('Basic variable replacement', () => {
    test('should replace simple article properties', () => {
      const template = 'Title: {title}, Author: {byline}';
      const article = createMockArticle({
        title: 'Test Article',
        byline: 'Test Author'
      });
      
      const result = textReplace(template, article);
      expect(result).toBe('Title: Test Article, Author: Test Author');
    });

    test('should handle missing properties gracefully', () => {
      const template = 'Title: {title}, Author: {byline}, URL: {url}';
      const article = createMockArticle({
        title: 'Test Article'
        // missing byline and url
      });
      
      const result = textReplace(template, article);
      expect(result).toContain('Title: Test Article');
      expect(result).toContain('Author:'); // Should handle missing byline gracefully
      expect(result).toContain('URL:'); // Should handle missing url gracefully
    });

    test('should handle empty template', () => {
      const template = '';
      const article = createMockArticle();
      
      const result = textReplace(template, article);
      expect(result).toBe('');
    });

    test('should handle empty article', () => {
      const template = 'Title: {title}';
      const article = {};
      
      const result = textReplace(template, article);
      expect(result).toContain('Title:'); // Should handle gracefully
    });
  });

  describe('Text transformation modifiers', () => {
    test('should apply lowercase transformation', () => {
      const template = '{title:lower}';
      const article = createMockArticle({
        title: 'Test Article Title'
      });
      
      const result = textReplace(template, article);
      expect(result).toBe('test article title');
    });

    test('should apply uppercase transformation', () => {
      const template = '{title:upper}';
      const article = createMockArticle({
        title: 'Test Article Title'
      });
      
      const result = textReplace(template, article);
      expect(result).toBe('TEST ARTICLE TITLE');
    });

    test('should apply kebab-case transformation', () => {
      const template = '{title:kebab}';
      const article = createMockArticle({
        title: 'Test Article Title'
      });
      
      const result = textReplace(template, article);
      expect(result).toBe('test-article-title');
    });

    test('should apply snake_case transformation', () => {
      const template = '{title:snake}';
      const article = createMockArticle({
        title: 'Test Article Title'
      });
      
      const result = textReplace(template, article);
      expect(result).toBe('test_article_title');
    });

    test('should apply camelCase transformation', () => {
      const template = '{title:camel}';
      const article = createMockArticle({
        title: 'test article title'
      });
      
      const result = textReplace(template, article);
      expect(result).toBe('testArticleTitle');
    });

    test('should apply PascalCase transformation', () => {
      const template = '{title:pascal}';
      const article = createMockArticle({
        title: 'test article title'
      });
      
      const result = textReplace(template, article);
      expect(result).toBe('TestArticleTitle');
    });
  });

  describe('Date replacement', () => {
    test('should replace basic date formats', () => {
      const template = 'Date: {date:YYYY-MM-DD}';
      const article = createMockArticle();
      
      const result = textReplace(template, article);
      expect(result).toMatch(/Date: \d{4}-\d{2}-\d{2}/);
    });

    test('should replace datetime formats', () => {
      const template = 'DateTime: {date:YYYY-MM-DDTHH:mm:ss}';
      const article = createMockArticle();
      
      const result = textReplace(template, article);
      expect(result).toMatch(/DateTime: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    test('should handle multiple date formats in one template', () => {
      const template = 'Year: {date:YYYY}, Full: {date:YYYY-MM-DD}';
      const article = createMockArticle();
      
      const result = textReplace(template, article);
      expect(result).toMatch(/Year: \d{4}, Full: \d{4}-\d{2}-\d{2}/);
    });
  });

  describe('Keywords replacement', () => {
    test('should replace keywords with default separator', () => {
      const template = 'Tags: {keywords}';
      const article = createMockArticle({
        keywords: ['javascript', 'testing', 'tutorial']
      });
      
      const result = textReplace(template, article);
      expect(result).toBe('Tags: javascript, testing, tutorial');
    });

    test('should replace keywords with custom separator', () => {
      const template = 'Tags: {keywords: | }';
      const article = createMockArticle({
        keywords: ['javascript', 'testing', 'tutorial']
      });
      
      const result = textReplace(template, article);
      expect(result).toBe('Tags: javascript | testing | tutorial');
    });

    test('should replace keywords with pipe separator', () => {
      const template = 'Tags: {keywords:|}';
      const article = createMockArticle({
        keywords: ['javascript', 'testing', 'tutorial']
      });
      
      const result = textReplace(template, article);
      expect(result).toBe('Tags: javascript|testing|tutorial');
    });

    test('should handle empty keywords array', () => {
      const template = 'Tags: {keywords}';
      const article = createMockArticle({
        keywords: []
      });
      
      const result = textReplace(template, article);
      expect(result).toBe('Tags: ');
    });

    test('should handle missing keywords', () => {
      const template = 'Tags: {keywords}';
      const article = createMockArticle({
        // no keywords property
      });
      
      const result = textReplace(template, article);
      expect(result).toBe('Tags: ');
    });
  });

  describe('Complex templates', () => {
    test('should handle multiple replacements in one template', () => {
      const template = '# {title:upper}\n\nBy {byline} on {date:YYYY-MM-DD}\n\nTags: {keywords}';
      const article = createMockArticle({
        title: 'Test Article',
        byline: 'Test Author',
        keywords: ['test', 'article']
      });
      
      const result = textReplace(template, article);
      expect(result).toContain('# TEST ARTICLE');
      expect(result).toContain('By Test Author');
      expect(result).toMatch(/on \d{4}-\d{2}-\d{2}/);
      expect(result).toContain('Tags: test, article');
    });

    test('should handle nested transformations', () => {
      const template = '{title:lower} and {title:upper}';
      const article = createMockArticle({
        title: 'Test Article'
      });
      
      const result = textReplace(template, article);
      expect(result).toBe('test article and TEST ARTICLE');
    });
  });

  describe('Disallowed characters handling', () => {
    test('should apply disallowed character filtering', () => {
      const template = 'File: {title}';
      const article = createMockArticle({
        title: 'Test<Article>With/Illegal*Characters'
      });
      const disallowedChars = '<>/*';
      
      const result = textReplace(template, article, disallowedChars);
      expect(result).toBe('File: TestArticleWithIllegalCharacters');
    });

    test('should apply disallowed characters to transformed text', () => {
      const template = 'File: {title:upper}';
      const article = createMockArticle({
        title: 'test<article>with/illegal*characters'
      });
      const disallowedChars = '<>/*';
      
      const result = textReplace(template, article, disallowedChars);
      expect(result).toBe('File: TESTARTICLEWITHILLEGALCHARACTERS');
    });
  });

  describe('Edge cases', () => {
    test('should handle malformed template syntax', () => {
      const template = 'Title: {title}, Malformed: {missing_close, Another: {valid}';
      const article = createMockArticle({
        title: 'Test Article',
        valid: 'Valid Value'
      });
      
      const result = textReplace(template, article);
      expect(result).toContain('Title: Test Article');
      expect(result).toContain('Another: Valid Value');
    });

    test('should handle circular or recursive patterns', () => {
      const template = '{title} - {title:lower} - {title:upper}';
      const article = createMockArticle({
        title: 'Test Article'
      });
      
      const result = textReplace(template, article);
      expect(result).toBe('Test Article - test article - TEST ARTICLE');
    });

    test('should handle special characters in article properties', () => {
      const template = 'Title: {title}';
      const article = createMockArticle({
        title: 'Test & Article "With" Special \'Characters\''
      });
      
      const result = textReplace(template, article);
      expect(result).toBe('Title: Test & Article "With" Special \'Characters\'');
    });

    test('should handle numeric article properties', () => {
      const template = 'Page: {pageNumber}, Year: {year}';
      const article = createMockArticle({
        pageNumber: 42,
        year: 2024
      });
      
      const result = textReplace(template, article);
      expect(result).toBe('Page: 42, Year: 2024');
    });

    test('should handle boolean article properties', () => {
      const template = 'Published: {published}, Draft: {isDraft}';
      const article = createMockArticle({
        published: true,
        isDraft: false
      });
      
      const result = textReplace(template, article);
      expect(result).toBe('Published: true, Draft: false');
    });
  });

  describe('Integration with template test helpers', () => {
    test('should work with createTemplateTestData helper', () => {
      const testData = createTemplateTestData();
      
      testData.forEach(({ template, article, expected }) => {
        const result = textReplace(template, article);
        if (expected) {
          expect(result).toContain(expected);
        } else {
          // At minimum, should not throw and should return a string
          expect(typeof result).toBe('string');
        }
      });
    });

    test('should pass validateTemplateReplacement checks', () => {
      const template = 'Title: {title}, Date: {date:YYYY-MM-DD}';
      const article = createMockArticle({
        title: 'Test Article'
      });
      
      const result = textReplace(template, article);
      expect(validateTemplateReplacement(result, template, article)).toBe(true);
    });
  });
});
// Coverage Sprint: Additional textReplace tests targeting uncovered branches
describe('textReplace Coverage Sprint - Advanced Edge Cases', () => {
  describe('Date Processing Edge Cases', () => {
    test('should handle invalid date formats gracefully', () => {
      const template = '{date:INVALID_FORMAT}';
      const result = textReplace(template, {});
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    test('should handle empty date format', () => {
      const template = '{date:}';
      const result = textReplace(template, {});
      expect(typeof result).toBe('string');
    });

    test('should handle multiple date placeholders with different formats', () => {
      const template = '{date:YYYY} - {date:MM} - {date:DD}';
      const result = textReplace(template, {});
      expect(result).toMatch(/^\d{4} - \d{2} - \d{2}$/);
    });
  });

  describe('Keywords Processing Advanced', () => {
    test('should handle keywords with escaped separator characters', () => {
      const article = { keywords: ['a', 'b', 'c'] };
      
      // Test quoted separators
      expect(textReplace('{keywords:" | "}', article)).toBe('a | b | c');
      expect(textReplace('{keywords:"; "}', article)).toBe('a; b; c');
    });

    test('should handle keywords with no separator specified', () => {
      const article = { keywords: ['tag1', 'tag2'] };
      expect(textReplace('{keywords}', article)).toBe('tag1, tag2');
    });

    test('should handle non-array keywords property', () => {
      const article = { keywords: 'not-an-array' };
      expect(textReplace('{keywords}', article)).toBe('');
    });

    test('should handle missing keywords property', () => {
      const article = { pageTitle: 'Test' };
      expect(textReplace('{keywords}', article)).toBe('');
    });

    test('should handle empty keywords array', () => {
      const article = { keywords: [] };
      expect(textReplace('{keywords}', article)).toBe('');
    });
  });

  describe('Fallback Logic Coverage', () => {
    test('should trigger fallback for unmatched placeholders', () => {
      const article = { pageTitle: 'Fallback Title' };
      expect(textReplace('{nonexistent}', article)).toBe('Fallback Title');
    });

    test('should trigger fallback for empty result', () => {
      expect(textReplace('', { pageTitle: 'Fallback Title' })).toBe('Fallback Title');
    });

    test('should trigger fallback for symbols-only result', () => {
      expect(textReplace('!@#$%', { pageTitle: 'Clean Title' })).toBe('Clean Title');
    });

    test('should use title when pageTitle unavailable', () => {
      expect(textReplace('', { title: 'Title Fallback' })).toBe('Title Fallback');
    });

    test('should use ultimate fallback when no titles available', () => {
      expect(textReplace('', {})).toBe('download');
    });

    test('should not trigger fallback for unmatched but alphanumeric content', () => {
      expect(textReplace('{unknown}', {})).toBe('{unknown}');
    });
  });

  describe('Escape and Unescape Logic', () => {
    test('should handle escaped placeholders correctly', () => {
      const article = { pageTitle: 'Test Page' };
      expect(textReplace('\\{pageTitle\\}', article)).toBe('{pageTitle}');
    });

    test('should handle mixed escaped and unescaped placeholders', () => {
      const article = { pageTitle: 'Page', author: 'Author' };
      const template = '\\{pageTitle\\} by {author}';
      expect(textReplace(template, article)).toBe('{pageTitle} by Author');
    });

    test('should handle multiple escaped placeholders', () => {
      const template = '\\{title\\} \\{author\\} \\{date\\}';
      expect(textReplace(template, {})).toBe('{title} {author} {date}');
    });
  });

  describe('Transform and Sanitization Coverage', () => {
    test('should apply disallowed characters filtering', () => {
      const article = { pageTitle: 'File/Name:With*Special?Chars' };
      const result = textReplace('{pageTitle}', article, '/:<>*?');
      expect(result).not.toContain('/');
      expect(result).not.toContain(':');
      expect(result).not.toContain('*');
      expect(result).not.toContain('?');
    });

    test('should skip content property during iteration', () => {
      const article = { 
        pageTitle: 'Test',
        content: 'Should be ignored',
        author: 'Author'
      };
      expect(textReplace('{content}', article)).toBe('{content}');
      expect(textReplace('{author}', article)).toBe('Author');
    });

    test('should handle properties without hasOwnProperty', () => {
      const article = Object.create({ inherited: 'value' });
      article.pageTitle = 'Own Property';
      expect(textReplace('{pageTitle}', article)).toBe('Own Property');
      expect(textReplace('{inherited}', article)).toBe('{inherited}'); // Should not process inherited
    });
  });

  describe('Domain Processing Coverage', () => {
    test('should handle invalid URLs gracefully', () => {
      const article = { baseURI: 'not-a-valid-url' };
      expect(textReplace('{domain}', article)).toBe('');
    });

    test('should handle complex URL structures', () => {
      const article = { baseURI: 'https://api.sub.example.com:8080/path?query=value' };
      expect(textReplace('{domain}', article)).toBe('api.sub.example.com');
    });

    test('should handle localhost URLs', () => {
      const article = { baseURI: 'http://localhost:3000/app' };
      expect(textReplace('{domain}', article)).toBe('localhost');
    });

    test('should handle IP addresses', () => {
      const article = { baseURI: 'http://192.168.1.100/path' };
      expect(textReplace('{domain}', article)).toBe('192.168.1.100');
    });

    test('should skip domain processing when not needed', () => {
      const template = '{pageTitle}'; // No {domain}
      const article = { pageTitle: 'Test', baseURI: 'https://example.com' };
      expect(textReplace(template, article)).toBe('Test');
    });
  });

  describe('Complex Integration Scenarios', () => {
    test('should handle templates with all placeholder types', () => {
      const article = {
        pageTitle: 'My Article',
        author: 'John Doe',
        keywords: ['js', 'testing'],
        baseURI: 'https://example.com/article'
      };
      
      const template = '{pageTitle} by {author} from {domain} - {keywords:, } on {date:YYYY-MM-DD}';
      const result = textReplace(template, article);
      
      expect(result).toContain('My Article');
      expect(result).toContain('John Doe');
      expect(result).toContain('example.com');
      expect(result).toContain('js, testing');
      expect(result).toMatch(/\d{4}-\d{2}-\d{2}/);
    });

    test('should handle very long templates efficiently', () => {
      const article = { pageTitle: 'T' };
      const longTemplate = '{pageTitle}'.repeat(100);
      const result = textReplace(longTemplate, article);
      expect(result).toBe('T'.repeat(100));
    });

    test('should handle templates with no placeholders', () => {
      expect(textReplace('Plain text', { pageTitle: 'Ignored' })).toBe('Plain text');
    });
  });

  describe('Boundary and Error Conditions', () => {
    test('should handle null/undefined template inputs', () => {
      expect(textReplace(null, { pageTitle: 'Title' })).toBe('Title');
      expect(textReplace(undefined, { pageTitle: 'Title' })).toBe('Title');
    });

    test('should handle non-string template inputs', () => {
      expect(textReplace(123, { pageTitle: 'Title' })).toBe('Title');
      expect(textReplace({}, { pageTitle: 'Title' })).toBe('Title');
      expect(textReplace([], { pageTitle: 'Title' })).toBe('Title');
    });

    test('should handle malformed JSON in separator parsing', () => {
      const article = { keywords: ['a', 'b'] };
      // This should not crash even with malformed separator
      const result = textReplace('{keywords:invalid"json}', article);
      expect(typeof result).toBe('string');
    });
  });
});
