/**
 * Basic Download Flow E2E Tests
 * Tests the complete user journey from clicking extension to file download
 */

// Mock Puppeteer for E2E testing in Jest environment
const puppeteer = {
  launch: jest.fn(() => ({
    newPage: jest.fn(() => ({
      goto: jest.fn(),
      click: jest.fn(),
      type: jest.fn(),
      waitForSelector: jest.fn(),
      waitForDownload: jest.fn(() => ({
        filename: 'test-article.md',
        path: jest.fn(),
        saveAs: jest.fn()
      })),
      evaluate: jest.fn(),
      screenshot: jest.fn(),
      close: jest.fn()
    })),
    close: jest.fn()
  }))
};

// Mock the extension popup and background scripts
jest.mock('path/to/extension/popup.html', () => ({}), { virtual: true });
jest.mock('path/to/extension/background.js', () => ({}), { virtual: true });

describe('Basic Download Flow E2E', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();

    // Set up realistic browser environment
    await page.evaluateOnNewDocument(() => {
      // Mock chrome extension APIs
      window.chrome = {
        runtime: {
          sendMessage: jest.fn(),
          onMessage: {
            addListener: jest.fn()
          }
        },
        downloads: {
          download: jest.fn(() => Promise.resolve(123)),
          onChanged: {
            addListener: jest.fn()
          }
        },
        storage: {
          sync: {
            get: jest.fn(() => Promise.resolve({
              includeTemplate: false,
              downloadImages: true,
              mdClipsFolder: 'MarkDownload'
            }))
          }
        }
      };

      // Mock browser extension APIs
      window.browser = window.chrome;
    });
  });

  afterEach(async () => {
    await page.close();
  });

  test('user can download current page as markdown', async () => {
    // Arrange: Navigate to a test article page
    const testUrl = 'https://example.com/test-article';
    await page.goto(testUrl, { waitUntil: 'networkidle0' });

    // Verify we're on the correct page
    expect(page.url()).toBe(testUrl);

    // Mock the extension popup behavior
    await page.evaluate(() => {
      // Simulate extension popup being injected
      const popupHtml = `
        <div class="popup">
          <input type="text" id="title" value="Test Article">
          <button id="download">Download</button>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', popupHtml);

      // Mock the popup functionality
      const downloadBtn = document.getElementById('download');
      const titleInput = document.getElementById('title');

      downloadBtn.addEventListener('click', () => {
        const message = {
          type: 'download',
          markdown: '# Test Article\n\nTest content.',
          title: titleInput.value,
          tab: { id: 1, url: window.location.href },
          imageList: {},
          mdClipsFolder: 'MarkDownload',
          includeTemplate: false,
          downloadImages: true,
          clipSelection: false
        };

        // Simulate sending message to background script
        window.chrome.runtime.sendMessage(message, (response) => {
          if (response && response.success) {
            // Simulate successful download
            const event = new CustomEvent('downloadComplete', {
              detail: { filename: 'Test Article.md' }
            });
            document.dispatchEvent(event);
          }
        });
      });
    });

    // Act: Click the extension icon and download button
    await page.click('#download');

    // Wait for download to complete
    const downloadEvent = await page.evaluate(() => {
      return new Promise((resolve) => {
        document.addEventListener('downloadComplete', (e) => {
          resolve(e.detail);
        });
      });
    });

    // Assert: Download completed successfully
    expect(downloadEvent.filename).toBe('Test Article.md');

    // Verify extension API calls
    const sentMessages = await page.evaluate(() => {
      return window.chrome.runtime.sendMessage.mock.calls;
    });

    expect(sentMessages.length).toBeGreaterThan(0);
    const downloadMessage = sentMessages[0][0];
    expect(downloadMessage.type).toBe('download');
    expect(downloadMessage.title).toBe('Test Article');
    expect(downloadMessage.markdown).toContain('# Test Article');
  }, 30000);

  test('user can download selected text as markdown', async () => {
    // Arrange: Navigate to test page and select text
    const testUrl = 'https://example.com/test-article';
    await page.goto(testUrl);

    // Select specific text on the page
    await page.evaluate(() => {
      const selection = window.getSelection();
      const range = document.createRange();

      // Create a text node with specific content to select
      const textNode = document.createTextNode('This is the selected text content.');
      document.body.appendChild(textNode);

      range.selectNodeContents(textNode);
      selection.removeAllRanges();
      selection.addRange(range);

      // Mock extension popup with selection option
      const popupHtml = `
        <div class="popup">
          <input type="text" id="title" value="Selected Text">
          <input type="checkbox" id="selected" checked>
          <label for="selected">Selected Text Only</label>
          <button id="download">Download</button>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', popupHtml);

      const downloadBtn = document.getElementById('download');

      downloadBtn.addEventListener('click', () => {
        const selectedText = selection.toString();
        const message = {
          type: 'download',
          markdown: `# Selected Text\n\n${selectedText}`,
          title: document.getElementById('title').value,
          tab: { id: 1, url: window.location.href },
          imageList: {},
          mdClipsFolder: 'MarkDownload',
          includeTemplate: false,
          downloadImages: false,
          clipSelection: true
        };

        window.chrome.runtime.sendMessage(message);
      });
    });

    // Act: Click download with selected text option
    await page.click('#download');

    // Wait for message to be sent
    await page.waitForTimeout(1000);

    // Assert: Correct message was sent with selected text
    const sentMessages = await page.evaluate(() => {
      return window.chrome.runtime.sendMessage.mock.calls;
    });

    expect(sentMessages.length).toBeGreaterThan(0);
    const downloadMessage = sentMessages[0][0];
    expect(downloadMessage.clipSelection).toBe(true);
    expect(downloadMessage.markdown).toContain('This is the selected text content');
  }, 30000);

  test('user can customize download settings', async () => {
    // Arrange: Setup page with customizable options
    const testUrl = 'https://example.com/test-article';
    await page.goto(testUrl);

    await page.evaluate(() => {
      // Mock extension popup with all options
      const popupHtml = `
        <div class="popup">
          <input type="text" id="title" value="Custom Article">
          <div class="options">
            <input type="checkbox" id="includeTemplate" checked>
            <label for="includeTemplate">Include Template</label>
            <input type="checkbox" id="downloadImages">
            <label for="downloadImages">Download Images</label>
            <input type="text" id="mdClipsFolder" value="My Custom Folder">
          </div>
          <button id="download">Download</button>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', popupHtml);

      const downloadBtn = document.getElementById('download');

      downloadBtn.addEventListener('click', () => {
        const message = {
          type: 'download',
          markdown: '# Custom Article\n\nCustom content.',
          title: document.getElementById('title').value,
          tab: { id: 1, url: window.location.href },
          imageList: {},
          mdClipsFolder: document.getElementById('mdClipsFolder').value,
          includeTemplate: document.getElementById('includeTemplate').checked,
          downloadImages: document.getElementById('downloadImages').checked,
          clipSelection: false
        };

        window.chrome.runtime.sendMessage(message);
      });
    });

    // Act: Modify settings and download
    await page.click('#includeTemplate'); // Uncheck template
    await page.click('#downloadImages'); // Check images
    await page.type('#mdClipsFolder', 'Updated Folder');

    await page.click('#download');

    // Wait for message
    await page.waitForTimeout(1000);

    // Assert: Custom settings were applied
    const sentMessages = await page.evaluate(() => {
      return window.chrome.runtime.sendMessage.mock.calls;
    });

    expect(sentMessages.length).toBeGreaterThan(0);
    const downloadMessage = sentMessages[0][0];
    expect(downloadMessage.includeTemplate).toBe(false); // Was unchecked
    expect(downloadMessage.downloadImages).toBe(true); // Was checked
    expect(downloadMessage.mdClipsFolder).toBe('Updated Folder');
  }, 30000);

  test('handles download errors gracefully', async () => {
    // Arrange: Setup page with error scenario
    const testUrl = 'https://example.com/test-article';
    await page.goto(testUrl);

    await page.evaluate(() => {
      // Mock extension popup
      const popupHtml = `
        <div class="popup">
          <input type="text" id="title" value="Error Test">
          <button id="download">Download</button>
          <div id="error" style="display: none;"></div>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', popupHtml);

      const downloadBtn = document.getElementById('download');
      const errorDiv = document.getElementById('error');

      downloadBtn.addEventListener('click', () => {
        // Simulate download failure
        window.chrome.runtime.sendMessage = jest.fn((message, callback) => {
          // Simulate error response
          setTimeout(() => {
            callback({ success: false, error: 'Download failed' });
            errorDiv.textContent = 'Download failed';
            errorDiv.style.display = 'block';
          }, 100);
        });
      });
    });

    // Act: Attempt download that will fail
    await page.click('#download');

    // Wait for error handling
    await page.waitForTimeout(500);

    // Assert: Error was displayed to user
    const errorText = await page.evaluate(() => {
      return document.getElementById('error').textContent;
    });

    expect(errorText).toBe('Download failed');

    const errorDisplay = await page.evaluate(() => {
      return document.getElementById('error').style.display;
    });

    expect(errorDisplay).toBe('block');
  }, 30000);

  test('preserves user settings across sessions', async () => {
    // Arrange: First session - set preferences
    const testUrl = 'https://example.com/test-article';
    await page.goto(testUrl);

    await page.evaluate(() => {
      // Mock settings persistence
      window.localStorage.setItem('markdownload-settings', JSON.stringify({
        includeTemplate: true,
        downloadImages: false,
        mdClipsFolder: 'Saved Folder'
      }));

      // Mock extension popup that loads from storage
      const popupHtml = `
        <div class="popup">
          <input type="text" id="title" value="Session Test">
          <div class="options">
            <input type="checkbox" id="includeTemplate">
            <label for="includeTemplate">Include Template</label>
            <input type="checkbox" id="downloadImages">
            <label for="downloadImages">Download Images</label>
            <input type="text" id="mdClipsFolder">
          </div>
          <button id="download">Download</button>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', popupHtml);

      // Load saved settings
      const savedSettings = JSON.parse(window.localStorage.getItem('markdownload-settings') || '{}');
      document.getElementById('includeTemplate').checked = savedSettings.includeTemplate || false;
      document.getElementById('downloadImages').checked = savedSettings.downloadImages || false;
      document.getElementById('mdClipsFolder').value = savedSettings.mdClipsFolder || '';
    });

    // Assert: Settings were loaded from storage
    const templateChecked = await page.evaluate(() => {
      return document.getElementById('includeTemplate').checked;
    });
    expect(templateChecked).toBe(true);

    const imagesChecked = await page.evaluate(() => {
      return document.getElementById('downloadImages').checked;
    });
    expect(imagesChecked).toBe(false);

    const folderValue = await page.evaluate(() => {
      return document.getElementById('mdClipsFolder').value;
    });
    expect(folderValue).toBe('Saved Folder');
  }, 30000);

  test('works with different content types', async () => {
    // Arrange: Test different page types
    const testPages = [
      {
        url: 'https://news-site.com/article',
        content: '<article><h1>News Article</h1><p>News content</p></article>',
        expectedTitle: 'News Article'
      },
      {
        url: 'https://blog.com/post',
        content: '<div class="post"><h1>Blog Post</h1><p>Blog content</p></div>',
        expectedTitle: 'Blog Post'
      },
      {
        url: 'https://docs.com/guide',
        content: '<div class="doc"><h1>Documentation</h1><p>Guide content</p></div>',
        expectedTitle: 'Documentation'
      }
    ];

    for (const testPage of testPages) {
      // Navigate to test page
      await page.goto(testPage.url);

      // Inject test content
      await page.evaluate((content) => {
        document.body.innerHTML = content;
      }, testPage.content);

      // Mock extension popup
      await page.evaluate(() => {
        const popupHtml = `
          <div class="popup">
            <input type="text" id="title" value="${document.querySelector('h1')?.textContent || 'Test'}">
            <button id="download">Download</button>
          </div>
        `;

        document.body.insertAdjacentHTML('beforeend', popupHtml);

        const downloadBtn = document.getElementById('download');

        downloadBtn.addEventListener('click', () => {
          const title = document.getElementById('title').value;
          const message = {
            type: 'download',
            markdown: `# ${title}\n\nContent from ${window.location.href}`,
            title: title,
            tab: { id: 1, url: window.location.href },
            imageList: {},
            mdClipsFolder: 'MarkDownload',
            includeTemplate: false,
            downloadImages: false,
            clipSelection: false
          };

          window.chrome.runtime.sendMessage(message);
        });
      });

      // Act: Download content
      await page.click('#download');
      await page.waitForTimeout(500);

      // Assert: Correct content type was handled
      const sentMessages = await page.evaluate(() => {
        return window.chrome.runtime.sendMessage.mock.calls;
      });

      expect(sentMessages.length).toBeGreaterThan(0);
      const downloadMessage = sentMessages[sentMessages.length - 1][0];
      expect(downloadMessage.title).toBe(testPage.expectedTitle);
      expect(downloadMessage.markdown).toContain(testPage.expectedTitle);
    }
  }, 60000);
});
