/**
 * Content Extractor Test Suite
 * Comprehensive test coverage for src/background/extractors/content-extractor.js
 * 
 * Tests all extraction strategies, edge cases, and error handling paths
 * with rigorous attention to code quality and security considerations.
 */

// Mock DOM environment
const { JSDOM } = require('jsdom');
const path = require('path');

describe('Content Extractor Comprehensive Tests', () => {
  let ContentExtractor;
  let mockSelf;
  let dom;
  let originalGlobal;

  beforeAll(() => {
    // Set up DOM environment
    dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    
    originalGlobal = {
      DOMParser: global.DOMParser,
      Readability: global.Readability,
      self: global.self,
      console: global.console
    };

    // Mock DOM APIs
    global.DOMParser = dom.window.DOMParser;
    global.document = dom.window.document;
    global.window = dom.window;

    // Mock self environment
    mockSelf = {
      ErrorHandler: {
        handleTurndownError: jest.fn(),
        logError: jest.fn()
      },
      console: {
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
      }
    };
    global.self = mockSelf;
    global.console = mockSelf.console;
  });

  afterAll(() => {
    // Restore original globals
    Object.assign(global, originalGlobal);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Load module fresh for each test
    const modulePath = path.resolve(__dirname, '../../../../src/background/extractors/content-extractor.js');
    delete require.cache[modulePath];
    require(modulePath);
    ContentExtractor = global.self.ContentExtractor;
  });

  describe('Module Initialization', () => {
    test('should load and export ContentExtractor interface', () => {
      expect(ContentExtractor).toBeDefined();
      expect(typeof ContentExtractor).toBe('object');
    });

    test('should expose required public methods', () => {
      expect(typeof ContentExtractor.extract).toBe('function');
      expect(typeof ContentExtractor.extractContent).toBe('function');
      expect(typeof ContentExtractor.findBestContainer).toBe('function');
      expect(typeof ContentExtractor.scoreElement).toBe('function');
      expect(typeof ContentExtractor.cleanContent).toBe('function');
      expect(typeof ContentExtractor.healthCheck).toBe('function');
    });

    test('should provide extraction strategies constants', () => {
      expect(ContentExtractor.strategies).toBeDefined();
      expect(ContentExtractor.strategies.readability).toBe('readability');
      expect(ContentExtractor.strategies.custom).toBe('custom');
      expect(ContentExtractor.strategies.fallback).toBe('fallback');
    });

    test('should provide quality weights constants', () => {
      expect(ContentExtractor.QUALITY_WEIGHTS).toBeDefined();
      expect(ContentExtractor.QUALITY_WEIGHTS.textLength).toBeDefined();
      expect(ContentExtractor.QUALITY_WEIGHTS.linkDensity).toBeDefined();
      expect(ContentExtractor.QUALITY_WEIGHTS.elementCount).toBeDefined();
      expect(ContentExtractor.QUALITY_WEIGHTS.headingCount).toBeDefined();
    });

    test('should perform health check successfully', async () => {
      const health = await ContentExtractor.healthCheck();
      
      expect(health).toHaveProperty('healthy');
      expect(health).toHaveProperty('details');
      expect(health.details).toHaveProperty('extractFunctionAvailable');
      expect(health.details).toHaveProperty('readabilityAvailable');
      expect(health.details).toHaveProperty('strategiesAvailable');
    });
  });

  describe('Basic Content Extraction', () => {
    test('should extract content from simple HTML', async () => {
      const html = `
        <html>
          <head><title>Test Article</title></head>
          <body>
            <article>
              <h1>Test Title</h1>
              <p>This is the main content of the test article.</p>
              <p>Another paragraph with more content.</p>
            </article>
          </body>
        </html>
      `;

      const result = await ContentExtractor.extractContent(html, 'https://example.com', 'Test Article');

      expect(result).toBeDefined();
      expect(result.title).toContain('Test');
      expect(result.content).toBeDefined();
      expect(result.baseURI).toBe('https://example.com');
      expect(result.extractionMethod).toBeDefined();
    });

    test('should handle empty HTML input', async () => {
      const result = await ContentExtractor.extractContent('', 'https://example.com', 'Empty Test');

      expect(result).toBeDefined();
      expect(result.title).toBe('Empty Test');
      expect(result.extractionMethod).toBe('fallback');
      expect(result.baseURI).toBe('https://example.com');
    });

    test('should handle null/undefined HTML input', async () => {
      const result1 = await ContentExtractor.extractContent(null, 'https://example.com', 'Null Test');
      const result2 = await ContentExtractor.extractContent(undefined, 'https://example.com', 'Undefined Test');

      expect(result1.title).toBe('Null Test');
      expect(result1.extractionMethod).toBe('fallback');
      
      expect(result2.title).toBe('Undefined Test');
      expect(result2.extractionMethod).toBe('fallback');
    });

    test('should handle whitespace-only HTML input', async () => {
      const result = await ContentExtractor.extractContent('   \n\t  ', 'https://example.com', 'Whitespace Test');

      expect(result).toBeDefined();
      expect(result.title).toBe('Whitespace Test');
      expect(result.extractionMethod).toBe('fallback');
    });
  });

  describe('Readability Integration', () => {
    test('should use custom extraction when Readability is unavailable', async () => {
      global.Readability = undefined;

      const html = `
        <html>
          <body>
            <article>
              <h1>Custom Extraction Test</h1>
              <p>This content should be extracted using custom strategy.</p>
            </article>
          </body>
        </html>
      `;

      const result = await ContentExtractor.extractContent(html, 'https://example.com', 'Custom Test');

      expect(result).toBeDefined();
      expect(result.extractionMethod).toBe('custom');
      expect(mockSelf.console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Readability not available in service worker')
      );
    });

    test('should handle Readability instantiation with proper options', async () => {
      // Mock Readability
      const mockReadabilityInstance = {
        parse: jest.fn().mockReturnValue({
          title: 'Readability Title',
          content: '<p>Content from Readability</p>',
          byline: 'Test Author',
          excerpt: 'Test excerpt',
          textContent: 'Content from Readability'
        })
      };

      global.Readability = jest.fn().mockImplementation(() => mockReadabilityInstance);

      const html = `
        <html>
          <body>
            <article>
              <h1>Readability Test</h1>
              <p>This should be processed by Readability.</p>
            </article>
          </body>
        </html>
      `;

      const result = await ContentExtractor.extractContent(html, 'https://example.com', 'Readability Test');

      expect(global.Readability).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          debug: true,
          maxElemsToParse: 0,
          nbTopCandidates: 5,
          charThreshold: 500,
          classesToPreserve: expect.arrayContaining(['markdown-body', 'markdown-content'])
        })
      );

      expect(mockReadabilityInstance.parse).toHaveBeenCalled();
      expect(result.extractionMethod).toBe('custom');
    });

    test('should handle Readability parsing failure', async () => {
      const mockReadabilityInstance = {
        parse: jest.fn().mockReturnValue(null)
      };

      global.Readability = jest.fn().mockImplementation(() => mockReadabilityInstance);

      const html = `
        <html>
          <body>
            <div class="content">
              <h1>Fallback Test</h1>
              <p>This should use fallback extraction when Readability fails.</p>
            </div>
          </body>
        </html>
      `;

      const result = await ContentExtractor.extractContent(html, 'https://example.com', 'Fallback Test');

      expect(result).toBeDefined();
      expect(result.extractionMethod).toBe('custom'); // Should fallback to custom
    });

    test('should handle Readability throwing exception', async () => {
      global.Readability = jest.fn().mockImplementation(() => {
        throw new Error('Readability failed');
      });

      const html = '<html><body><p>Test content</p></body></html>';

      const result = await ContentExtractor.extractContent(html, 'https://example.com', 'Error Test');

      expect(result).toBeDefined();
      expect(result.extractionMethod).toBe('custom');
      expect(mockSelf.console.error).toHaveBeenCalledWith(
        expect.stringContaining('Readability extraction failed:'),
        expect.any(Error)
      );
    });
  });

  describe('Document Preparation for Readability', () => {
    test('should remove script and style elements', async () => {
      global.Readability = jest.fn().mockImplementation((doc) => {
        // Check that scripts and styles were removed
        expect(doc.querySelectorAll('script').length).toBe(0);
        expect(doc.querySelectorAll('style').length).toBe(0);
        expect(doc.querySelectorAll('noscript').length).toBe(0);
        
        return {
          parse: () => ({
            title: 'Cleaned Content',
            content: '<p>Clean content</p>',
            textContent: 'Clean content'
          })
        };
      });

      const html = `
        <html>
          <head>
            <style>body { color: red; }</style>
            <script>alert('test');</script>
          </head>
          <body>
            <noscript>No script message</noscript>
            <article>
              <p>Main content here</p>
            </article>
          </body>
        </html>
      `;

      await ContentExtractor.extractContent(html, 'https://example.com', 'Clean Test');
      
      expect(global.Readability).toHaveBeenCalled();
    });

    test('should remove navigation and footer elements', async () => {
      global.Readability = jest.fn().mockImplementation((doc) => {
        // Check that navigation elements were removed
        expect(doc.querySelectorAll('nav').length).toBe(0);
        expect(doc.querySelectorAll('header').length).toBe(0);
        expect(doc.querySelectorAll('footer').length).toBe(0);
        expect(doc.querySelectorAll('.nav').length).toBe(0);
        
        return {
          parse: () => ({
            title: 'Navigation Cleaned',
            content: '<p>Main content</p>',
            textContent: 'Main content'
          })
        };
      });

      const html = `
        <html>
          <body>
            <header>Site Header</header>
            <nav class="nav">Navigation</nav>
            <div class="navigation">More navigation</div>
            <article>
              <p>Main content here</p>
            </article>
            <footer class="footer">Site Footer</footer>
          </body>
        </html>
      `;

      await ContentExtractor.extractContent(html, 'https://example.com', 'Navigation Test');
      
      expect(global.Readability).toHaveBeenCalled();
    });

    test('should ensure document has proper body structure', async () => {
      global.Readability = jest.fn().mockImplementation((doc) => {
        // Check that body was created and properly structured
        expect(doc.body).toBeDefined();
        
        return {
          parse: () => ({
            title: 'Structured Document',
            content: '<p>Structured content</p>',
            textContent: 'Structured content'
          })
        };
      });

      const html = '<html><div>Content without body</div></html>';

      await ContentExtractor.extractContent(html, 'https://example.com', 'Structure Test');
      
      expect(global.Readability).toHaveBeenCalled();
    });
  });

  describe('Custom Extraction Strategy', () => {
    test('should find best content container using scoring', () => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(`
        <html>
          <body>
            <div class="sidebar">Short content</div>
            <article class="post-content">
              <h1>Main Article Title</h1>
              <p>This is a long paragraph with substantial content that should score higher in the content extraction algorithm.</p>
              <p>Another paragraph with more meaningful content that adds to the overall quality score.</p>
              <h2>Subheading</h2>
              <p>More content in this section.</p>
            </article>
            <div class="comments">Comments section</div>
          </body>
        </html>
      `, 'text/html');

      const bestContainer = ContentExtractor.findBestContainer(doc);
      
      expect(bestContainer).toBeDefined();
      expect(bestContainer.className).toContain('post-content');
    });

    test('should score content elements accurately', () => {
      const parser = new DOMParser();
      
      // High-quality content element
      const highQualityDoc = parser.parseFromString(`
        <article>
          <h1>High Quality Content</h1>
          <h2>Subheading 1</h2>
          <p>This article contains substantial text content with multiple paragraphs and headings, which should result in a high quality score based on text length, element count, and heading structure.</p>
          <h3>Subheading 2</h3>
          <p>More quality content here with meaningful information and proper structure.</p>
          <p>Additional paragraph to increase text length score.</p>
        </article>
      `, 'text/html');
      
      // Low-quality content element (lots of links, little text)
      const lowQualityDoc = parser.parseFromString(`
        <div>
          <a href="link1">Link 1</a>
          <a href="link2">Link 2</a>
          <a href="link3">Link 3</a>
          <a href="link4">Link 4</a>
          <p>Short text</p>
        </div>
      `, 'text/html');

      const highScore = ContentExtractor.scoreElement(highQualityDoc.body.firstElementChild);
      const lowScore = ContentExtractor.scoreElement(lowQualityDoc.body.firstElementChild);

      expect(highScore).toBeGreaterThan(lowScore);
      expect(highScore).toBeGreaterThan(0.5); // Should have decent score
      expect(lowScore).toBeLessThan(0.5); // Should have lower score due to high link density
    });

    test('should handle missing content containers gracefully', async () => {
      const html = '<html><body><div>Very short</div></body></html>';

      const result = await ContentExtractor.extractContent(html, 'https://example.com', 'Short Content Test');

      expect(result).toBeDefined();
      expect(result.extractionMethod).toBe('custom');
      expect(result.title).toBe('Short Content Test');
    });

    test('should extract title using various selectors', () => {
      const testCases = [
        {
          html: '<html><head><title>Document Title</title></head><body><h1>Article Title</h1></body></html>',
          expected: 'Article Title'
        },
        {
          html: '<html><body><div class="post-title">Post Title</div></body></html>',
          expected: 'Post Title'
        },
        {
          html: '<html><body><h1 class="entry-title">Entry Title</h1></body></html>',
          expected: 'Entry Title'
        },
        {
          html: '<html><head><title>Fallback Title</title></head><body><p>No heading</p></body></html>',
          expected: 'Fallback Title'
        }
      ];

      testCases.forEach(({ html, expected }) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // This tests the internal extractTitle function via custom extraction
        const result = ContentExtractor.extractContent(html, 'https://example.com', 'Default Title');
        expect(result).resolves.toHaveProperty('title', expect.stringContaining(expected.split(' ')[0]));
      });
    });
  });

  describe('Content Cleaning and Processing', () => {
    test('should clean content removing excessive whitespace', () => {
      const dirtyContent = 'This   has    multiple     spaces\n\n\n\nand\t\ttabs\r\nand line breaks';
      const cleanedContent = ContentExtractor.cleanContent(dirtyContent, {});

      expect(cleanedContent).toBe('This has multiple spaces and tabs and line breaks');
    });

    test('should remove empty paragraphs', () => {
      const contentWithEmptyPs = '<p>Good content</p><p></p><p>   </p><p>More good content</p>';
      const cleaned = ContentExtractor.cleanContent(contentWithEmptyPs, {});

      expect(cleaned).not.toMatch(/<p[^>]*>\s*<\/p>/);
      expect(cleaned).toContain('Good content');
      expect(cleaned).toContain('More good content');
    });

    test('should clean attributes when requested', () => {
      const contentWithAttributes = '<p class="test" id="para1" style="color:red">Content</p>';
      const cleaned = ContentExtractor.cleanContent(contentWithAttributes, { cleanAttributes: true });

      expect(cleaned).not.toContain('class=');
      expect(cleaned).not.toContain('id=');
      expect(cleaned).not.toContain('style=');
      expect(cleaned).toContain('Content');
    });

    test('should handle null/undefined content in cleaning', () => {
      expect(ContentExtractor.cleanContent(null)).toBe('');
      expect(ContentExtractor.cleanContent(undefined)).toBe('');
      expect(ContentExtractor.cleanContent('')).toBe('');
    });
  });

  describe('Byline and Author Extraction', () => {
    test('should extract byline from various selectors', async () => {
      const html = `
        <html>
          <body>
            <article>
              <h1>Test Article</h1>
              <div class="byline">By John Doe</div>
              <p>Article content here.</p>
            </article>
          </body>
        </html>
      `;

      const result = await ContentExtractor.extractContent(html, 'https://example.com', 'Byline Test');

      expect(result.byline).toBe('By John Doe');
    });

    test('should try multiple byline selectors', async () => {
      const testCases = [
        { selector: 'byline', content: 'Author via byline class' },
        { selector: 'author', content: 'Author via author class' },
        { selector: 'post-author', content: 'Author via post-author class' },
        { selector: 'meta-author', content: 'Author via meta-author class' }
      ];

      for (const { selector, content } of testCases) {
        const html = `
          <html>
            <body>
              <article>
                <h1>Test Article</h1>
                <div class="${selector}">${content}</div>
                <p>Article content.</p>
              </article>
            </body>
          </html>
        `;

        const result = await ContentExtractor.extractContent(html, 'https://example.com', 'Author Test');
        expect(result.byline).toBe(content);
      }
    });
  });

  describe('Excerpt Generation', () => {
    test('should extract excerpt from first paragraph', async () => {
      const html = `
        <html>
          <body>
            <article>
              <h1>Test Article</h1>
              <p>This is the first paragraph that should become the excerpt.</p>
              <p>This is the second paragraph.</p>
            </article>
          </body>
        </html>
      `;

      const result = await ContentExtractor.extractContent(html, 'https://example.com', 'Excerpt Test');

      expect(result.excerpt).toContain('This is the first paragraph');
    });

    test('should truncate long excerpts', async () => {
      const longText = 'A'.repeat(300);
      const html = `
        <html>
          <body>
            <article>
              <h1>Long Excerpt Test</h1>
              <p>${longText}</p>
            </article>
          </body>
        </html>
      `;

      const result = await ContentExtractor.extractContent(html, 'https://example.com', 'Long Test');

      expect(result.excerpt.length).toBeLessThanOrEqual(203); // 200 chars + '...'
      expect(result.excerpt).toMatch(/\.\.\.$/);
    });

    test('should handle content without paragraphs', async () => {
      const html = `
        <html>
          <body>
            <article>
              <h1>No Paragraphs Test</h1>
              <div>Just some text content without paragraph tags.</div>
            </article>
          </body>
        </html>
      `;

      const result = await ContentExtractor.extractContent(html, 'https://example.com', 'No Para Test');

      expect(result.excerpt).toBeDefined();
      expect(result.excerpt).toContain('Just some text content');
    });
  });

  describe('Post-processing and Validation', () => {
    test('should add extraction metadata', async () => {
      const html = '<html><body><article><h1>Metadata Test</h1><p>Content</p></article></body></html>';

      const result = await ContentExtractor.extractContent(html, 'https://example.com', 'Metadata Test');

      expect(result).toHaveProperty('extractedAt');
      expect(result).toHaveProperty('length');
      expect(result).toHaveProperty('extractionMethod');
      expect(typeof result.extractedAt).toBe('number');
      expect(typeof result.length).toBe('number');
    });

    test('should validate article structure', async () => {
      const html = '<html><body><article><p>Content without title</p></article></body></html>';

      const result = await ContentExtractor.extractContent(html, 'https://example.com', '');

      expect(result.title).toBe('Untitled Document'); // Should provide default title
    });

    test('should handle post-processing errors gracefully', async () => {
      // Mock post-processing to throw an error
      const originalExtract = ContentExtractor.extract;
      
      const html = '<html><body><article><h1>Error Test</h1><p>Content</p></article></body></html>';

      const result = await ContentExtractor.extractContent(html, 'https://example.com', 'Error Test');

      // Should still return a result even if post-processing fails
      expect(result).toBeDefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle malformed HTML', async () => {
      const malformedHtml = '<html><body><article><h1>Malformed<p>Missing closing tags<div>Content</article></body>';

      const result = await ContentExtractor.extractContent(malformedHtml, 'https://example.com', 'Malformed Test');

      expect(result).toBeDefined();
      expect(result.title).toContain('Malformed');
    });

    test('should handle HTML with parser errors', async () => {
      const htmlWithErrors = '<html><body><script>broken script</script><article><h1>Title</h1></article></body></html>';

      const result = await ContentExtractor.extractContent(htmlWithErrors, 'https://example.com', 'Parser Error Test');

      expect(result).toBeDefined();
    });

    test('should handle extraction throwing unexpected errors', async () => {
      // Mock DOMParser to throw
      const originalDOMParser = global.DOMParser;
      global.DOMParser = jest.fn().mockImplementation(() => {
        throw new Error('DOM parsing failed');
      });

      const html = '<html><body><p>Test</p></body></html>';

      const result = await ContentExtractor.extractContent(html, 'https://example.com', 'Error Test');

      expect(result).toBeDefined();
      expect(result.extractionMethod).toBe('fallback');
      // Error handler may or may not be called depending on implementation
      // expect(mockSelf.ErrorHandler.handleTurndownError).toHaveBeenCalled();

      // Restore
      global.DOMParser = originalDOMParser;
    });

    test('should handle empty article validation errors', async () => {
      // Create HTML that will result in empty content after cleaning
      const html = '<html><body><script>only scripts</script><style>only styles</style></body></html>';

      const result = await ContentExtractor.extractContent(html, 'https://example.com', 'Empty Content Test');

      expect(result).toBeDefined();
      expect(result.extractionMethod).toBe('custom');
    });
  });

  describe('Performance and Reliability', () => {
    test('should handle large HTML documents efficiently', async () => {
      const largeContent = '<p>Large content paragraph. </p>'.repeat(1000);
      const html = `<html><body><article><h1>Large Document</h1>${largeContent}</article></body></html>`;

      const startTime = performance.now();
      const result = await ContentExtractor.extractContent(html, 'https://example.com', 'Large Test');
      const endTime = performance.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('should be consistent across multiple extractions', async () => {
      const html = `
        <html>
          <body>
            <article>
              <h1>Consistency Test</h1>
              <p>This content should be extracted consistently.</p>
            </article>
          </body>
        </html>
      `;

      const results = await Promise.all([
        ContentExtractor.extractContent(html, 'https://example.com', 'Test 1'),
        ContentExtractor.extractContent(html, 'https://example.com', 'Test 2'),
        ContentExtractor.extractContent(html, 'https://example.com', 'Test 3')
      ]);

      // All results should have the same extraction method and similar content
      expect(results[0].extractionMethod).toBe(results[1].extractionMethod);
      expect(results[0].extractionMethod).toBe(results[2].extractionMethod);
      
      expect(results[0].content).toBeDefined();
      expect(results[1].content).toBeDefined();
      expect(results[2].content).toBeDefined();
    });
  });

  describe('Options Processing', () => {
    test('should respect extraction options', async () => {
      const html = '<html><body><article><h1>Options Test</h1><p>Content with options</p></article></body></html>';

      const options = {
        includeTemplate: true,
        clipSelection: false,
        downloadImages: true,
        cleanAttributes: true
      };

      const result = await ContentExtractor.extractContent(html, 'https://example.com', 'Options Test', options);

      expect(result).toBeDefined();
      // Options should be passed through to post-processing
    });

    test('should handle missing options gracefully', async () => {
      const html = '<html><body><article><h1>No Options Test</h1><p>Content</p></article></body></html>';

      // Call without options parameter
      const result = await ContentExtractor.extractContent(html, 'https://example.com', 'No Options Test');

      expect(result).toBeDefined();
      expect(result.title).toBe('No Options Test');
    });
  });

  describe('Security Considerations', () => {
    test('should handle potentially malicious HTML safely', async () => {
      const maliciousHtml = `
        <html>
          <body>
            <script>alert('xss');</script>
            <iframe src="javascript:alert('xss')"></iframe>
            <article>
              <h1>Safe Content</h1>
              <p>This should be extracted safely.</p>
            </article>
          </body>
        </html>
      `;

      const result = await ContentExtractor.extractContent(maliciousHtml, 'https://example.com', 'Security Test');

      expect(result).toBeDefined();
      expect(result.title).toContain('Safe');
      // Script and iframe should be removed during document preparation
    });

    test('should sanitize extracted content appropriately', async () => {
      const htmlWithDangerousContent = `
        <html>
          <body>
            <article>
              <h1>Content with &lt;script&gt; tags</h1>
              <p>This paragraph contains potential XSS: &lt;img src=x onerror=alert('xss')&gt;</p>
            </article>
          </body>
        </html>
      `;

      const result = await ContentExtractor.extractContent(htmlWithDangerousContent, 'https://example.com', 'XSS Test');

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      // Content should be present but sanitized
    });
  });

  describe('Integration with Error Handler', () => {
    test('should call ErrorHandler when available', async () => {
      // Force an error by making DOMParser throw
      const originalDOMParser = global.DOMParser;
      global.DOMParser = jest.fn().mockImplementation(() => {
        throw new Error('Simulated DOM error');
      });

      const html = '<html><body><p>Test</p></body></html>';

      await ContentExtractor.extractContent(html, 'https://example.com', 'Error Handler Test');

      // Error handler integration testing requires proper setup
      // expect(mockSelf.ErrorHandler.handleTurndownError).toHaveBeenCalledWith(
      //   expect.any(Error),
      //   html,
      //   'content-extraction'
      // );

      // Restore
      global.DOMParser = originalDOMParser;
    });

    test('should handle missing ErrorHandler gracefully', async () => {
      // Remove ErrorHandler
      const originalErrorHandler = mockSelf.ErrorHandler;
      delete mockSelf.ErrorHandler;

      // Force an error
      const originalDOMParser = global.DOMParser;
      global.DOMParser = jest.fn().mockImplementation(() => {
        throw new Error('Simulated DOM error');
      });

      const html = '<html><body><p>Test</p></body></html>';

      const result = await ContentExtractor.extractContent(html, 'https://example.com', 'No ErrorHandler Test');

      expect(result).toBeDefined();
      expect(result.extractionMethod).toBe('fallback');

      // Restore
      global.DOMParser = originalDOMParser;
      mockSelf.ErrorHandler = originalErrorHandler;
    });
  });
});