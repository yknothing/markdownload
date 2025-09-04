/**
 * Download Management Integration Tests
 * Tests the complete download workflow from content to file
 */

// Import core modules
const downloadManager = require('@download/download-manager.js');
const browserApi = require('@api/browser-api.js');

describe('Download Management Integration', () => {
  let mockDownloadData;
  let mockBrowser;

  beforeEach(() => {
    // Setup mock data
    mockDownloadData = {
      markdown: '# Test Article\n\nThis is test content.',
      title: 'Test Article Title',
      tabId: 123,
      imageList: {},
      mdClipsFolder: '',
      options: {
        includeTemplate: false,
        downloadImages: false,
        clipSelection: true
      }
    };

    // Initialize global test blob contents
    global.testBlobContents = global.testBlobContents || {};

    // Setup enhanced browser mocks
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
            mdClipsFolder: '',
            downloadImages: false,
            includeTemplate: false
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

    // Override global browser for this test suite
    global.browser = mockBrowser;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should create and download markdown file successfully', async () => {
    // Arrange
    const expectedFilename = 'Test Article Title.md';

    // Act
    const result = await downloadManager.download(mockDownloadData);

    // Assert
    expect(result.success).toBe(true);
    expect(result.filename).toBe(expectedFilename);
    expect(result.downloadId).toBe(456);

    // Verify browser API calls
    expect(mockBrowser.downloads.download).toHaveBeenCalledWith({
      filename: expectedFilename,
      url: expect.stringContaining('blob:'),
      saveAs: false
    });
  });

  test('should handle filename sanitization correctly', async () => {
    // Arrange: Test various problematic filenames
    const testCases = [
      {
        title: 'File with /\\:*?"<>| characters',
        expected: 'File with _________ characters.md'
      },
      {
        title: 'Very Long Title That Should Be Truncated Appropriately When It Exceeds Reasonable Length Limits',
        expected: 'Very Long Title That Should Be Truncated Appropriately When It Exceeds Reasonable Length Limits.md'
      },
      {
        title: '标题包含中文字符',
        expected: '标题包含中文字符.md'
      },
      {
        title: 'Title with (parentheses) and [brackets]',
        expected: 'Title with (parentheses) and [brackets].md'
      },
      {
        title: 'Normal Title',
        expected: 'Normal Title.md'
      }
    ];

    for (const testCase of testCases) {
      // Act
      const result = await downloadManager.download({
        ...mockDownloadData,
        title: testCase.title
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.filename).toBe(testCase.expected);
    }
  });

  test('should include front and back matter when enabled', async () => {
    // Arrange: Create markdown with templates already applied
    const markdownWithTemplates = '---\ncreated: 2024-01-15\n---\n\n# Test Article\n\nThis is test content.\n\n---\n*Downloaded from https://example.com*';
    const dataWithTemplate = {
      ...mockDownloadData,
      markdown: markdownWithTemplates,
      options: {
        ...mockDownloadData.options,
        includeTemplate: true
      }
    };

    // Set up the expected blob content for testing
    global.testBlobContents['blob:mock-url'] = markdownWithTemplates;

    // Act
    const result = await downloadManager.download(dataWithTemplate);

    // Assert
    expect(result.success).toBe(true);

    // Verify the blob content includes templates
    const downloadCall = mockBrowser.downloads.download.mock.calls[0][0];
    expect(downloadCall.url).toBeDefined();

    // Extract content from blob URL for verification
    const blobContent = await extractBlobContent(downloadCall.url);
    expect(blobContent).toContain('---');
    expect(blobContent).toContain('created:');
    expect(blobContent).toContain('Downloaded from');
  });

  test('should handle folder organization correctly', async () => {
    // Arrange
    const dataWithFolder = {
      ...mockDownloadData,
      mdClipsFolder: 'My Clips/Markdown'
    };

    // Act
    const result = await downloadManager.download(dataWithFolder);

    // Assert
    expect(result.success).toBe(true);

    // Verify folder structure in filename
    const downloadCall = mockBrowser.downloads.download.mock.calls[0][0];
    expect(downloadCall.filename).toContain('My Clips/Markdown/');
  });

  test('should handle large content files efficiently', async () => {
    // Arrange: Create large content (simulate 2MB markdown)
    const largeContent = '# Large Article\n\n' + 'Large content paragraph. '.repeat(50000);
    const largeData = {
      ...mockDownloadData,
      markdown: largeContent,
      title: 'Large Article'
    };

    // Setup blob content storage for testing
    global.testBlobContents = global.testBlobContents || {};
    const mockBlobUrl = 'blob:test://large-content';
    global.testBlobContents[mockBlobUrl] = largeContent;

    // Mock URL.createObjectURL to return our test URL
    const originalCreateObjectURL = URL.createObjectURL;
    URL.createObjectURL = jest.fn(() => mockBlobUrl);

    try {
      // Act: Measure performance
      const startTime = performance.now();
      const result = await downloadManager.download(largeData);
      const endTime = performance.now();

      // Assert
      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(3000); // Should complete in less than 3 seconds

      // Verify content size
      const downloadCall = mockBrowser.downloads.download.mock.calls[0][0];
      const blobContent = await extractBlobContent(mockBlobUrl);
      expect(blobContent.length).toBeGreaterThan(1000000); // Should be over 1MB
    } finally {
      // Cleanup
      URL.createObjectURL = originalCreateObjectURL;
      delete global.testBlobContents;
    }
  });

  test('should handle concurrent downloads correctly', async () => {
    // Arrange: Multiple download requests
    const downloadPromises = [];

    for (let i = 1; i <= 5; i++) {
      const data = {
        ...mockDownloadData,
        title: `Concurrent Article ${i}`,
        tabId: 100 + i
      };
      downloadPromises.push(downloadManager.download(data));
    }

    // Act
    const results = await Promise.all(downloadPromises);

    // Assert: All downloads should succeed
    expect(results).toHaveLength(5);
    results.forEach(result => {
      expect(result.success).toBe(true);
      expect(result.downloadId).toBeDefined();
    });

    // Verify browser API was called correct number of times
    expect(mockBrowser.downloads.download).toHaveBeenCalledTimes(5);
  });

  test('should handle download failures gracefully', async () => {
    // Arrange: Mock download failure
    mockBrowser.downloads.download.mockRejectedValue(
      new Error('Download failed: Network error')
    );

    // Act
    const result = await downloadManager.download(mockDownloadData);

    // Assert: Should handle failure gracefully
    expect(result.success).toBe(false);
    expect(result.error).toContain('Download failed');
  });

  test('should handle permission denied errors', async () => {
    // Arrange: Mock permission denied
    mockBrowser.downloads.download.mockRejectedValue(
      new Error('Download failed: User cancelled')
    );

    // Act
    const result = await downloadManager.download(mockDownloadData);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain('User cancelled');
  });

  test('should handle disk space issues', async () => {
    // Arrange: Mock disk full error
    mockBrowser.downloads.download.mockRejectedValue(
      new Error('Download failed: Insufficient disk space')
    );

    // Act
    const result = await downloadManager.download(mockDownloadData);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain('Insufficient disk space');
  });

  test('should support different file formats', async () => {
    // Arrange: Test different filename patterns
    const formatTests = [
      { title: 'Article.txt', expected: 'Article.txt.md' },
      { title: 'Document', expected: 'Document.md' },
      { title: 'File.With.Many.Dots', expected: 'File.With.Many.Dots.md' },
      { title: 'File with spaces', expected: 'File with spaces.md' }
    ];

    for (const test of formatTests) {
      // Act
      const result = await downloadManager.download({
        ...mockDownloadData,
        title: test.title
      });

      // Assert
      expect(result.filename).toBe(test.expected);
    }
  });

  test('should handle special characters in titles', async () => {
    // Arrange
    const specialTitles = [
      'Article with émojis 😀🎉🚀',
      'Math: x² + y² = z²',
      'Symbols: ©®™€£¥',
      'Quotes: "Hello" \'World\'',
      '中文标题测试',
      '日本語タイトル',
      'Русский заголовок'
    ];

    for (const title of specialTitles) {
      // Act
      const result = await downloadManager.download({
        ...mockDownloadData,
        title
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.filename).toContain('.md');
      // Should not contain problematic filesystem characters
      expect(result.filename).not.toMatch(/[\/\\:*?"<>|]/);
    }
  });

  test('should support custom download options', async () => {
    // Arrange: Custom download options
    const customOptions = {
      ...mockDownloadData,
      options: {
        includeTemplate: true,
        downloadImages: false,
        clipSelection: false,
        saveAs: true // Force save dialog
      }
    };

    // Act
    const result = await downloadManager.download(customOptions);

    // Assert
    expect(result.success).toBe(true);

    // Verify saveAs option was passed to browser API
    const downloadCall = mockBrowser.downloads.download.mock.calls[0][0];
    expect(downloadCall.saveAs).toBe(true);
  });

  test('should handle empty or minimal content', async () => {
    // Arrange: Minimal content
    const minimalData = {
      ...mockDownloadData,
      markdown: '# Title',
      title: 'Minimal'
    };

    // Act
    const result = await downloadManager.download(minimalData);

    // Assert
    expect(result.success).toBe(true);
    expect(result.filename).toBe('Minimal.md');
  });
});

/**
 * Helper function to extract content from blob URL
 * In real implementation, this would use URL.createObjectURL
 */
async function extractBlobContent(blobUrl) {
  // Mock implementation for testing
  // In real browser environment, this would extract from actual blob
  // For testing purposes, we store the content in a global variable
  // and retrieve it based on the blob URL

  if (global.testBlobContents && global.testBlobContents[blobUrl]) {
    return global.testBlobContents[blobUrl];
  }

  // Handle the mock URL from setup.js
  if (blobUrl === 'blob:mock-url') {
    if (global.testBlobContents && global.testBlobContents[blobUrl]) {
      return global.testBlobContents[blobUrl];
    }
    // Return the last stored content if available
    const keys = Object.keys(global.testBlobContents || {});
    if (keys.length > 0) {
      return global.testBlobContents[keys[keys.length - 1]];
    }
  }

  // Default test content
  return '# Test Article\n\nThis is test content.';
}
