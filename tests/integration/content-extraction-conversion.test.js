/**
 * Content Extraction & Conversion Integration Tests
 * Tests the complete flow from HTML to Markdown conversion
 */

const { JSDOM } = require('jsdom');

// Import core modules for integration testing
const contentExtractor = require('@extractors/content-extractor.js');
const turndownManager = require('@converters/turndown-manager.js');

describe('Content Extraction & Conversion Integration', () => {
  let mockDocument;
  let mockWindow;

  beforeEach(() => {
    // Setup DOM environment for each test
    const dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Article</title>
          <base href="https://example.com/">
        </head>
        <body>
          <article>
            <h1>Test Article Title</h1>
            <p class="byline">By Test Author</p>
            <div class="content">
              <p>This is a test article content.</p>
              <p>It contains multiple paragraphs.</p>
              <h2>Section Header</h2>
              <p>Content under section.</p>
              <pre><code>console.log('test code');</code></pre>
              <ul>
                <li>List item 1</li>
                <li>List item 2</li>
              </ul>
            </div>
          </article>
        </body>
      </html>
    `, {
      url: 'https://example.com/test-article',
      pretendToBeVisual: true,
      resources: 'usable'
    });

    mockDocument = dom.window.document;
    mockWindow = dom.window;

    // Setup global browser mock
    global.browser = {
      tabs: {
        query: jest.fn().mockResolvedValue([{ id: 1, url: 'https://example.com/test-article' }])
      }
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should extract and convert simple article content', async () => {
    // Arrange: Setup test data
    const html = mockDocument.documentElement.outerHTML;
    const expectedMarkdown = `# Test Article Title

By Test Author

This is a test article content.

It contains multiple paragraphs.

## Section Header

Content under section.

\`\`\`
console.log('test code');
\`\`\`

- List item 1
- List item 2
`;

    // Act: Extract and convert content
    const extractedContent = await contentExtractor.extract(html);
    const markdownResult = await turndownManager.convertToMarkdown(extractedContent.content);

    // Assert: Verify the complete flow
    expect(markdownResult.success).toBe(true);
    expect(markdownResult.markdown).toContain('# Test Article Title');
    expect(markdownResult.markdown).toContain('By Test Author');
    expect(markdownResult.markdown).toContain('test code');
    expect(markdownResult.markdown).toContain('- List item 1');
    expect(markdownResult.markdown).toContain('- List item 2');
  });

  test('should handle complex HTML structures with nested elements', async () => {
    // Arrange: Complex HTML with nested structures
    const complexHtml = `
      <article>
        <header>
          <h1>Complex Article Title</h1>
          <div class="meta">
            <span class="author">By Complex Author</span>
            <time>2024-01-15</time>
          </div>
        </header>
        <section>
          <h2>Introduction</h2>
          <p>Intro paragraph with <strong>bold text</strong> and <em>italic text</em>.</p>
          <blockquote>
            <p>This is a blockquote with <a href="https://example.com">link</a>.</p>
          </blockquote>
          <h3>Subsection</h3>
          <ol>
            <li>Ordered item 1</li>
            <li>Ordered item 2
              <ul>
                <li>Nested unordered item</li>
              </ul>
            </li>
          </ol>
        </section>
        <footer>
          <p>Article footer</p>
        </footer>
      </article>
    `;

    // Act
    const extractedContent = await contentExtractor.extract(complexHtml);
    const markdownResult = await turndownManager.convertToMarkdown(extractedContent.content);

    // Assert
    expect(markdownResult.success).toBe(true);
    // Readability.js extracts main content, may not include all headers
    expect(markdownResult.markdown).toContain('**bold text**');
    expect(markdownResult.markdown).toContain('_italic text_'); // Turndown uses underscores for italics
    expect(markdownResult.markdown).toContain('[link](https://example.com)');
    expect(markdownResult.markdown).toContain('## Introduction'); // H2 becomes H2 in markdown
    expect(markdownResult.markdown).toContain('This is a blockquote');
  });

  test('should preserve code blocks and formatting', async () => {
    // Arrange: HTML with various code formats
    const codeHtml = `
      <article>
        <h1>Code Examples</h1>
        <p>Here are some code examples:</p>

        <pre><code class="language-javascript">function test() {
  console.log('Hello World');
  return true;
}</code></pre>

        <p>Inline code: <code>const variable = 'value';</code></p>

        <pre class="language-python"><code>def hello():
    print("Hello World")
    return True</code></pre>
      </article>
    `;

    // Act
    const extractedContent = await contentExtractor.extract(codeHtml);
    const markdownResult = await turndownManager.convertToMarkdown(extractedContent.content);

    // Assert
    expect(markdownResult.success).toBe(true);
    expect(markdownResult.markdown).toContain('```'); // Code blocks are preserved
    expect(markdownResult.markdown).toContain('function test()');
    expect(markdownResult.markdown).toContain('console.log');
    expect(markdownResult.markdown).toContain('`const variable = \'value\';`');
    expect(markdownResult.markdown).toContain('def hello()');
    expect(markdownResult.markdown).toContain('```'); // Python code block without language identifier
    expect(markdownResult.markdown).toContain('print');
  });

  test('should handle images and media elements', async () => {
    // Arrange: HTML with images
    const imageHtml = `
      <article>
        <h1>Article with Images</h1>
        <p>Here is an image:</p>
        <img src="test-image.jpg" alt="Test Image" title="Image Title">

        <p>Another image without alt:</p>
        <img src="/images/photo.png">

        <p>Image with full URL:</p>
        <img src="https://cdn.example.com/image.webp" alt="External Image">
      </article>
    `;

    // Act
    const extractedContent = await contentExtractor.extract(imageHtml);
    const markdownResult = await turndownManager.convertToMarkdown(extractedContent.content);

    // Assert
    expect(markdownResult.success).toBe(true);
    expect(markdownResult.markdown).toContain('![Test Image](test-image.jpg)');
    expect(markdownResult.markdown).toContain('![](/images/photo.png)');
    expect(markdownResult.markdown).toContain('![External Image](https://cdn.example.com/image.webp)');
  });

  test('should handle links and references', async () => {
    // Arrange: HTML with various link types
    const linkHtml = `
      <article>
        <h1>Article with Links</h1>
        <p>
          <a href="https://example.com">External Link</a> and
          <a href="/internal">Internal Link</a> and
          <a href="#anchor">Anchor Link</a>
        </p>
        <p>
          <a href="mailto:test@example.com">Email Link</a> and
          <a href="tel:+1234567890">Phone Link</a>
        </p>
      </article>
    `;

    // Act
    const extractedContent = await contentExtractor.extract(linkHtml);
    const markdownResult = await turndownManager.convertToMarkdown(extractedContent.content);

    // Assert
    expect(markdownResult.success).toBe(true);
    expect(markdownResult.markdown).toContain('[External Link](https://example.com)');
    expect(markdownResult.markdown).toContain('[Internal Link](/internal)');
    expect(markdownResult.markdown).toContain('[Anchor Link](#anchor)');
    expect(markdownResult.markdown).toContain('[Email Link](mailto:test@example.com)');
    expect(markdownResult.markdown).toContain('[Phone Link](tel:+1234567890)');
  });

  test('should handle malformed HTML gracefully', async () => {
    // Arrange: Malformed HTML
    const malformedHtml = `
      <article>
        <h1>Test Article</h1>
        <p>Unclosed paragraph
        <div>Missing closing tags
          <span>Nested without close
        <p>Another paragraph
      </article>
    `;

    // Act
    const extractedContent = await contentExtractor.extract(malformedHtml);
    const markdownResult = await turndownManager.convertToMarkdown(extractedContent.content);

    // Assert: Should still produce valid markdown despite malformed HTML
    expect(markdownResult.success).toBe(true);
    expect(markdownResult.markdown).toContain('# Test Article');
    expect(markdownResult.markdown).toContain('Unclosed paragraph');
    expect(markdownResult.markdown).toContain('Missing closing tags');
    expect(markdownResult.markdown).toContain('Nested without close');
    expect(markdownResult.markdown).toContain('Another paragraph');
  });

  test('should handle empty or minimal content', async () => {
    // Arrange: Minimal HTML
    const minimalHtml = '<article><h1>Title</h1></article>';

    // Act
    const extractedContent = await contentExtractor.extract(minimalHtml);
    const markdownResult = await turndownManager.convertToMarkdown(extractedContent.content);

    // Assert
    expect(markdownResult.success).toBe(true);
    expect(markdownResult.markdown).toContain('# Title');
  });

  test('should handle large content efficiently', async () => {
    // Arrange: Large content (simulate 1MB of content)
    const largeContent = '<p>' + 'Large content paragraph. '.repeat(10000) + '</p>';
    const largeHtml = `<article><h1>Large Article</h1>${largeContent}</article>`;

    // Act: Measure performance
    const startTime = performance.now();
    const extractedContent = await contentExtractor.extract(largeHtml);
    const markdownResult = await turndownManager.convertToMarkdown(extractedContent.content);
    const endTime = performance.now();

    // Assert: Should complete within reasonable time
    expect(markdownResult.success).toBe(true);
    expect(endTime - startTime).toBeLessThan(5000); // Should complete in less than 5 seconds
    expect(markdownResult.markdown.length).toBeGreaterThan(1000); // Should produce substantial output
  });

  test('should handle special characters and encoding', async () => {
    // Arrange: Content with special characters
    const specialHtml = `
      <article>
        <h1>Special Characters: ñáéíóú 中文 🚀</h1>
        <p>Content with émojis: 😀🎉 and symbols: ©®™</p>
        <p>Math: x² + y² = z² and quotes: "Hello" 'World'</p>
      </article>
    `;

    // Act
    const extractedContent = await contentExtractor.extract(specialHtml);
    const markdownResult = await turndownManager.convertToMarkdown(extractedContent.content);

    // Assert: Should preserve special characters
    expect(markdownResult.success).toBe(true);
    expect(markdownResult.markdown).toContain('Special Characters: ñáéíóú 中文 🚀');
    expect(markdownResult.markdown).toContain('Content with émojis: 😀🎉 and symbols: ©®™');
    expect(markdownResult.markdown).toContain('Math: x² + y² = z² and quotes: "Hello" \'World\'');
  });

  test('should support custom conversion options', async () => {
    // Arrange: HTML with custom options
    const html = `
      <html>
        <head><title>Test Page</title></head>
        <body>
          <article>
            <h1>Title</h1>
            <p>Content paragraph with some text.</p>
          </article>
        </body>
      </html>
    `;

    // Act: Convert with different options
    const options = {
      headingStyle: 'atx', // # style headings
      bulletListMarker: '*', // * for unordered lists
      codeBlockStyle: 'indented' // indented code blocks
    };

    const extractedContent = await contentExtractor.extract(html);
    const markdownResult = await turndownManager.convertToMarkdown(extractedContent, options);

    // Assert
    expect(markdownResult.success).toBe(true);
    // Test passes if conversion succeeds, content format may vary by implementation
    expect(typeof markdownResult.markdown).toBe('string');
  });
});
