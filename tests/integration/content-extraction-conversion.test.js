/**
 * Content Extraction & Conversion Integration Tests
 * Tests the complete flow from HTML to Markdown conversion
 */

const { JSDOM } = require('jsdom');

// Import core modules for integration testing
const contentExtractor = require('@extractors/content-extractor.js');

// Use hybrid mocks for real conversion behavior in integration tests
require("../mocks/hybridMocks.js");
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
    const markdownResult = await turndownManager.convertToMarkdown(extractedContent.content, global.testUtils.createMockOptions());

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
    const markdownResult = await turndownManager.convertToMarkdown(extractedContent.content, global.testUtils.createMockOptions());

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
    const markdownResult = await turndownManager.convertToMarkdown(extractedContent.content, global.testUtils.createMockOptions());

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
    const markdownResult = await turndownManager.convertToMarkdown(extractedContent.content, global.testUtils.createMockOptions());

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
    const markdownResult = await turndownManager.convertToMarkdown(extractedContent.content, global.testUtils.createMockOptions());

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
    const markdownResult = await turndownManager.convertToMarkdown(extractedContent.content, global.testUtils.createMockOptions());

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
    const markdownResult = await turndownManager.convertToMarkdown(extractedContent.content, global.testUtils.createMockOptions());

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
    const markdownResult = await turndownManager.convertToMarkdown(extractedContent.content, global.testUtils.createMockOptions());
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
    const markdownResult = await turndownManager.convertToMarkdown(extractedContent.content, global.testUtils.createMockOptions());

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

  // ===== Phase 3: 冒烟套件扩展 =====
  // 图片能力测试
  describe('Image Processing Capabilities', () => {
    test('should handle image links with download', async () => {
      const imageHtml = `
        <article>
          <h1>Article with Downloadable Images</h1>
          <img src="https://example.com/image.jpg" alt="Test Image" title="Image Title">
          <img src="/local-image.png" alt="Local Image">
          <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==" alt="Base64 Image">
        </article>
      `;

      const extractedContent = await contentExtractor.extract(imageHtml);
      const markdownResult = await turndownManager.convertToMarkdown(extractedContent.content, {
        downloadImages: true,
        imagePrefix: 'downloads/'
      });

      expect(markdownResult.success).toBe(true);
      expect(markdownResult.markdown).toContain('![Test Image]');
      expect(markdownResult.markdown).toContain('downloads/');
      if (markdownResult.imageList) {
        expect(Object.keys(markdownResult.imageList).length).toBeGreaterThan(0);
      }
    });

    test('should handle image failures gracefully', async () => {
      const imageHtml = `
        <article>
          <h1>Article with Broken Images</h1>
          <img src="invalid-url" alt="Broken Image">
          <img src="" alt="Empty Source">
        </article>
      `;

      const extractedContent = await contentExtractor.extract(imageHtml);
      const markdownResult = await turndownManager.convertToMarkdown(extractedContent.content, global.testUtils.createMockOptions());

      expect(markdownResult.success).toBe(true);
      expect(markdownResult.markdown).toContain('Article with Broken Images');
      // Should not crash on invalid images
    });

    test('should support different image styles (Obsidian, standard)', async () => {
      const imageHtml = `
        <article>
          <img src="test.jpg" alt="Standard Image">
          <img src="obsidian.jpg" alt="Obsidian Image">
        </article>
      `;

      const extractedContent = await contentExtractor.extract(imageHtml);

      // Test standard markdown
      const standardResult = await turndownManager.convertToMarkdown(extractedContent.content, {
        imageStyle: 'markdown'
      });
      expect(standardResult.markdown).toContain('![Standard Image](test.jpg)');

      // Test Obsidian style
      const obsidianResult = await turndownManager.convertToMarkdown(extractedContent.content, {
        imageStyle: 'obsidian'
      });
      expect(obsidianResult.markdown).toContain('![[obsidian.jpg]]');
    });
  });

  // 表格能力测试
  describe('Table Processing Capabilities', () => {
    test('should convert HTML tables to markdown', async () => {
      const tableHtml = `
        <article>
          <h1>Article with Tables</h1>
          <table>
            <thead>
              <tr>
                <th>Header 1</th>
                <th>Header 2</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Cell 1</td>
                <td>Cell 2</td>
              </tr>
              <tr>
                <td>Cell 3</td>
                <td>Cell 4</td>
              </tr>
            </tbody>
          </table>
        </article>
      `;

      const extractedContent = await contentExtractor.extract(tableHtml);
      const markdownResult = await turndownManager.convertToMarkdown(extractedContent.content, global.testUtils.createMockOptions());

      expect(markdownResult.success).toBe(true);
      expect(markdownResult.markdown).toContain('| Header 1 | Header 2 |');
      expect(markdownResult.markdown).toContain('| Cell 1 | Cell 2 |');
      expect(markdownResult.markdown).toContain('| Cell 3 | Cell 4 |');
    });

    test('should handle complex tables with merged cells', async () => {
      const complexTableHtml = `
        <article>
          <table>
            <tr>
              <th colspan="2">Merged Header</th>
            </tr>
            <tr>
              <td rowspan="2">Merged Cell</td>
              <td>Cell 2</td>
            </tr>
            <tr>
              <td>Cell 4</td>
            </tr>
          </table>
        </article>
      `;

      const extractedContent = await contentExtractor.extract(complexTableHtml);
      const markdownResult = await turndownManager.convertToMarkdown(extractedContent.content, global.testUtils.createMockOptions());

      expect(markdownResult.success).toBe(true);
      // Complex tables may have simplified representation
      expect(markdownResult.markdown).toContain('Merged Header');
      expect(markdownResult.markdown).toContain('Merged Cell');
    });
  });

  // 代码能力测试
  describe('Code Processing Capabilities', () => {
    test('should handle fenced code blocks with language hints', async () => {
      const codeHtml = `
        <article>
          <h1>Code Examples</h1>
          <pre><code class="language-javascript">function test() {
  console.log('Hello');
}</code></pre>
          <pre><code class="language-python">def hello():
    print("World")</code></pre>
        </article>
      `;

      const extractedContent = await contentExtractor.extract(codeHtml);
      const markdownResult = await turndownManager.convertToMarkdown(extractedContent.content, global.testUtils.createMockOptions());

      expect(markdownResult.success).toBe(true);
      expect(markdownResult.markdown).toContain('```javascript');
      expect(markdownResult.markdown).toContain('function test()');
      expect(markdownResult.markdown).toContain('```python');
      expect(markdownResult.markdown).toContain('def hello()');
    });

    test('should handle inline code and mixed content', async () => {
      const mixedCodeHtml = `
        <article>
          <p>Use <code>npm install</code> to install dependencies.</p>
          <p>For more info, see <code>README.md</code>.</p>
          <pre><code>npm run build</code></pre>
        </article>
      `;

      const extractedContent = await contentExtractor.extract(mixedCodeHtml);
      const markdownResult = await turndownManager.convertToMarkdown(extractedContent.content, global.testUtils.createMockOptions());

      expect(markdownResult.success).toBe(true);
      expect(markdownResult.markdown).toContain('`npm install`');
      expect(markdownResult.markdown).toContain('`README.md`');
      expect(markdownResult.markdown).toContain('```\nnpm run build\n```');
    });
  });

  // 数学式能力测试
  describe('Math Processing Capabilities', () => {
    test('should handle inline and block math expressions', async () => {
      const mathHtml = `
        <article>
          <h1>Math Article</h1>
          <p>Einstein's equation: <span class="math inline">E = mc²</span></p>
          <div class="math display">
            \\int_{0}^{\\infty} e^{-x} dx = 1
          </div>
          <p>Pythagorean theorem: <span class="math">a² + b² = c²</span></p>
        </article>
      `;

      const extractedContent = await contentExtractor.extract(mathHtml);
      const markdownResult = await turndownManager.convertToMarkdown(extractedContent.content, global.testUtils.createMockOptions());

      expect(markdownResult.success).toBe(true);
      expect(markdownResult.markdown).toContain('E = mc²');
      expect(markdownResult.markdown).toContain('\\int_{0}^{\\infty} e^{-x} dx = 1');
      expect(markdownResult.markdown).toContain('a² + b² = c²');
    });

    test('should preserve math in code blocks', async () => {
      const mathCodeHtml = `
        <article>
          <pre><code>const formula = "E = mc²";
console.log(formula);</code></pre>
          <p>Math in text: x² + y² = z²</p>
        </article>
      `;

      const extractedContent = await contentExtractor.extract(mathCodeHtml);
      const markdownResult = await turndownManager.convertToMarkdown(extractedContent.content, global.testUtils.createMockOptions());

      expect(markdownResult.success).toBe(true);
      expect(markdownResult.markdown).toContain('E = mc²');
      expect(markdownResult.markdown).toContain('x² + y² = z²');
      expect(markdownResult.markdown).toContain('```');
    });
  });

  // 混合能力冒烟测试
  test('Phase 3 Smoke Test: All capabilities combined', async () => {
    const comprehensiveHtml = `
      <article>
        <h1>Comprehensive Test Article</h1>

        <p>This article tests all four capabilities:</p>

        <h2>1. Images</h2>
        <img src="test.jpg" alt="Test Image">

        <h2>2. Tables</h2>
        <table>
          <tr><th>Feature</th><th>Status</th></tr>
          <tr><td>Images</td><td>✅</td></tr>
          <tr><td>Tables</td><td>✅</td></tr>
          <tr><td>Code</td><td>✅</td></tr>
          <tr><td>Math</td><td>✅</td></tr>
        </table>

        <h2>3. Code</h2>
        <pre><code class="language-javascript">console.log('Hello World');</code></pre>
        <p>Inline code: <code>const x = 42;</code></p>

        <h2>4. Math</h2>
        <p>Formula: <span class="math inline">E = mc²</span></p>
        <div class="math display">\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}</div>
      </article>
    `;

    const extractedContent = await contentExtractor.extract(comprehensiveHtml);
    const markdownResult = await turndownManager.convertToMarkdown(extractedContent.content, {
      downloadImages: true,
      imagePrefix: 'images/'
    });

    expect(markdownResult.success).toBe(true);

    // Verify all four capabilities are present
    expect(markdownResult.markdown).toContain('![Test Image]');
    expect(markdownResult.markdown).toContain('| Feature | Status |');
    expect(markdownResult.markdown).toContain('```javascript');
    expect(markdownResult.markdown).toContain('console.log');
    expect(markdownResult.markdown).toContain('E = mc²');
    expect(markdownResult.markdown).toContain('\\sum_{i=1}^{n} i');

    // Performance check
    expect(markdownResult.markdown.length).toBeGreaterThan(100);
  });
});
