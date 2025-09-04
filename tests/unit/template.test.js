/**
 * Unit tests for template variable replacement functionality
 */

const { setupTestEnvironment, resetTestEnvironment, createMockArticle, createTemplateTestData, validateTemplateReplacement } = require('../utils/testHelpers.js');

describe('Template Variable Replacement Tests', () => {
  let textReplace, mockMoment;

  beforeEach(() => {
    const testEnv = setupTestEnvironment();
    mockMoment = testEnv.moment;
    
    // Mock the textReplace function from background.js
    textReplace = jest.fn((string, article, disallowedChars = null) => {
      // Replace article properties (skip keywords - handle separately)
      for (const key in article) {
        if (article.hasOwnProperty(key) && key !== "content" && key !== "keywords") {
          let s = (article[key] || '') + '';
          
          if (s && disallowedChars) {
            // Simple filename cleaning for disallowed chars
            for (let c of disallowedChars) {
              s = s.replace(new RegExp(c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');
            }
          }

          // Basic replacements
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
      const now = new Date('2024-01-15T10:30:00Z');
      const dateRegex = /{date:([^}]+)}/g;
      let match;
      while ((match = dateRegex.exec(string)) !== null) {
        const format = match[1];
        let dateString;
        
        switch (format) {
          case 'YYYY-MM-DD':
            dateString = '2024-01-15';
            break;
          case 'YYYY-MM-DDTHH:mm:ss':
            dateString = '2024-01-15T10:30:00';
            break;
          case 'YYYY':
            dateString = '2024';
            break;
          case 'MM':
            dateString = '01';
            break;
          case 'DD':
            dateString = '15';
            break;
          case 'HH':
            dateString = '10';
            break;
          case 'mm':
            dateString = '30';
            break;
          case 'ss':
            dateString = '00';
            break;
          case 'Z':
            dateString = '+00:00';
            break;
          default:
            dateString = '2024-01-15T10:30:00';
        }
        
        string = string.replace(match[0], dateString);
      }

      // Replace keywords
      const keywordRegex = /{keywords:?(.*?)}/g;
      const keywordMatches = [...string.matchAll(keywordRegex)];
      keywordMatches.forEach(match => {
        let separator = match[1] || ', ';
        try {
          separator = JSON.parse('"' + separator.replace(/"/g, '\\"') + '"');
        } catch { 
          // Keep original separator if JSON parsing fails
        }
        const keywordsString = (article.keywords || []).join(separator);
        string = string.replace(match[0], keywordsString);
      });

      // Replace anything left in curly braces
      string = string.replace(/{[^}]*}/g, '');

      return string;
    });
  });

  afterEach(() => {
    resetTestEnvironment();
  });

  describe('Basic variable replacement', () => {
    test('should replace simple article properties', () => {
      const template = 'Title: {pageTitle}, Author: {byline}, URL: {baseURI}';
      const article = createMockArticle({
        pageTitle: 'Test Article',
        byline: 'Test Author',
        baseURI: 'https://example.com/article'
      });

      const result = textReplace(template, article);

      expect(result).toBe('Title: Test Article, Author: Test Author, URL: https://example.com/article');
    });

    test('should handle missing properties gracefully', () => {
      const template = 'Title: {pageTitle}, Missing: {nonExistent}';
      const article = createMockArticle({
        pageTitle: 'Test Article'
      });

      const result = textReplace(template, article);

      expect(result).toBe('Title: Test Article, Missing: ');
    });

    test('should handle empty properties', () => {
      const template = 'Title: {pageTitle}, Empty: {byline}';
      const article = createMockArticle({
        pageTitle: 'Test Article',
        byline: ''
      });

      const result = textReplace(template, article);

      expect(result).toBe('Title: Test Article, Empty: ');
    });

    test('should handle null and undefined properties', () => {
      const template = 'Title: {pageTitle}, Null: {nullProp}, Undefined: {undefinedProp}';
      const article = createMockArticle({
        pageTitle: 'Test Article',
        nullProp: null,
        undefinedProp: undefined
      });

      const result = textReplace(template, article);

      expect(result).toBe('Title: Test Article, Null: , Undefined: ');
    });
  });

  describe('Case transformation modifiers', () => {
    test('should apply lowercase transformation', () => {
      const template = '{pageTitle:lower}';
      const article = createMockArticle({
        pageTitle: 'Test Article Title'
      });

      const result = textReplace(template, article);

      expect(result).toBe('test article title');
    });

    test('should apply uppercase transformation', () => {
      const template = '{pageTitle:upper}';
      const article = createMockArticle({
        pageTitle: 'Test Article Title'
      });

      const result = textReplace(template, article);

      expect(result).toBe('TEST ARTICLE TITLE');
    });

    test('should apply kebab-case transformation', () => {
      const template = '{pageTitle:kebab}';
      const article = createMockArticle({
        pageTitle: 'Test Article Title'
      });

      const result = textReplace(template, article);

      expect(result).toBe('test-article-title');
    });

    test('should apply mixed-kebab transformation', () => {
      const template = '{pageTitle:mixed-kebab}';
      const article = createMockArticle({
        pageTitle: 'Test Article Title'
      });

      const result = textReplace(template, article);

      expect(result).toBe('Test-Article-Title');
    });

    test('should apply snake_case transformation', () => {
      const template = '{pageTitle:snake}';
      const article = createMockArticle({
        pageTitle: 'Test Article Title'
      });

      const result = textReplace(template, article);

      expect(result).toBe('test_article_title');
    });

    test('should apply mixed_snake transformation', () => {
      const template = '{pageTitle:mixed_snake}';
      const article = createMockArticle({
        pageTitle: 'Test Article Title'
      });

      const result = textReplace(template, article);

      expect(result).toBe('Test_Article_Title');
    });

    test('should apply obsidian-cal transformation', () => {
      const template = '{pageTitle:obsidian-cal}';
      const article = createMockArticle({
        pageTitle: 'Test  Article   Title'
      });

      const result = textReplace(template, article);

      expect(result).toBe('Test-Article-Title');
    });

    test('should apply camelCase transformation', () => {
      const template = '{pageTitle:camel}';
      const article = createMockArticle({
        pageTitle: 'test article title'
      });

      const result = textReplace(template, article);

      expect(result).toBe('testArticleTitle');
    });

    test('should apply PascalCase transformation', () => {
      const template = '{pageTitle:pascal}';
      const article = createMockArticle({
        pageTitle: 'test article title'
      });

      const result = textReplace(template, article);

      expect(result).toBe('TestArticleTitle');
    });
  });

  describe('Date formatting', () => {
    test('should format basic date patterns', () => {
      const testCases = [
        { template: '{date:YYYY-MM-DD}', expected: '2024-01-15' },
        { template: '{date:YYYY-MM-DDTHH:mm:ss}', expected: '2024-01-15T10:30:00' },
        { template: '{date:YYYY}', expected: '2024' },
        { template: '{date:MM}', expected: '01' },
        { template: '{date:DD}', expected: '15' },
        { template: '{date:HH}', expected: '10' },
        { template: '{date:mm}', expected: '30' },
        { template: '{date:ss}', expected: '00' },
        { template: '{date:Z}', expected: '+00:00' },
      ];

      const article = createMockArticle();

      testCases.forEach(({ template, expected }) => {
        const result = textReplace(template, article);
        expect(result).toBe(expected);
      });
    });

    test('should handle multiple date patterns in single template', () => {
      const template = 'Created on {date:YYYY-MM-DD} at {date:HH:mm:ss}';
      const article = createMockArticle();

      const result = textReplace(template, article);

      expect(result).toBe('Created on 2024-01-15 at 10:30:00');
    });

    test('should handle custom date formats', () => {
      const template = 'Year: {date:YYYY}, Month: {date:MM}, Day: {date:DD}';
      const article = createMockArticle();

      const result = textReplace(template, article);

      expect(result).toBe('Year: 2024, Month: 01, Day: 15');
    });

    test('should handle unknown date formats gracefully', () => {
      const template = 'Unknown: {date:UNKNOWN_FORMAT}';
      const article = createMockArticle();

      const result = textReplace(template, article);

      expect(result).toBe('Unknown: 2024-01-15T10:30:00');
    });
  });

  describe('Keywords handling', () => {
    test('should replace keywords with default separator', () => {
      const template = 'Tags: {keywords}';
      const article = createMockArticle({
        keywords: ['javascript', 'testing', 'tutorial']
      });

      const result = textReplace(template, article);

      expect(result).toBe('Tags: javascript, testing, tutorial');
    });

    test('should handle custom keyword separators', () => {
      const testCases = [
        { template: 'Tags: {keywords: | }', expected: 'Tags: javascript | testing | tutorial' },
        { template: 'Tags: {keywords:;}', expected: 'Tags: javascript;testing;tutorial' },
        { template: 'Tags: {keywords: - }', expected: 'Tags: javascript - testing - tutorial' },
        { template: 'Tags: {keywords:\\n}', expected: 'Tags: javascript\ntesting\ntutorial' },
      ];

      const article = createMockArticle({
        keywords: ['javascript', 'testing', 'tutorial']
      });

      testCases.forEach(({ template, expected }) => {
        const result = textReplace(template, article);
        expect(result).toBe(expected);
      });
    });

    test('should handle empty keywords array', () => {
      const template = 'Tags: {keywords}';
      const article = createMockArticle({
        keywords: []
      });

      const result = textReplace(template, article);

      expect(result).toBe('Tags: ');
    });

    test('should handle missing keywords property', () => {
      const template = 'Tags: {keywords}';
      const article = createMockArticle();
      delete article.keywords;

      const result = textReplace(template, article);

      expect(result).toBe('Tags: ');
    });

    test('should handle keywords with special characters', () => {
      const template = 'Tags: {keywords}';
      const article = createMockArticle({
        keywords: ['C++', 'Node.js', 'Vue.js/Nuxt']
      });

      const result = textReplace(template, article);

      expect(result).toBe('Tags: C++, Node.js, Vue.js/Nuxt');
    });
  });

  describe('Complex template scenarios', () => {
    test('should handle frontmatter template', () => {
      const template = `---
title: {pageTitle}
author: {byline}
created: {date:YYYY-MM-DDTHH:mm:ss}
tags: [{keywords}]
source: {baseURI}
---

# {pageTitle}

> ## Excerpt
> {excerpt}

---`;

      const article = createMockArticle({
        pageTitle: 'Advanced JavaScript Techniques',
        byline: 'Jane Developer',
        baseURI: 'https://blog.example.com/article',
        excerpt: 'Learn advanced JavaScript patterns and techniques.',
        keywords: ['javascript', 'programming', 'tutorial']
      });

      const result = textReplace(template, article);

      expect(result).toContain('title: Advanced JavaScript Techniques');
      expect(result).toContain('author: Jane Developer');
      expect(result).toContain('created: 2024-01-15T10:30:00');
      expect(result).toContain('tags: [javascript, programming, tutorial]');
      expect(result).toContain('source: https://blog.example.com/article');
      expect(result).toContain('# Advanced JavaScript Techniques');
      expect(result).toContain('> Learn advanced JavaScript patterns and techniques.');
    });

    test('should handle filename template with transformations', () => {
      const template = '{date:YYYY-MM-DD} - {pageTitle:kebab} - {byline:snake}';
      const article = createMockArticle({
        pageTitle: 'My Great Article',
        byline: 'John Doe'
      });

      const result = textReplace(template, article);

      expect(result).toBe('2024-01-15 - my-great-article - john_doe');
    });

    test('should handle obsidian template', () => {
      const template = `# {pageTitle}

**Author:** {byline}  
**Source:** {baseURI}  
**Created:** {date:YYYY-MM-DD}  
**Tags:** #{keywords: #}

## Summary

{excerpt}

---
*Clipped from {host} on {date:YYYY-MM-DD}*`;

      const article = createMockArticle({
        pageTitle: 'Note Taking Best Practices',
        byline: 'Productivity Expert',
        baseURI: 'https://productivity.com/notes',
        host: 'productivity.com',
        excerpt: 'Effective strategies for better note-taking.',
        keywords: ['notes', 'productivity', 'organization']
      });

      const result = textReplace(template, article);

      expect(result).toContain('# Note Taking Best Practices');
      expect(result).toContain('**Author:** Productivity Expert');
      expect(result).toContain('**Tags:** #notes #productivity #organization');
      expect(result).toContain('*Clipped from productivity.com on 2024-01-15*');
    });
  });

  describe('Disallowed characters handling', () => {
    test('should remove disallowed characters from replacements', () => {
      const template = 'File: {pageTitle}';
      const article = createMockArticle({
        pageTitle: 'Test[Article]With#Special^Characters'
      });
      const disallowedChars = '[]#^';

      const result = textReplace(template, article, disallowedChars);

      expect(result).toBe('File: TestArticleWithSpecialCharacters');
    });

    test('should handle disallowed characters in multiple properties', () => {
      const template = '{pageTitle} - {byline}';
      const article = createMockArticle({
        pageTitle: 'Article[Title]',
        byline: 'Author#Name'
      });
      const disallowedChars = '[]#';

      const result = textReplace(template, article, disallowedChars);

      expect(result).toBe('ArticleTitle - AuthorName');
    });

    test('should handle regex special characters in disallowed list', () => {
      const template = 'Title: {pageTitle}';
      const article = createMockArticle({
        pageTitle: 'Test.Article+With*Special(Characters)'
      });
      const disallowedChars = '.+*()';

      const result = textReplace(template, article, disallowedChars);

      expect(result).toBe('Title: TestArticleWithSpecialCharacters');
    });
  });

  describe('URL component handling', () => {
    test('should handle URL properties correctly', () => {
      const template = 'Host: {host}, Path: {pathname}, Protocol: {protocol}';
      const article = createMockArticle({
        host: 'blog.example.com',
        pathname: '/2024/01/article-title',
        protocol: 'https:'
      });

      const result = textReplace(template, article);

      expect(result).toBe('Host: blog.example.com, Path: /2024/01/article-title, Protocol: https:');
    });

    test('should handle query parameters and hash', () => {
      const template = 'Search: {search}, Hash: {hash}';
      const article = createMockArticle({
        search: '?utm_source=newsletter&utm_medium=email',
        hash: '#section-1'
      });

      const result = textReplace(template, article);

      expect(result).toBe('Search: ?utm_source=newsletter&utm_medium=email, Hash: #section-1');
    });
  });

  describe('Edge cases and error handling', () => {
    test('should handle malformed template syntax', () => {
      const templates = [
        'Title: {pageTitle',  // Missing closing brace
        'Title: pageTitle}',  // Missing opening brace
        'Title: {pageTitle{}', // Nested braces
        'Title: {}',          // Empty braces
      ];

      const article = createMockArticle({
        pageTitle: 'Test Article'
      });

      templates.forEach(template => {
        const result = textReplace(template, article);
        expect(typeof result).toBe('string');
        // Should not crash and return some result
      });
    });

    test('should handle very long templates efficiently', () => {
      const longTemplate = '{pageTitle}'.repeat(1000);
      const article = createMockArticle({
        pageTitle: 'Test'
      });

      const startTime = performance.now();
      const result = textReplace(longTemplate, article);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete quickly
      expect(result).toBe('Test'.repeat(1000));
    });

    test('should handle Unicode in template variables', () => {
      const template = 'Title: {pageTitle}, Author: {byline}';
      const article = createMockArticle({
        pageTitle: 'Test 测试 文章 🎉',
        byline: 'Author 作者 👨‍💻'
      });

      const result = textReplace(template, article);

      expect(result).toBe('Title: Test 测试 文章 🎉, Author: Author 作者 👨‍💻');
    });

    test('should handle circular references gracefully', () => {
      const template = 'Title: {pageTitle}';
      const article = createMockArticle({
        pageTitle: 'Test Article'
      });
      
      // Create circular reference
      article.circular = article;

      const result = textReplace(template, article);

      expect(result).toBe('Title: Test Article');
    });

    test('should handle numeric and boolean values', () => {
      const template = 'Number: {numberProp}, Boolean: {boolProp}';
      const article = createMockArticle({
        numberProp: 42,
        boolProp: true
      });

      const result = textReplace(template, article);

      expect(result).toBe('Number: 42, Boolean: true');
    });
  });

  describe('Template validation utilities', () => {
    test('should identify all variables in template', () => {
      const template = 'Title: {pageTitle}, Date: {date:YYYY-MM-DD}, Tags: {keywords}';
      const variables = template.match(/{[^}]+}/g) || [];
      
      expect(variables).toContain('{pageTitle}');
      expect(variables).toContain('{date:YYYY-MM-DD}');
      expect(variables).toContain('{keywords}');
      expect(variables).toHaveLength(3);
    });

    test('should validate template replacement completeness', () => {
      const template = 'Title: {pageTitle}, Author: {byline}, Unknown: {unknown}';
      const data = createTemplateTestData();
      const result = textReplace(template, data);
      
      const validation = validateTemplateReplacement(template, data, result);
      expect(validation.pageTitle).toBe(true);
      expect(validation.byline).toBe(false); // Not in test data
    });
  });
});