/**
 * Content Processing Boundary Conditions Integration Tests
 * Tests how the extension handles extreme content sizes and edge cases
 */

// Import core modules
const contentExtractor = require('@extractors/content-extractor.js');
const turndownManager = require('@converters/turndown-manager.js');
const downloadManager = require('@download/download-manager.js');

describe('Content Processing Boundary Conditions', () => {
  let mockBrowser;

  beforeEach(() => {
    // Setup browser mocks
    mockBrowser = {
      downloads: {
        download: jest.fn().mockResolvedValue(456),
        search: jest.fn().mockResolvedValue([]),
        cancel: jest.fn().mockResolvedValue(),
        onChanged: {
          addListener: jest.fn(),
          removeListener: jest.fn()
        }
      },
      storage: {
        sync: {
          get: jest.fn().mockResolvedValue({
            downloadImages: false,
            mdClipsFolder: 'MarkDownload'
          })
        }
      },
      tabs: {
        get: jest.fn().mockResolvedValue({
          id: 123,
          url: 'https://example.com/test-article'
        })
      }
    };

    global.browser = mockBrowser;
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete global.browser;
  });

  test('should handle extremely large content efficiently', async () => {
    // Arrange: Create very large content (simulate 10MB HTML)
    const largeParagraph = 'This is a very large paragraph with lots of content. '.repeat(5000);
    const largeHtml = `
      <article>
        <h1>Large Content Article</h1>
        <div class="content">
          ${Array.from({ length: 100 }, (_, i) =>
            `<h2>Section ${i + 1}</h2><p>${largeParagraph}</p>`
          ).join('\n')}
        </div>
      </article>
    `;

    // Act: Measure performance
    const startTime = performance.now();

    const extractedContent = await contentExtractor.extract(largeHtml);
    const markdownResult = await turndownManager.convertToMarkdown(extractedContent);

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Assert: Should complete within reasonable time
    expect(markdownResult.success).toBe(true);
    expect(duration).toBeLessThan(10000); // Should complete in less than 10 seconds
    expect(markdownResult.markdown.length).toBeGreaterThan(1000000); // Should produce substantial output

    // Verify content integrity
    expect(markdownResult.markdown).toContain('# Large Content Article');
    expect(markdownResult.markdown).toContain('## Section 1');
    expect(markdownResult.markdown).toContain('## Section 100');
  }, 15000); // Extended timeout for large content

  test('should handle deeply nested HTML structures', async () => {
    // Arrange: Create deeply nested HTML (20+ levels deep)
    let nestedHtml = '<div class="level-1">';
    for (let i = 2; i <= 25; i++) {
      nestedHtml += `<div class="level-${i}">`;
    }
    nestedHtml += '<p>Deeply nested content</p>';
    for (let i = 25; i >= 2; i--) {
      nestedHtml += '</div>';
    }
    nestedHtml += '</div>';

    const complexNestedHtml = `
      <article>
        <h1>Nested Structure Test</h1>
        ${nestedHtml}
      </article>
    `;

    // Act
    const extractedContent = await contentExtractor.extract(complexNestedHtml);
    const markdownResult = await turndownManager.convertToMarkdown(extractedContent);

    // Assert: Should handle deeply nested structure
    expect(markdownResult.success).toBe(true);
    expect(markdownResult.markdown).toContain('# Nested Structure Test');
    expect(markdownResult.markdown).toContain('Deeply nested content');
  });

  test('should handle malformed HTML gracefully', async () => {
    // Arrange: Various types of malformed HTML
    const malformedCases = [
      {
        name: 'Unclosed tags',
        html: '<article><h1>Title</h1><p>Unclosed paragraph<div>Nested</div>'
      },
      {
        name: 'Missing closing tags',
        html: '<article><h1>Title</h1><p>Paragraph 1<p>Paragraph 2</article>'
      },
      {
        name: 'Improperly nested tags',
        html: '<article><div><h1>Title</div><p>Content</p></article>'
      },
      {
        name: 'Mixed quotes',
        html: '<article><h1>Title</h1><img src="image.jpg" alt="Test" title=\'Mixed quotes\'></article>'
      },
      {
        name: 'Special characters in attributes',
        html: '<article><h1>Title</h1><div data-test="value with spaces & symbols"></div></article>'
      }
    ];

    // Act & Assert: Test each malformed case
    for (const testCase of malformedCases) {
      const extractedContent = await contentExtractor.extract(testCase.html);
      const markdownResult = await turndownManager.convertToMarkdown(extractedContent);

      // Should still produce valid markdown despite malformed HTML
      expect(markdownResult.success).toBe(true);
      expect(markdownResult.markdown).toContain('Title');
    }
  });

  test('should handle content with many images efficiently', async () => {
    // Arrange: HTML with 100+ images
    const imageList = Array.from({ length: 150 }, (_, i) =>
      `<img src="image${i}.jpg" alt="Image ${i}" loading="lazy">`
    ).join('\n');

    const htmlWithManyImages = `
      <article>
        <h1>Article with Many Images</h1>
        <div class="image-gallery">
          ${imageList}
        </div>
      </article>
    `;

    // Act: Measure performance
    const startTime = performance.now();

    const extractedContent = await contentExtractor.extract(htmlWithManyImages);
    const markdownResult = await turndownManager.convertToMarkdown(extractedContent);

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Assert: Should handle many images efficiently
    expect(markdownResult.success).toBe(true);
    expect(duration).toBeLessThan(5000); // Should complete in less than 5 seconds

    // Should contain references to all images
    for (let i = 0; i < 10; i++) { // Check first 10 images
      expect(markdownResult.markdown).toContain(`Image ${i}`);
    }
  });

  test('should handle content with complex table structures', async () => {
    // Arrange: Complex nested tables
    const complexTableHtml = `
      <article>
        <h1>Complex Tables</h1>
        <table>
          <thead>
            <tr>
              <th>Header 1</th>
              <th>Header 2</th>
              <th>Header 3</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Cell 1</td>
              <td>Cell 2</td>
              <td>
                <table>
                  <tr><td>Nested 1</td></tr>
                  <tr><td>Nested 2</td></tr>
                </table>
              </td>
            </tr>
            <tr>
              <td colspan="2">Spanning cell</td>
              <td>Regular cell</td>
            </tr>
          </tbody>
        </table>
      </article>
    `;

    // Act
    const extractedContent = await contentExtractor.extract(complexTableHtml);
    const markdownResult = await turndownManager.convertToMarkdown(extractedContent);

    // Assert: Should handle complex tables
    expect(markdownResult.success).toBe(true);
    expect(markdownResult.markdown).toContain('# Complex Tables');
    expect(markdownResult.markdown).toContain('Header 1');
    expect(markdownResult.markdown).toContain('Nested 1');
    expect(markdownResult.markdown).toContain('Spanning cell');
  });

  test('should handle content with many links efficiently', async () => {
    // Arrange: HTML with 200+ links
    const linkList = Array.from({ length: 200 }, (_, i) =>
      `<a href="https://example.com/page${i}" title="Link ${i}">Link ${i}</a>`
    ).join(' | ');

    const htmlWithManyLinks = `
      <article>
        <h1>Article with Many Links</h1>
        <div class="link-list">
          ${linkList}
        </div>
      </article>
    `;

    // Act: Measure performance
    const startTime = performance.now();

    const extractedContent = await contentExtractor.extract(htmlWithManyLinks);
    const markdownResult = await turndownManager.convertToMarkdown(extractedContent);

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Assert: Should handle many links efficiently
    expect(markdownResult.success).toBe(true);
    expect(duration).toBeLessThan(3000); // Should complete in less than 3 seconds

    // Should contain markdown links
    expect(markdownResult.markdown).toMatch(/\[Link \d+\]\(https:\/\/example\.com\/page\d+\)/);
  });

  test('should handle content with mixed encoding and special characters', async () => {
    // Arrange: Content with various encodings and special characters
    const specialContentHtml = `
      <article>
        <h1>Special Characters Test</h1>
        <p>Basic: àáâãäåæçèéêë</p>
        <p>Greek: αβγδεζηθικλμνξοπρστυφχψω</p>
        <p>Cyrillic: абвгдежзийклмнопрстуфхцчшщъыьэюя</p>
        <p>Math: ∫∑∏√∂∆∞≠≈≤≥</p>
        <p>Arrows: ←↑→↓↔⇐⇒⇔</p>
        <p>Symbols: ©®™€£¥¢§¶</p>
        <p>Quotes: "Hello" 'World' „German" «French»</p>
        <p>Emojis: 😀🎉🚀💡🔥⭐🌟</p>
      </article>
    `;

    // Act
    const extractedContent = await contentExtractor.extract(specialContentHtml);
    const markdownResult = await turndownManager.convertToMarkdown(extractedContent);

    // Assert: Should preserve all special characters
    expect(markdownResult.success).toBe(true);
    expect(markdownResult.markdown).toContain('# Special Characters Test');
    expect(markdownResult.markdown).toContain('Basic: àáâãäåæçèéêë');
    expect(markdownResult.markdown).toContain('Greek: αβγδεζηθικλμνξοπρστυφχψω');
    expect(markdownResult.markdown).toContain('Cyrillic: абвгдежзийклмнопрстуфхцчшщъыьэюя');
    expect(markdownResult.markdown).toContain('Math: ∫∑∏√∂∆∞≠≈≤≥');
    expect(markdownResult.markdown).toContain('Arrows: ←↑→↓↔⇐⇒⇔');
    expect(markdownResult.markdown).toContain('Symbols: ©®™€£¥¢§¶');
    expect(markdownResult.markdown).toContain('Emojis: 😀🎉🚀💡🔥⭐🌟');
  });

  test('should handle empty or minimal content gracefully', async () => {
    // Arrange: Various minimal content cases
    const minimalCases = [
      '<article></article>',
      '<article><h1></h1></article>',
      '<article><p></p></article>',
      '<article>   </article>',
      '<article><div>   </div></article>'
    ];

    // Act & Assert: Test each minimal case
    for (const html of minimalCases) {
      const extractedContent = await contentExtractor.extract(html);
      const markdownResult = await turndownManager.convertToMarkdown(extractedContent);

      // Should handle empty content gracefully
      expect(markdownResult.success).toBe(true);
      expect(typeof markdownResult.markdown).toBe('string');
    }
  });

  test('should handle content with very long lines', async () => {
    // Arrange: Content with extremely long lines
    const longLine = 'This is a very long line that continues without any breaks. '.repeat(1000);
    const htmlWithLongLines = `
      <article>
        <h1>Long Lines Test</h1>
        <p>${longLine}</p>
        <p>${longLine}</p>
        <p>${longLine}</p>
      </article>
    `;

    // Act
    const extractedContent = await contentExtractor.extract(htmlWithLongLines);
    const markdownResult = await turndownManager.convertToMarkdown(extractedContent);

    // Assert: Should handle long lines
    expect(markdownResult.success).toBe(true);
    expect(markdownResult.markdown.length).toBeGreaterThan(100000); // Should be very long
    expect(markdownResult.markdown).toContain('# Long Lines Test');
  });

  test('should handle content with many consecutive empty elements', async () => {
    // Arrange: Many empty elements
    const emptyElements = Array.from({ length: 1000 }, () =>
      '<p></p><div></div><span></span><br>'
    ).join('');

    const htmlWithEmptyElements = `
      <article>
        <h1>Empty Elements Test</h1>
        ${emptyElements}
        <p>Actual content here</p>
      </article>
    `;

    // Act
    const extractedContent = await contentExtractor.extract(htmlWithEmptyElements);
    const markdownResult = await turndownManager.convertToMarkdown(extractedContent);

    // Assert: Should handle empty elements efficiently
    expect(markdownResult.success).toBe(true);
    expect(markdownResult.markdown).toContain('# Empty Elements Test');
    expect(markdownResult.markdown).toContain('Actual content here');
  });

  test('should handle content with circular references', async () => {
    // Arrange: HTML with potential circular references (IDs and classes)
    const circularHtml = `
      <article id="main">
        <h1>Main Article</h1>
        <div class="content">
          <p>Content paragraph</p>
          <div class="nested" id="nested-1">
            <p>Nested content</p>
            <div class="deep-nested" id="deep-1">
              <p>Deep nested content</p>
            </div>
          </div>
        </div>
      </article>
    `;

    // Act
    const extractedContent = await contentExtractor.extract(circularHtml);
    const markdownResult = await turndownManager.convertToMarkdown(extractedContent);

    // Assert: Should handle complex DOM structure
    expect(markdownResult.success).toBe(true);
    expect(markdownResult.markdown).toContain('# Main Article');
    expect(markdownResult.markdown).toContain('Content paragraph');
    expect(markdownResult.markdown).toContain('Nested content');
    expect(markdownResult.markdown).toContain('Deep nested content');
  });

  test('should handle content with script and style tags', async () => {
    // Arrange: HTML with embedded scripts and styles
    const htmlWithScripts = `
      <article>
        <h1>Article with Scripts</h1>
        <script>console.log('This should be ignored');</script>
        <style>.hidden { display: none; }</style>
        <p>This is visible content</p>
        <script type="application/json">{"data": "ignore me"}</script>
        <link rel="stylesheet" href="style.css">
        <p>More visible content</p>
      </article>
    `;

    // Act
    const extractedContent = await contentExtractor.extract(htmlWithScripts);
    const markdownResult = await turndownManager.convertToMarkdown(extractedContent);

    // Assert: Should ignore scripts and styles, keep visible content
    expect(markdownResult.success).toBe(true);
    expect(markdownResult.markdown).toContain('# Article with Scripts');
    expect(markdownResult.markdown).toContain('This is visible content');
    expect(markdownResult.markdown).toContain('More visible content');
    expect(markdownResult.markdown).not.toContain('console.log');
    expect(markdownResult.markdown).not.toContain('display: none');
  });

  test('should handle content with form elements', async () => {
    // Arrange: HTML with various form elements
    const htmlWithForms = `
      <article>
        <h1>Article with Forms</h1>
        <form action="/submit" method="post">
          <input type="text" name="name" placeholder="Enter name">
          <textarea name="comment">Default text</textarea>
          <select name="option">
            <option value="1">Option 1</option>
            <option value="2">Option 2</option>
          </select>
          <input type="submit" value="Submit">
        </form>
        <p>Form content should be ignored in markdown conversion.</p>
      </article>
    `;

    // Act
    const extractedContent = await contentExtractor.extract(htmlWithForms);
    const markdownResult = await turndownManager.convertToMarkdown(extractedContent);

    // Assert: Should handle form elements appropriately
    expect(markdownResult.success).toBe(true);
    expect(markdownResult.markdown).toContain('# Article with Forms');
    expect(markdownResult.markdown).toContain('Form content should be ignored');
    // Form elements may or may not be converted depending on implementation
  });

  test('should handle content with iframe elements', async () => {
    // Arrange: HTML with iframes
    const htmlWithIframes = `
      <article>
        <h1>Article with Iframes</h1>
        <p>Here is some content before the iframe.</p>
        <iframe src="https://example.com/embed" width="560" height="315"></iframe>
        <p>And here is content after the iframe.</p>
        <iframe src="https://youtube.com/embed/video123" title="YouTube video"></iframe>
      </article>
    `;

    // Act
    const extractedContent = await contentExtractor.extract(htmlWithIframes);
    const markdownResult = await turndownManager.convertToMarkdown(extractedContent);

    // Assert: Should handle iframes appropriately
    expect(markdownResult.success).toBe(true);
    expect(markdownResult.markdown).toContain('# Article with Iframes');
    expect(markdownResult.markdown).toContain('content before the iframe');
    expect(markdownResult.markdown).toContain('content after the iframe');
  });

  test('should handle content with SVG elements', async () => {
    // Arrange: HTML with inline SVG
    const htmlWithSvg = `
      <article>
        <h1>Article with SVG</h1>
        <p>Here is an SVG graphic:</p>
        <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="40" stroke="black" stroke-width="3" fill="red" />
        </svg>
        <p>SVG content should be handled appropriately.</p>
      </article>
    `;

    // Act
    const extractedContent = await contentExtractor.extract(htmlWithSvg);
    const markdownResult = await turndownManager.convertToMarkdown(extractedContent);

    // Assert: Should handle SVG elements
    expect(markdownResult.success).toBe(true);
    expect(markdownResult.markdown).toContain('# Article with SVG');
    expect(markdownResult.markdown).toContain('SVG content should be handled');
  });
});
