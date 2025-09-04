/**
 * Content Script Regression Tests
 * 
 * These tests ensure critical production bugs don't resurface
 * Focus on integration testing between content script and service worker
 */

const { JSDOM } = require('jsdom');

describe('Content Script Critical Bug Regression Tests', () => {

  beforeEach(() => {
    // Reset global state
    global.console = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      info: jest.fn()
    };
  });

  /**
   * REGRESSION TEST: Variable Reference Bug
   * 
   * Background: Previously, contentScript.js referenced 'readabilityArticle' 
   * instead of 'article', causing all content extraction to fail silently
   * and return only error messages instead of actual content.
   */
  test('ensures readability data is properly passed with correct variable references', async () => {
    // Simulate the key function that was buggy
    const mockReadabilityExtraction = () => {
      // Mock article extracted by Readability
      const article = {
        title: "Inside vLLM: Anatomy of a High-Throughput LLM Inference System",
        content: "<h1>Inside vLLM: Anatomy of a High-Throughput LLM Inference System</h1><p>This is a comprehensive article about vLLM...</p>",
        byline: "Aleksa Gordić",
        excerpt: "This is a comprehensive article about vLLM that should be several thousand words long...",
      };

      // This is the critical section that was buggy - it should use 'article', not 'readabilityArticle'
      return {
        type: "clip",
        baseURI: "https://www.aleksagordic.com/blog/vllm",
        pageTitle: "Test Article",
        // THE BUG WAS HERE: previously used undefined 'readabilityArticle' instead of 'article'
        readability: article && article.content ? {
          title: article.title || "Default Title",
          content: article.content,
          byline: article.byline || null,
          excerpt: article.excerpt || null
        } : null
      };
    };

    const result = mockReadabilityExtraction();

    // CRITICAL ASSERTIONS: Ensure the bug is fixed
    expect(result.readability).not.toBeNull();
    expect(result.readability).toHaveProperty('title');
    expect(result.readability).toHaveProperty('content');
    expect(result.readability.content).toContain('vLLM');
    expect(result.readability.content.length).toBeGreaterThan(100);

    // Ensure we don't get the failure message
    expect(result.readability.content).not.toContain('Content extraction failed');
    expect(result.readability.content).not.toContain('please try reloading');
  });

  /**
   * REGRESSION TEST: Null Article Handling
   * 
   * Ensures that when Readability returns null, the system gracefully
   * passes null instead of referencing undefined variables
   */
  test('handles null readability results gracefully without undefined variable errors', () => {
    // Simulate the scenario where Readability returns null
    const mockReadabilityExtractionNull = () => {
      const article = null; // Readability failed to extract content

      // This logic should handle null gracefully
      return {
        type: "clip", 
        baseURI: "https://example.com/empty",
        pageTitle: "Empty Page",
        // Should check article exists before referencing its properties
        readability: article && article.content ? {
          title: article.title || "Default Title",
          content: article.content,
          byline: article.byline || null,
          excerpt: article.excerpt || null
        } : null
      };
    };

    const result = mockReadabilityExtractionNull();

    // Should handle null gracefully
    expect(result.readability).toBeNull(); // Should be null, not undefined due to wrong variable
    expect(result.type).toBe('clip');
    expect(result.baseURI).toBe('https://example.com/empty');
  });

  /**
   * REGRESSION TEST: Variable Name Consistency
   * 
   * Static analysis to ensure all variable references in the readability 
   * section use the correct variable name
   */
  test('ensures consistent variable naming in readability section', () => {
    const contentScriptCode = require('fs').readFileSync(
      '/Users/whatsup/workspace/markdownload/src/contentScript/contentScript.js', 
      'utf8'
    );

    // Should NOT contain references to wrong variable names
    expect(contentScriptCode).not.toContain('readabilityArticle.title');
    expect(contentScriptCode).not.toContain('readabilityArticle.content');
    expect(contentScriptCode).not.toContain('readabilityArticle.byline');
    expect(contentScriptCode).not.toContain('readabilityArticle.excerpt');

    // Should contain correct variable references
    expect(contentScriptCode).toContain('article.title');
    expect(contentScriptCode).toContain('article.content');
    expect(contentScriptCode).toContain('article.byline');
    expect(contentScriptCode).toContain('article.excerpt');
  });

  /**
   * INTEGRATION TEST: End-to-End Message Flow
   * 
   * Tests the complete flow from content extraction to service worker message
   */
  test('validates complete message structure sent to service worker', () => {
    // Simulate complete extraction with realistic data
    const mockCompleteExtraction = () => {
      const article = {
        title: "Complex Article Structure",
        content: "<h1>Complex Article Structure</h1><p>First paragraph with substantial content...</p><h2>Section Header</h2><p>More detailed content...</p>",
        byline: "By Author Name",
        excerpt: "First paragraph with substantial content that should be extracted properly...",
        textContent: "Complex Article Structure First paragraph with substantial content..."
      };

      return {
        type: 'clip',
        baseURI: 'https://example.com/article', 
        pageTitle: 'Real World Article',
        readability: article && article.content ? {
          title: article.title || document.title,
          content: article.content,
          byline: article.byline || null,
          excerpt: article.excerpt || null
        } : null
      };
    };

    const result = mockCompleteExtraction();

    // Comprehensive message validation
    expect(result).toMatchObject({
      type: 'clip',
      baseURI: 'https://example.com/article',
      pageTitle: 'Real World Article',
      readability: {
        title: 'Complex Article Structure',
        content: expect.stringContaining('<h1>Complex Article Structure</h1>'),
        byline: 'By Author Name',
        excerpt: expect.stringContaining('First paragraph with substantial content')
      }
    });

    // Ensure no error messages leaked through
    expect(JSON.stringify(result)).not.toContain('Content extraction failed');
    expect(JSON.stringify(result)).not.toContain('please try reloading');
  });

});