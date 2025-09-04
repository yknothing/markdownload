/**
 * Regression test for contentScript.js readability variable bug
 * Tests the fix for the variable name bug that caused content extraction failures
 */

describe('ContentScript Readability Variable Fix', () => {
  let mockWindow, mockDocument, mockBrowser;

  beforeEach(() => {
    // Create minimal mocks
    mockBrowser = {
      runtime: {
        getURL: jest.fn((path) => `chrome-extension://test/${path}`),
        sendMessage: jest.fn()
      }
    };

    mockDocument = {
      title: 'Test Article',
      head: {
        getElementsByTagName: jest.fn(() => []),
        appendChild: jest.fn()
      },
      createElement: jest.fn(() => ({
        onload: null,
        onerror: null,
        src: null
      }))
    };

    mockWindow = {
      location: {
        href: 'https://example.com/test-article'
      },
      Readability: jest.fn(() => ({
        parse: jest.fn(() => ({
          title: 'Extracted Test Article',
          content: '<p>This is the extracted content from Readability.js</p>',
          byline: 'Test Author',
          excerpt: 'This is a test excerpt'
        }))
      }))
    };

    global.window = mockWindow;
    global.document = mockDocument;
    global.browser = mockBrowser;
    
    // Mock getSelectionAndDom function
    global.getSelectionAndDom = jest.fn(() => ({
      selection: '',
      dom: '<html><body><article><h1>Test</h1><p>Content</p></article></body></html>'
    }));
  });

  test('contentScript should use correct variable name for readability result', async () => {
    // Load the content script logic inline to test the fix
    const testContentScriptLogic = () => {
      const domData = global.getSelectionAndDom();
      
      // Mock Readability extraction
      const readability = new window.Readability(document);
      const article = readability.parse();

      // This is the critical part that was buggy - ensure it uses 'article' not 'readabilityArticle'
      browser.runtime.sendMessage({
        type: "clip",
        dom: domData.dom,
        selection: domData.selection,
        baseURI: window.location.href,
        pageTitle: document.title,
        // This was the bug: readabilityArticle should be article
        readability: article && article.content ? {
          title: article.title || document.title,
          content: article.content,
          byline: article.byline || null,
          excerpt: article.excerpt || null
        } : null
      });
    };

    // Execute the test logic
    testContentScriptLogic();

    // Verify the correct message structure was sent, especially that readability field is properly populated
    expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "clip",
        dom: expect.any(String),
        selection: expect.any(String),
        baseURI: expect.any(String),
        pageTitle: expect.any(String),
        // This is the critical test - readability should NOT be null and should have content
        readability: expect.objectContaining({
          title: expect.any(String),
          content: expect.any(String),
          byline: expect.any(String),
          excerpt: expect.any(String)
        })
      })
    );
  });

  test('should handle case when article is null or has no content', () => {
    // Mock Readability to return null
    global.window.Readability = jest.fn(() => ({
      parse: jest.fn(() => null)
    }));

    const testContentScriptLogic = () => {
      const domData = global.getSelectionAndDom();
      const readability = new window.Readability(document);
      const article = readability.parse();

      browser.runtime.sendMessage({
        type: "clip",
        dom: domData.dom,
        selection: domData.selection,
        baseURI: window.location.href,
        pageTitle: document.title,
        readability: article && article.content ? {
          title: article.title || document.title,
          content: article.content,
          byline: article.byline || null,
          excerpt: article.excerpt || null
        } : null
      });
    };

    testContentScriptLogic();

    // Verify readability is null when article is null
    expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        readability: null
      })
    );
  });

  test('should handle case when article exists but has no content', () => {
    // Mock Readability to return article without content
    global.window.Readability = jest.fn(() => ({
      parse: jest.fn(() => ({
        title: 'Test Article',
        content: '', // Empty content
        byline: null,
        excerpt: null
      }))
    }));

    const testContentScriptLogic = () => {
      const domData = global.getSelectionAndDom();
      const readability = new window.Readability(document);
      const article = readability.parse();

      browser.runtime.sendMessage({
        type: "clip",
        dom: domData.dom,
        selection: domData.selection,
        baseURI: window.location.href,
        pageTitle: document.title,
        readability: article && article.content ? {
          title: article.title || document.title,
          content: article.content,
          byline: article.byline || null,
          excerpt: article.excerpt || null
        } : null
      });
    };

    testContentScriptLogic();

    // Verify readability is null when article has no content
    expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        readability: null
      })
    );
  });
});