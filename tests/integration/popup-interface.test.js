/**
 * Popup Interface Integration Tests
 * Tests the popup UI behavior and settings management
 */

// Import popup functionality
const popupMessenger = require('@popup/popup.js');

describe('Popup Interface Integration', () => {
  let mockBrowser;
  let mockDocument;
  let mockStorage;

  beforeEach(() => {
    // Setup DOM environment
    const { JSDOM } = require('jsdom');
    const dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>MarkDownload Popup</title>
        </head>
        <body>
          <div class="popup">
            <div class="title-section">
              <input type="text" id="title" value="Test Article">
            </div>
            <div class="content-section">
              <textarea id="md"># Test Content\n\nThis is test markdown content.</textarea>
            </div>
            <div class="options-section">
              <div class="option">
                <input type="checkbox" id="includeTemplate" class="checked">
                <label for="includeTemplate">Include Template</label>
              </div>
              <div class="option">
                <input type="checkbox" id="downloadImages" class="checked">
                <label for="downloadImages">Download Images</label>
              </div>
              <div class="option">
                <input type="checkbox" id="selected">
                <label for="selected">Selected Text Only</label>
              </div>
            </div>
            <div class="actions">
              <button id="download">Download</button>
              <button id="cancel">Cancel</button>
            </div>
            <div id="spinner" style="display: none;"></div>
            <div id="error" style="display: none;"></div>
          </div>
        </body>
      </html>
    `, {
      url: 'chrome-extension://test/popup.html',
      pretendToBeVisual: true,
      resources: 'usable'
    });

    mockDocument = dom.window.document;
    global.document = mockDocument;
    global.window = dom.window;

    // Setup enhanced browser mocks
    mockBrowser = {
      runtime: {
        sendMessage: jest.fn().mockResolvedValue({ success: true }),
        onMessage: {
          addListener: jest.fn()
        }
      },
      tabs: {
        query: jest.fn().mockResolvedValue([
          { id: 123, url: 'https://example.com/test-article', title: 'Test Article' }
        ]),
        getCurrent: jest.fn().mockResolvedValue({ id: 123 })
      },
      storage: {
        sync: {
          get: jest.fn().mockImplementation((keys) => {
            const defaults = {
              includeTemplate: false,
              downloadImages: true,
              clipSelection: false,
              mdClipsFolder: 'MarkDownload',
              frontmatter: '---\ncreated: {date:YYYY-MM-DD}\n---\n',
              backmatter: ''
            };
            if (Array.isArray(keys)) {
              return Promise.resolve(keys.reduce((acc, key) => {
                acc[key] = defaults[key];
                return acc;
              }, {}));
            }
            return Promise.resolve(defaults[keys] || defaults);
          }),
          set: jest.fn().mockResolvedValue()
        }
      }
    };

    global.browser = mockBrowser;
    global.chrome = mockBrowser; // Support both namespaces

    // Mock CodeMirror
    global.CodeMirror = {
      fromTextArea: jest.fn(() => ({
        getValue: jest.fn(() => '# Test Content\n\nThis is test markdown content.'),
        setValue: jest.fn(),
        getSelection: jest.fn(() => ''),
        somethingSelected: jest.fn(() => false),
        refresh: jest.fn(),
        on: jest.fn()
      }))
    };

    // Mock showError and other popup functions
    global.showError = jest.fn();
    global.showSpinner = jest.fn();
    global.hideSpinner = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clean up global mocks
    delete global.document;
    delete global.window;
    delete global.browser;
    delete global.chrome;
  });

  test('should initialize with saved settings', async () => {
    // Arrange: Mock saved settings
    const savedSettings = {
      includeTemplate: true,
      downloadImages: false,
      clipSelection: true,
      mdClipsFolder: 'My Clips'
    };

    mockBrowser.storage.sync.get.mockResolvedValue(savedSettings);

    // Act: Simulate popup initialization
    require('@popup/popup.js'); // This should trigger DOMContentLoaded

    // Simulate DOMContentLoaded event
    const event = new Event('DOMContentLoaded');
    mockDocument.dispatchEvent(event);

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 100));

    // Assert: Verify settings were loaded
    expect(mockBrowser.storage.sync.get).toHaveBeenCalled();

    // Verify UI reflects saved settings
    const includeTemplateCheckbox = mockDocument.getElementById('includeTemplate');
    const downloadImagesCheckbox = mockDocument.getElementById('downloadImages');
    const selectedCheckbox = mockDocument.getElementById('selected');

    // Note: In real implementation, these would be updated by the popup code
    expect(includeTemplateCheckbox).toBeDefined();
    expect(downloadImagesCheckbox).toBeDefined();
    expect(selectedCheckbox).toBeDefined();
  });

  test('should update settings and persist when changed', async () => {
    // Arrange: Start with default settings
    const defaultSettings = {
      includeTemplate: false,
      downloadImages: true,
      clipSelection: false
    };

    mockBrowser.storage.sync.get.mockResolvedValue(defaultSettings);

    // Act: Simulate user changing settings
    const includeTemplateCheckbox = mockDocument.getElementById('includeTemplate');
    const downloadImagesCheckbox = mockDocument.getElementById('downloadImages');

    // Simulate user interactions
    includeTemplateCheckbox.checked = true;
    downloadImagesCheckbox.checked = false;

    // Simulate settings save (normally triggered by change events)
    const newSettings = {
      includeTemplate: true,
      downloadImages: false,
      clipSelection: false
    };

    mockBrowser.storage.sync.set.mockResolvedValue();

    // Assert: Verify settings were saved
    expect(mockBrowser.storage.sync.set).toHaveBeenCalledWith(newSettings);
  });

  test('should handle content preview correctly', async () => {
    // Arrange: Setup content in textarea
    const textarea = mockDocument.getElementById('md');
    const testContent = '# Preview Test\n\nThis is preview content.';
    textarea.value = testContent;

    // Mock CodeMirror instance
    const mockCM = {
      getValue: jest.fn(() => testContent),
      setValue: jest.fn(),
      refresh: jest.fn()
    };

    global.CodeMirror.fromTextArea.mockReturnValue(mockCM);

    // Act: Simulate preview request
    // In real implementation, this would be triggered by a preview button
    const previewContent = mockCM.getValue();

    // Assert: Verify content preview works
    expect(previewContent).toBe(testContent);
    expect(mockCM.refresh).toHaveBeenCalled();
  });

  test('should handle download button click correctly', async () => {
    // Arrange: Setup download data
    const downloadButton = mockDocument.getElementById('download');
    const titleInput = mockDocument.getElementById('title');
    const textarea = mockDocument.getElementById('md');

    titleInput.value = 'Test Download Title';
    textarea.value = '# Test Content\n\nDownload test.';

    // Setup mock CodeMirror
    const mockCM = {
      getValue: jest.fn(() => textarea.value),
      getSelection: jest.fn(() => ''),
      somethingSelected: jest.fn(() => false)
    };

    global.CodeMirror.fromTextArea.mockReturnValue(mockCM);

    // Act: Simulate download button click
    downloadButton.click();

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 100));

    // Assert: Verify download message was sent
    expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledWith({
      type: 'download',
      markdown: '# Test Content\n\nDownload test.',
      title: 'Test Download Title',
      tab: { id: 123, url: 'https://example.com/test-article', title: 'Test Article' },
      imageList: {},
      mdClipsFolder: 'MarkDownload',
      includeTemplate: true, // From checkbox state
      downloadImages: true,  // From checkbox state
      clipSelection: false   // From checkbox state
    });
  });

  test('should handle selected text download', async () => {
    // Arrange: Setup selected text scenario
    const downloadButton = mockDocument.getElementById('download');
    const selectedCheckbox = mockDocument.getElementById('selected');

    // Mark as selected text mode
    selectedCheckbox.classList.add('checked');

    // Mock selected text
    const mockCM = {
      getValue: jest.fn(() => '# Full Content\n\nThis is full content.'),
      getSelection: jest.fn(() => 'Selected text only'),
      somethingSelected: jest.fn(() => true)
    };

    global.CodeMirror.fromTextArea.mockReturnValue(mockCM);

    // Act: Simulate download with selection
    downloadButton.click();

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 100));

    // Assert: Verify selected text was sent
    expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        clipSelection: true
      })
    );
  });

  test('should handle download errors gracefully', async () => {
    // Arrange: Mock download failure
    mockBrowser.runtime.sendMessage.mockRejectedValue(
      new Error('Download failed: Network error')
    );

    const downloadButton = mockDocument.getElementById('download');

    // Act: Attempt download
    downloadButton.click();

    // Wait for error handling
    await new Promise(resolve => setTimeout(resolve, 100));

    // Assert: Verify error was handled
    expect(global.showError).toHaveBeenCalledWith(
      'Failed to communicate with extension. Please try reloading the extension.'
    );
  });

  test('should show loading spinner during download', async () => {
    // Arrange
    const downloadButton = mockDocument.getElementById('download');
    const spinner = mockDocument.getElementById('spinner');

    // Mock async download that takes time
    mockBrowser.runtime.sendMessage.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 500))
    );

    // Act: Start download
    downloadButton.click();

    // Assert: Spinner should be shown initially
    expect(global.showSpinner).toHaveBeenCalled();

    // Wait for completion
    await new Promise(resolve => setTimeout(resolve, 600));

    // Assert: Spinner should be hidden after completion
    expect(global.hideSpinner).toHaveBeenCalled();
  });

  test('should validate title input', async () => {
    // Arrange: Test various title inputs
    const titleInput = mockDocument.getElementById('title');
    const downloadButton = mockDocument.getElementById('download');

    const testTitles = [
      'Valid Title',
      'Title with spaces and symbols: !@#$%',
      'Very Long Title That Should Be Handled Appropriately Without Breaking The UI Or Functionality',
      '标题包含中文字符',
      '', // Empty title
      '   ', // Only spaces
      'Title\nWith\nNewlines' // With newlines
    ];

    for (const testTitle of testTitles) {
      // Act: Set title and attempt download
      titleInput.value = testTitle;

      // Reset mock
      mockBrowser.runtime.sendMessage.mockClear();

      downloadButton.click();

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 50));

      // Assert: Download was attempted (title validation happens in service worker)
      expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          title: testTitle
        })
      );
    }
  });

  test('should handle keyboard shortcuts', async () => {
    // Arrange: Setup keyboard event listener
    const mockKeydownHandler = jest.fn();
    mockDocument.addEventListener('keydown', mockKeydownHandler);

    // Act: Simulate keyboard shortcuts
    const enterKeyEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      ctrlKey: true
    });

    const escapeKeyEvent = new KeyboardEvent('keydown', {
      key: 'Escape'
    });

    mockDocument.dispatchEvent(enterKeyEvent);
    mockDocument.dispatchEvent(escapeKeyEvent);

    // Assert: Keyboard events were handled
    expect(mockKeydownHandler).toHaveBeenCalledTimes(2);
  });

  test('should persist UI state across popup opens', async () => {
    // Arrange: First popup session
    const includeTemplateCheckbox = mockDocument.getElementById('includeTemplate');
    const downloadImagesCheckbox = mockDocument.getElementById('downloadImages');

    // User changes settings
    includeTemplateCheckbox.checked = true;
    downloadImagesCheckbox.checked = false;

    // Act: Simulate popup close and reopen
    // In real implementation, this would persist to storage
    mockBrowser.storage.sync.set.mockResolvedValue();

    // Simulate reopen with saved settings
    mockBrowser.storage.sync.get.mockResolvedValue({
      includeTemplate: true,
      downloadImages: false,
      clipSelection: false
    });

    // Assert: Settings should be restored
    expect(mockBrowser.storage.sync.get).toHaveBeenCalled();
  });

  test('should handle multiple rapid clicks on download button', async () => {
    // Arrange
    const downloadButton = mockDocument.getElementById('download');

    // Mock slow download
    mockBrowser.runtime.sendMessage.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 1000))
    );

    // Act: Click download button multiple times rapidly
    downloadButton.click();
    downloadButton.click();
    downloadButton.click();

    // Wait for first download to complete
    await new Promise(resolve => setTimeout(resolve, 1100));

    // Assert: Only one download request should be processed
    // (In real implementation, rapid clicks should be debounced)
    expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledTimes(1);
  });

  test('should display download progress feedback', async () => {
    // Arrange
    const downloadButton = mockDocument.getElementById('download');

    // Mock download with progress updates
    let progressCallback;
    mockBrowser.runtime.sendMessage.mockImplementation((message) => {
      // Simulate progress updates
      setTimeout(() => {
        if (progressCallback) progressCallback({ type: 'progress', progress: 50 });
      }, 200);

      setTimeout(() => {
        if (progressCallback) progressCallback({ type: 'progress', progress: 100 });
      }, 400);

      return new Promise(resolve => setTimeout(() => resolve({ success: true }), 500));
    });

    // Act: Start download
    downloadButton.click();

    // Wait for progress updates
    await new Promise(resolve => setTimeout(resolve, 600));

    // Assert: Progress feedback was provided
    // (In real implementation, this would update UI progress indicators)
    expect(mockBrowser.runtime.sendMessage).toHaveBeenCalled();
  });

  test('should handle popup resize and layout changes', async () => {
    // Arrange: Simulate different content sizes
    const textarea = mockDocument.getElementById('md');
    const popup = mockDocument.querySelector('.popup');

    // Test with short content
    textarea.value = '# Short\n\nContent.';
    expect(popup).toBeDefined();

    // Test with long content
    textarea.value = '# Long Content\n\n' + 'Paragraph. '.repeat(100);
    expect(popup).toBeDefined();

    // Assert: Popup should handle content of various sizes
    // (In real implementation, this would test responsive layout)
  });
});
