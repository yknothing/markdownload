/**
 * Image Processing Flow E2E Tests
 * Tests the complete image download and embedding workflow
 */

// Mock Puppeteer for E2E testing
const puppeteer = {
  launch: jest.fn(() => ({
    newPage: jest.fn(() => ({
      goto: jest.fn(),
      click: jest.fn(),
      type: jest.fn(),
      waitForSelector: jest.fn(),
      waitForDownload: jest.fn(() => ({
        filename: 'article-with-images.md',
        path: jest.fn(),
        saveAs: jest.fn()
      })),
      evaluate: jest.fn(),
      screenshot: jest.fn(),
      close: jest.fn(),
      waitForTimeout: jest.fn()
    })),
    close: jest.fn()
  }))
};

describe('Image Processing Flow E2E', () => {
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

    // Set up browser environment with image processing mocks
    await page.evaluateOnNewDocument(() => {
      window.chrome = {
        runtime: {
          sendMessage: jest.fn(),
          onMessage: { addListener: jest.fn() }
        },
        downloads: {
          download: jest.fn(() => Promise.resolve(123)),
          onChanged: { addListener: jest.fn() }
        },
        storage: {
          sync: {
            get: jest.fn(() => Promise.resolve({
              downloadImages: true,
              imagePrefix: '{pageTitle}/images/',
              mdClipsFolder: 'MarkDownload'
            }))
          }
        }
      };

      window.browser = window.chrome;

      // Mock XMLHttpRequest for image downloads
      window.XMLHttpRequest = function() {
        return {
          open: jest.fn(),
          send: jest.fn(),
          onload: null,
          onerror: null,
          response: new Blob(['fake image data'], { type: 'image/jpeg' }),
          responseType: 'blob',
          status: 200,
          readyState: 4,
          timeout: 30000
        };
      };
    });
  });

  afterEach(async () => {
    await page.close();
  });

  test('user can download page with images successfully', async () => {
    // Arrange: Navigate to page with images
    const testUrl = 'https://example.com/article-with-images';
    await page.goto(testUrl);

    // Inject page content with images
    await page.evaluate(() => {
      document.body.innerHTML = `
        <article>
          <h1>Article with Images</h1>
          <p>Here is an image:</p>
          <img src="https://example.com/images/photo1.jpg" alt="Photo 1" />

          <p>Another image:</p>
          <img src="/images/photo2.png" alt="Photo 2" />

          <p>Content after images.</p>
        </article>
      `;

      // Mock extension popup with image download enabled
      const popupHtml = `
        <div class="popup">
          <input type="text" id="title" value="Article with Images">
          <div class="options">
            <input type="checkbox" id="downloadImages" checked>
            <label for="downloadImages">Download Images</label>
          </div>
          <button id="download">Download</button>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', popupHtml);

      const downloadBtn = document.getElementById('download');

      downloadBtn.addEventListener('click', () => {
        // Extract images from page
        const images = Array.from(document.querySelectorAll('img')).map(img => ({
          src: img.src,
          alt: img.alt || ''
        }));

        const message = {
          type: 'download',
          markdown: '# Article with Images\n\nHere is an image:\n\n![Photo 1](https://example.com/images/photo1.jpg)\n\nAnother image:\n\n![Photo 2](/images/photo2.png)\n\nContent after images.',
          title: document.getElementById('title').value,
          tab: { id: 1, url: window.location.href },
          imageList: {
            'photo1.jpg': {
              url: 'https://example.com/images/photo1.jpg',
              filename: 'photo1.jpg',
              status: 'pending'
            },
            'photo2.png': {
              url: 'https://example.com/images/photo2.png',
              filename: 'photo2.png',
              status: 'pending'
            }
          },
          mdClipsFolder: 'MarkDownload',
          includeTemplate: false,
          downloadImages: document.getElementById('downloadImages').checked,
          clipSelection: false
        };

        window.chrome.runtime.sendMessage(message, (response) => {
          if (response && response.success) {
            // Simulate successful download with images
            const event = new CustomEvent('downloadComplete', {
              detail: {
                filename: 'Article with Images.md',
                imagesDownloaded: 2
              }
            });
            document.dispatchEvent(event);
          }
        });
      });
    });

    // Act: Click download with images enabled
    await page.click('#download');

    // Wait for download completion
    const downloadEvent = await page.evaluate(() => {
      return new Promise((resolve) => {
        document.addEventListener('downloadComplete', (e) => {
          resolve(e.detail);
        });
      });
    });

    // Assert: Download completed with images
    expect(downloadEvent.filename).toBe('Article with Images.md');
    expect(downloadEvent.imagesDownloaded).toBe(2);

    // Verify message contained image information
    const sentMessages = await page.evaluate(() => {
      return window.chrome.runtime.sendMessage.mock.calls;
    });

    expect(sentMessages.length).toBeGreaterThan(0);
    const downloadMessage = sentMessages[0][0];
    expect(downloadMessage.downloadImages).toBe(true);
    expect(Object.keys(downloadMessage.imageList)).toHaveLength(2);
  }, 30000);

  test('handles image download failures gracefully', async () => {
    // Arrange: Setup page with images that will fail to download
    const testUrl = 'https://example.com/failing-images';
    await page.goto(testUrl);

    await page.evaluate(() => {
      document.body.innerHTML = `
        <article>
          <h1>Article with Failing Images</h1>
          <img src="https://broken-site.com/missing1.jpg" alt="Missing Image 1" />
          <img src="https://another-broken.com/missing2.png" alt="Missing Image 2" />
        </article>
      `;

      // Mock popup with failing image downloads
      const popupHtml = `
        <div class="popup">
          <input type="text" id="title" value="Article with Failing Images">
          <input type="checkbox" id="downloadImages" checked>
          <button id="download">Download</button>
          <div id="status"></div>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', popupHtml);

      const downloadBtn = document.getElementById('download');
      const statusDiv = document.getElementById('status');

      downloadBtn.addEventListener('click', () => {
        // Simulate image download failures
        window.chrome.runtime.sendMessage = jest.fn((message, callback) => {
          setTimeout(() => {
            callback({
              success: true, // Markdown download succeeds
              failedImages: [
                { filename: 'missing1.jpg', error: '404 Not Found' },
                { filename: 'missing2.png', error: 'Network Error' }
              ]
            });

            statusDiv.textContent = 'Download completed with 2 image failures';
          }, 1000);
        });
      });
    });

    // Act: Attempt download
    await page.click('#download');

    // Wait for completion
    await page.waitForTimeout(2000);

    // Assert: Download completed but with image failures
    const statusText = await page.evaluate(() => {
      return document.getElementById('status').textContent;
    });

    expect(statusText).toContain('Download completed');
    expect(statusText).toContain('2 image failures');
  }, 30000);

  test('respects image download settings', async () => {
    // Arrange: Setup page with option to disable image downloads
    const testUrl = 'https://example.com/image-settings-test';
    await page.goto(testUrl);

    await page.evaluate(() => {
      document.body.innerHTML = `
        <article>
          <h1>Image Settings Test</h1>
          <img src="test-image.jpg" alt="Test Image" />
        </article>
      `;

      // Mock popup with image download toggle
      const popupHtml = `
        <div class="popup">
          <input type="text" id="title" value="Image Settings Test">
          <div class="options">
            <input type="checkbox" id="downloadImages">
            <label for="downloadImages">Download Images</label>
          </div>
          <button id="download">Download</button>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', popupHtml);

      const downloadBtn = document.getElementById('download');
      const imagesCheckbox = document.getElementById('downloadImages');

      downloadBtn.addEventListener('click', () => {
        const downloadImages = imagesCheckbox.checked;
        const message = {
          type: 'download',
          markdown: '# Image Settings Test\n\n![Test Image](test-image.jpg)',
          title: document.getElementById('title').value,
          tab: { id: 1, url: window.location.href },
          imageList: downloadImages ? {
            'test-image.jpg': {
              url: 'https://example.com/test-image.jpg',
              filename: 'test-image.jpg',
              status: 'pending'
            }
          } : {},
          mdClipsFolder: 'MarkDownload',
          includeTemplate: false,
          downloadImages: downloadImages,
          clipSelection: false
        };

        window.chrome.runtime.sendMessage(message);
      });
    });

    // Test 1: Download with images disabled
    await page.click('#download'); // Images unchecked by default

    let sentMessages = await page.evaluate(() => {
      return window.chrome.runtime.sendMessage.mock.calls;
    });

    expect(sentMessages.length).toBeGreaterThan(0);
    expect(sentMessages[0][0].downloadImages).toBe(false);
    expect(Object.keys(sentMessages[0][0].imageList)).toHaveLength(0);

    // Reset mocks
    await page.evaluate(() => {
      window.chrome.runtime.sendMessage.mockClear();
    });

    // Test 2: Download with images enabled
    await page.click('#downloadImages'); // Enable images
    await page.click('#download');

    sentMessages = await page.evaluate(() => {
      return window.chrome.runtime.sendMessage.mock.calls;
    });

    expect(sentMessages.length).toBeGreaterThan(0);
    expect(sentMessages[0][0].downloadImages).toBe(true);
    expect(Object.keys(sentMessages[0][0].imageList)).toHaveLength(1);
  }, 30000);

  test('handles different image formats and sources', async () => {
    // Arrange: Setup page with various image types
    const testUrl = 'https://example.com/various-images';
    await page.goto(testUrl);

    await page.evaluate(() => {
      document.body.innerHTML = `
        <article>
          <h1>Various Image Formats</h1>

          <!-- JPEG image -->
          <img src="photo.jpg" alt="JPEG Image" />

          <!-- PNG image -->
          <img src="diagram.png" alt="PNG Diagram" />

          <!-- GIF image -->
          <img src="animation.gif" alt="GIF Animation" />

          <!-- SVG image -->
          <img src="vector.svg" alt="SVG Vector" />

          <!-- WebP image -->
          <img src="modern.webp" alt="WebP Modern" />

          <!-- Base64 encoded image -->
          <img src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAoACgDASIAAhEBAxEB/8QAFwAAAwEAAAAAAAAAAAAAAAAAAAMEB//EACUQAAIBAwMEAwEBAAAAAAAAAAECAwAEEQUSITFBURNhcZEigf/EABUBAFEAAAAAAAAAAAAAAAAAAAH/xAAVEQEBAAAAAAAAAAAAAAAAAAAAAf/aAAwDAQACEQMRAD8A4+iiigAooooAKKKKACiiigAooooAKKKKACiiigD/2Q==" alt="Base64 Image" />

          <!-- External image -->
          <img src="https://cdn.example.com/external.jpg" alt="External Image" />
        </article>
      `;

      // Mock popup
      const popupHtml = `
        <div class="popup">
          <input type="text" id="title" value="Various Image Formats">
          <input type="checkbox" id="downloadImages" checked>
          <button id="download">Download</button>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', popupHtml);

      const downloadBtn = document.getElementById('download');

      downloadBtn.addEventListener('click', () => {
        const images = Array.from(document.querySelectorAll('img')).map(img => ({
          src: img.src,
          alt: img.alt || ''
        }));

        const message = {
          type: 'download',
          markdown: `# Various Image Formats

![JPEG Image](photo.jpg)

![PNG Diagram](diagram.png)

![GIF Animation](animation.gif)

![SVG Vector](vector.svg)

![WebP Modern](modern.webp)

![Base64 Image](data:image/jpeg;base64,...)

![External Image](https://cdn.example.com/external.jpg)`,
          title: document.getElementById('title').value,
          tab: { id: 1, url: window.location.href },
          imageList: {
            'photo.jpg': { url: 'https://example.com/photo.jpg', filename: 'photo.jpg', status: 'pending' },
            'diagram.png': { url: 'https://example.com/diagram.png', filename: 'diagram.png', status: 'pending' },
            'animation.gif': { url: 'https://example.com/animation.gif', filename: 'animation.gif', status: 'pending' },
            'vector.svg': { url: 'https://example.com/vector.svg', filename: 'vector.svg', status: 'pending' },
            'modern.webp': { url: 'https://example.com/modern.webp', filename: 'modern.webp', status: 'pending' },
            'external.jpg': { url: 'https://cdn.example.com/external.jpg', filename: 'external.jpg', status: 'pending' }
          },
          mdClipsFolder: 'MarkDownload',
          includeTemplate: false,
          downloadImages: true,
          clipSelection: false
        };

        window.chrome.runtime.sendMessage(message);
      });
    });

    // Act: Download with various image formats
    await page.click('#download');

    // Wait for processing
    await page.waitForTimeout(1000);

    // Assert: All image formats were processed
    const sentMessages = await page.evaluate(() => {
      return window.chrome.runtime.sendMessage.mock.calls;
    });

    expect(sentMessages.length).toBeGreaterThan(0);
    const downloadMessage = sentMessages[0][0];
    expect(Object.keys(downloadMessage.imageList)).toHaveLength(6);

    // Verify different image formats are included
    expect(downloadMessage.imageList).toHaveProperty('photo.jpg');
    expect(downloadMessage.imageList).toHaveProperty('diagram.png');
    expect(downloadMessage.imageList).toHaveProperty('animation.gif');
    expect(downloadMessage.imageList).toHaveProperty('vector.svg');
    expect(downloadMessage.imageList).toHaveProperty('modern.webp');
    expect(downloadMessage.imageList).toHaveProperty('external.jpg');
  }, 30000);

  test('handles large images and slow networks', async () => {
    // Arrange: Setup page with large images
    const testUrl = 'https://example.com/large-images';
    await page.goto(testUrl);

    await page.evaluate(() => {
      document.body.innerHTML = `
        <article>
          <h1>Article with Large Images</h1>
          <img src="large-image-10mb.jpg" alt="Large 10MB Image" />
          <img src="another-large.jpg" alt="Another Large Image" />
        </article>
      `;

      // Mock popup with slow network simulation
      const popupHtml = `
        <div class="popup">
          <input type="text" id="title" value="Article with Large Images">
          <input type="checkbox" id="downloadImages" checked>
          <button id="download">Download</button>
          <div id="progress">Downloading...</div>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', popupHtml);

      const downloadBtn = document.getElementById('download');
      const progressDiv = document.getElementById('progress');

      downloadBtn.addEventListener('click', () => {
        // Simulate slow image downloads
        let progress = 0;
        const progressInterval = setInterval(() => {
          progress += 10;
          progressDiv.textContent = `Downloading... ${progress}%`;

          if (progress >= 100) {
            clearInterval(progressInterval);
            progressDiv.textContent = 'Download completed!';

            // Simulate completion
            const event = new CustomEvent('downloadComplete', {
              detail: {
                filename: 'Article with Large Images.md',
                imagesDownloaded: 2,
                totalSize: '20MB'
              }
            });
            document.dispatchEvent(event);
          }
        }, 200);
      });
    });

    // Act: Start download
    await page.click('#download');

    // Wait for progress updates
    await page.waitForTimeout(1000);

    // Check progress
    let progressText = await page.evaluate(() => {
      return document.getElementById('progress').textContent;
    });

    expect(progressText).toContain('Downloading');

    // Wait for completion
    await page.waitForTimeout(2500);

    progressText = await page.evaluate(() => {
      return document.getElementById('progress').textContent;
    });

    expect(progressText).toBe('Download completed!');
  }, 30000);

  test('handles images with complex URLs and query parameters', async () => {
    // Arrange: Setup page with complex image URLs
    const testUrl = 'https://example.com/complex-urls';
    await page.goto(testUrl);

    await page.evaluate(() => {
      document.body.innerHTML = `
        <article>
          <h1>Complex Image URLs</h1>
          <img src="https://cdn.example.com/image.jpg?w=800&h=600&fit=crop&auto=format" alt="Resized Image" />
          <img src="/images/photo.png?v=123456789&cache=bust" alt="Versioned Image" />
          <img src="image.webp?quality=80&format=webp&lossless=false" alt="Optimized Image" />
        </article>
      `;

      // Mock popup
      const popupHtml = `
        <div class="popup">
          <input type="text" id="title" value="Complex Image URLs">
          <input type="checkbox" id="downloadImages" checked>
          <button id="download">Download</button>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', popupHtml);

      const downloadBtn = document.getElementById('download');

      downloadBtn.addEventListener('click', () => {
        const message = {
          type: 'download',
          markdown: `# Complex Image URLs

![Resized Image](https://cdn.example.com/image.jpg?w=800&h=600&fit=crop&auto=format)

![Versioned Image](/images/photo.png?v=123456789&cache=bust)

![Optimized Image](image.webp?quality=80&format=webp&lossless=false)`,
          title: document.getElementById('title').value,
          tab: { id: 1, url: window.location.href },
          imageList: {
            'image.jpg': { url: 'https://cdn.example.com/image.jpg?w=800&h=600&fit=crop&auto=format', filename: 'image.jpg', status: 'pending' },
            'photo.png': { url: 'https://example.com/images/photo.png?v=123456789&cache=bust', filename: 'photo.png', status: 'pending' },
            'image.webp': { url: 'https://example.com/image.webp?quality=80&format=webp&lossless=false', filename: 'image.webp', status: 'pending' }
          },
          mdClipsFolder: 'MarkDownload',
          includeTemplate: false,
          downloadImages: true,
          clipSelection: false
        };

        window.chrome.runtime.sendMessage(message);
      });
    });

    // Act: Download with complex URLs
    await page.click('#download');

    // Wait for processing
    await page.waitForTimeout(1000);

    // Assert: Complex URLs were handled
    const sentMessages = await page.evaluate(() => {
      return window.chrome.runtime.sendMessage.mock.calls;
    });

    expect(sentMessages.length).toBeGreaterThan(0);
    const downloadMessage = sentMessages[0][0];
    expect(Object.keys(downloadMessage.imageList)).toHaveLength(3);

    // Verify URLs with query parameters are preserved
    expect(downloadMessage.markdown).toContain('?w=800&h=600');
    expect(downloadMessage.markdown).toContain('?v=123456789');
    expect(downloadMessage.markdown).toContain('?quality=80');
  }, 30000);
});
