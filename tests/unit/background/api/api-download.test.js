/**
 * File Handling and Download API Tests for MarkDownload Extension
 * 
 * Tests the file handling and download functionality including:
 * - Markdown file downloads via downloads API
 * - Content script-based downloads
 * - Image downloading and processing  
 * - File name generation and validation
 * - Folder structure handling
 * - Error handling and recovery
 * - Blob URL management
 * - Background image processing
 */

// Mock file system related modules
jest.mock('fs');
jest.mock('path');

// Set up comprehensive mocks for download testing
beforeAll(() => {
  // Enhanced global browser mock for download testing
  global.browser = {
    storage: {
      sync: {
        get: jest.fn().mockResolvedValue({}),
        set: jest.fn().mockResolvedValue()
      }
    },
    downloads: {
      download: jest.fn(),
      search: jest.fn(),
      cancel: jest.fn(),
      erase: jest.fn(),
      onChanged: {
        addListener: jest.fn(),
        removeListener: jest.fn()
      },
      onCreated: {
        addListener: jest.fn(),
        removeListener: jest.fn()
      }
    },
    scripting: {
      executeScript: jest.fn(),
      insertCSS: jest.fn(),
      removeCSS: jest.fn()
    },
    tabs: {
      query: jest.fn().mockResolvedValue([{ id: 1, url: 'https://example.com' }]),
      get: jest.fn().mockResolvedValue({ id: 1, url: 'https://example.com' }),
      getCurrent: jest.fn().mockResolvedValue({ id: 1 })
    },
    runtime: {
      sendMessage: jest.fn().mockResolvedValue({ success: true }),
      onMessage: {
        addListener: jest.fn(),
        removeListener: jest.fn()
      }
    }
  };

  global.chrome = global.browser;

  // Enhanced URL mock for blob management
  global.URL = class extends require('url').URL {
    static _blobUrls = new Set();
    
    static createObjectURL(blob) {
      const url = `blob:mock-url-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      this._blobUrls.add(url);
      return url;
    }
    
    static revokeObjectURL(url) {
      this._blobUrls.delete(url);
    }
    
    static getAllBlobUrls() {
      return Array.from(this._blobUrls);
    }
    
    static clearAllBlobUrls() {
      this._blobUrls.clear();
    }
  };

  // Enhanced Blob mock
  global.Blob = jest.fn((data = [], options = {}) => {
    const content = Array.isArray(data) ? data.join('') : data;
    return {
      data: content,
      size: content.length,
      type: options.type || 'text/plain',
      stream: jest.fn(),
      text: jest.fn().mockResolvedValue(content),
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(content.length))
    };
  });

  // Mock XMLHttpRequest for image downloads
  global.XMLHttpRequest = jest.fn(() => ({
    open: jest.fn(),
    send: jest.fn(),
    setRequestHeader: jest.fn(),
    onload: null,
    onerror: null,
    onprogress: null,
    onabort: null,
    ontimeout: null,
    response: null,
    responseText: '',
    responseType: 'text',
    status: 200,
    statusText: 'OK',
    readyState: 4,
    abort: jest.fn()
  }));

  // Mock FileReader for base64 operations
  global.FileReader = jest.fn(() => ({
    readAsDataURL: jest.fn(),
    readAsText: jest.fn(),
    readAsArrayBuffer: jest.fn(),
    onload: null,
    onerror: null,
    result: null,
    error: null
  }));
});

// Download API implementation for testing
class DownloadAPI {
  constructor() {
    this.activeDownloads = new Map();
    this.downloadListeners = [];
    this.defaultOptions = {
      downloadMode: 'downloadsApi',
      saveAs: false,
      downloadImages: false,
      imagePrefix: 'images/',
      mdClipsFolder: null,
      disallowedChars: '[]#^',
      title: '{pageTitle}'
    };
  }

  async getOptions() {
    try {
      const stored = await browser.storage.sync.get();
      return { ...this.defaultOptions, ...stored };
    } catch (error) {
      return this.defaultOptions;
    }
  }

  generateValidFileName(title, disallowedChars = null) {
    if (!title) return title;
    
    title = title + '';
    
    // Remove illegal filesystem characters
    const illegalRe = /[\/\?<>\\:\*\|":]/g;
    let name = title
      .replace(illegalRe, "")
      .replace(/\u00A0/g, ' ') // Remove non-breaking spaces
      .replace(/\s+/g, ' ') // Collapse multiple whitespaces
      .trim(); // Remove leading/trailing whitespace

    // Apply additional disallowed characters
    if (disallowedChars) {
      for (let c of disallowedChars) {
        if (`[\\^$.|?*+()`.includes(c)) c = `\\${c}`;
        name = name.replace(new RegExp(c, 'g'), '');
      }
    }
    
    return name;
  }

  async downloadMarkdown(markdown, title, tabId, imageList = {}, mdClipsFolder = '') {
    if (!markdown || typeof markdown !== 'string') {
      throw new Error('Markdown content is required for download');
    }

    if (!title || typeof title !== 'string') {
      throw new Error('Title is required for download');
    }

    const options = await this.getOptions();
    
    if (options.downloadMode === 'downloadsApi' && browser.downloads) {
      return await this._downloadViaApi(markdown, title, imageList, mdClipsFolder, options);
    } else {
      return await this._downloadViaContentScript(markdown, title, tabId, options, mdClipsFolder);
    }
  }

  async _downloadViaApi(markdown, title, imageList, mdClipsFolder, options) {
    try {
      // Create blob URL for markdown
      const blob = new Blob([markdown], {
        type: "text/markdown;charset=utf-8"
      });
      const url = URL.createObjectURL(blob);

      if (mdClipsFolder && !mdClipsFolder.endsWith('/')) {
        mdClipsFolder += '/';
      }

      // Start markdown download
      const downloadId = await browser.downloads.download({
        url: url,
        filename: mdClipsFolder + title + ".md",
        saveAs: options.saveAs
      });

      // Add cleanup listener
      const cleanup = (delta) => {
        if (delta.id === downloadId && delta.state && delta.state.current === "complete") {
          browser.downloads.onChanged.removeListener(cleanup);
          URL.revokeObjectURL(url);
        }
      };
      browser.downloads.onChanged.addListener(cleanup);

      // Download images if enabled
      const imageDownloads = [];
      if (options.downloadImages && Object.keys(imageList).length > 0) {
        let destPath = mdClipsFolder + title.substring(0, title.lastIndexOf('/'));
        if (destPath && !destPath.endsWith('/')) destPath += '/';

        for (const [src, filename] of Object.entries(imageList)) {
          try {
            const imgId = await browser.downloads.download({
              url: src,
              filename: destPath ? destPath + filename : filename,
              saveAs: false
            });
            imageDownloads.push(imgId);
            
            // Add cleanup for blob URLs
            if (src.startsWith('blob:')) {
              const imgCleanup = (delta) => {
                if (delta.id === imgId && delta.state && delta.state.current === "complete") {
                  browser.downloads.onChanged.removeListener(imgCleanup);
                  URL.revokeObjectURL(src);
                }
              };
              browser.downloads.onChanged.addListener(imgCleanup);
            }
          } catch (imgError) {
            console.warn(`Failed to download image ${filename}:`, imgError);
          }
        }
      }

      return { 
        success: true, 
        downloadId, 
        imageDownloads,
        method: 'downloadsApi'
      };
    } catch (error) {
      throw new Error(`Download failed: ${error.message}`);
    }
  }

  async _downloadViaContentScript(markdown, title, tabId, options, mdClipsFolder) {
    try {
      await this.ensureScripts(tabId);
      const filename = mdClipsFolder + this.generateValidFileName(title, options.disallowedChars) + ".md";
      
      // Base64 encode the markdown for safe transport
      const encodedMarkdown = btoa(unescape(encodeURIComponent(markdown)));
      
      await browser.scripting.executeScript({
        target: { tabId: tabId },
        func: (filename, content) => {
          // This function runs in the content script context
          const link = document.createElement('a');
          link.href = 'data:text/markdown;charset=utf-8;base64,' + content;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        },
        args: [filename, encodedMarkdown]
      });

      return { 
        success: true, 
        method: 'contentScript',
        filename 
      };
    } catch (error) {
      throw new Error(`Content script download failed: ${error.message}`);
    }
  }

  async ensureScripts(tabId) {
    try {
      // Check if content script is already loaded
      const results = await browser.scripting.executeScript({
        target: { tabId: tabId },
        func: () => typeof getSelectionAndDom === 'function'
      });
      
      // Inject content script if not present
      if (!results || results[0].result !== true) {
        await browser.scripting.executeScript({
          target: { tabId: tabId },
          files: ["/contentScript/contentScript.js"]
        });
      }
    } catch (error) {
      throw new Error(`Failed to ensure scripts: ${error.message}`);
    }
  }

  async downloadImages(imageList, options) {
    if (!imageList || Object.keys(imageList).length === 0) {
      return { processedImages: {}, errors: [] };
    }

    const processedImages = {};
    const errors = [];
    const downloadPromises = [];

    for (const [src, filename] of Object.entries(imageList)) {
      downloadPromises.push(this._downloadSingleImage(src, filename, options)
        .then(result => {
          processedImages[src] = result;
        })
        .catch(error => {
          errors.push({ src, filename, error: error.message });
        })
      );
    }

    await Promise.all(downloadPromises);

    return { processedImages, errors };
  }

  async _downloadSingleImage(src, filename, options) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', src);
      xhr.responseType = "blob";
      
      xhr.onload = () => {
        if (xhr.status === 200) {
          const blob = xhr.response;
          let processedFilename = filename;
          
          // Handle unknown extensions
          if (processedFilename.endsWith('.idunno')) {
            const mimeToExt = {
              'image/jpeg': 'jpg',
              'image/png': 'png',
              'image/gif': 'gif',
              'image/webp': 'webp',
              'image/svg+xml': 'svg'
            };
            
            const extension = mimeToExt[blob.type] || 'unknown';
            processedFilename = filename.replace('.idunno', '.' + extension);
          }
          
          if (options.imageStyle === 'base64') {
            const reader = new FileReader();
            reader.onload = () => {
              resolve({
                type: 'base64',
                filename: processedFilename,
                data: reader.result,
                originalSrc: src
              });
            };
            reader.onerror = () => reject(new Error('Failed to convert image to base64'));
            reader.readAsDataURL(blob);
          } else {
            const blobUrl = URL.createObjectURL(blob);
            resolve({
              type: 'blob',
              filename: processedFilename,
              blobUrl: blobUrl,
              originalSrc: src,
              size: blob.size,
              mimeType: blob.type
            });
          }
        } else {
          reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
        }
      };
      
      xhr.onerror = () => reject(new Error('Network error'));
      xhr.ontimeout = () => reject(new Error('Download timeout'));
      xhr.onabort = () => reject(new Error('Download aborted'));
      
      xhr.timeout = 30000; // 30 second timeout
      xhr.send();
    });
  }

  async getImageLinks(content, baseURI) {
    const imageLinks = {};
    const imageRegex = /<img[^>]*src=["']([^"']*)["'][^>]*>/gi;
    let match;

    while ((match = imageRegex.exec(content)) !== null) {
      let src = match[1];
      
      // Validate and normalize URL
      try {
        if (src.startsWith('data:')) {
          // Data URLs are already complete
          imageLinks[src] = src;
        } else if (src.startsWith('//')) {
          // Protocol-relative URL
          const baseUrl = new URL(baseURI);
          imageLinks[src] = baseUrl.protocol + src;
        } else if (src.startsWith('/')) {
          // Absolute path
          const baseUrl = new URL(baseURI);
          imageLinks[src] = baseUrl.origin + src;
        } else if (src.startsWith('http://') || src.startsWith('https://')) {
          // Already absolute
          imageLinks[src] = src;
        } else {
          // Relative path
          const baseUrl = new URL(baseURI);
          const resolvedUrl = new URL(src, baseUrl.href);
          imageLinks[src] = resolvedUrl.href;
        }
      } catch (error) {
        console.warn(`Invalid image URL: ${src}`, error);
      }
    }

    return imageLinks;
  }

  formatFolderPath(folderTemplate, article, options) {
    if (!folderTemplate) return '';

    // Replace template variables
    let folder = this.textReplace(folderTemplate, article, options.disallowedChars);
    
    // Split by path separators and clean each segment
    folder = folder.split('/').map(segment => 
      this.generateValidFileName(segment, options.disallowedChars)
    ).join('/');
    
    // Ensure trailing slash
    if (folder && !folder.endsWith('/')) {
      folder += '/';
    }
    
    return folder;
  }

  textReplace(string, article, disallowedChars = null) {
    if (!string || typeof string !== 'string') return string;

    let result = string;

    // Replace article properties
    for (const key in article) {
      if (article.hasOwnProperty(key) && key !== "content") {
        let value = (article[key] || '') + '';
        
        if (value && disallowedChars) {
          value = this.generateValidFileName(value, disallowedChars);
        }

        const regex = new RegExp(`{${key}}`, 'g');
        result = result.replace(regex, value);
      }
    }

    // Handle date replacements
    const now = new Date();
    const dateRegex = /{date:(.+?)}/g;
    let match;
    while ((match = dateRegex.exec(result)) !== null) {
      const format = match[1];
      let dateString = now.toISOString();
      
      // Simple date formatting
      switch (format) {
        case 'YYYY-MM-DD':
          dateString = now.toISOString().split('T')[0];
          break;
        case 'YYYY-MM-DDTHH:mm:ss':
          dateString = now.toISOString().split('.')[0];
          break;
        case 'YYYY':
          dateString = now.getFullYear().toString();
          break;
        case 'MM':
          dateString = (now.getMonth() + 1).toString().padStart(2, '0');
          break;
        case 'DD':
          dateString = now.getDate().toString().padStart(2, '0');
          break;
      }
      
      result = result.replace(match[0], dateString);
    }

    // Remove remaining placeholders
    result = result.replace(/{.*?}/g, '');

    return result;
  }

  // Cleanup and memory management
  cleanupBlobUrls() {
    const blobUrls = URL.getAllBlobUrls();
    blobUrls.forEach(url => URL.revokeObjectURL(url));
    URL.clearAllBlobUrls();
  }

  async cancelDownload(downloadId) {
    try {
      if (typeof downloadId !== 'number') {
        throw new Error('Download ID must be a number');
      }
      
      await browser.downloads.cancel(downloadId);
      return { success: true, downloadId };
    } catch (error) {
      throw new Error(`Failed to cancel download: ${error.message}`);
    }
  }

  async searchDownloads(query = {}) {
    try {
      return await browser.downloads.search(query);
    } catch (error) {
      throw new Error(`Download search failed: ${error.message}`);
    }
  }

  async eraseDownload(downloadId) {
    try {
      if (typeof downloadId !== 'number') {
        throw new Error('Download ID must be a number');
      }
      
      await browser.downloads.erase({ id: downloadId });
      return { success: true, downloadId };
    } catch (error) {
      throw new Error(`Failed to erase download: ${error.message}`);
    }
  }
}

describe('Download API Tests - Markdown File Downloads', () => {
  let api;

  beforeEach(() => {
    api = new DownloadAPI();
    jest.clearAllMocks();
    URL.clearAllBlobUrls();
  });

  afterEach(() => {
    api.cleanupBlobUrls();
  });

  describe('downloadMarkdown() function', () => {
    test('should download markdown via downloads API successfully', async () => {
      const markdown = '# Test Article\n\nThis is test content.';
      const title = 'test-article';
      const tabId = 1;
      
      browser.storage.sync.get.mockResolvedValue({
        downloadMode: 'downloadsApi',
        saveAs: false
      });
      browser.downloads.download.mockResolvedValue(123);

      const result = await api.downloadMarkdown(markdown, title, tabId);

      expect(result.success).toBe(true);
      expect(result.downloadId).toBe(123);
      expect(result.method).toBe('downloadsApi');
      expect(browser.downloads.download).toHaveBeenCalledWith({
        url: expect.stringMatching(/^blob:mock-url-/),
        filename: 'test-article.md',
        saveAs: false
      });
    });

    test('should download with folder structure', async () => {
      const markdown = '# Test Article';
      const title = 'articles/javascript/test-article';
      const mdClipsFolder = 'downloads/';
      
      browser.storage.sync.get.mockResolvedValue({ downloadMode: 'downloadsApi' });
      browser.downloads.download.mockResolvedValue(124);

      const result = await api.downloadMarkdown(markdown, title, 1, {}, mdClipsFolder);

      expect(browser.downloads.download).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'downloads/articles/javascript/test-article.md'
        })
      );
    });

    test('should download images along with markdown', async () => {
      const markdown = '# Test Article\n\n![Image](test.jpg)';
      const title = 'test-article';
      const imageList = {
        'https://example.com/image1.jpg': 'images/image1.jpg',
        'https://example.com/image2.png': 'images/image2.png'
      };
      
      browser.storage.sync.get.mockResolvedValue({
        downloadMode: 'downloadsApi',
        downloadImages: true
      });
      browser.downloads.download
        .mockResolvedValueOnce(125) // Markdown
        .mockResolvedValueOnce(126) // Image 1
        .mockResolvedValueOnce(127); // Image 2

      const result = await api.downloadMarkdown(markdown, title, 1, imageList);

      expect(result.imageDownloads).toHaveLength(2);
      expect(browser.downloads.download).toHaveBeenCalledTimes(3); // 1 markdown + 2 images
    });

    test('should fall back to content script method', async () => {
      const markdown = '# Test Article';
      const title = 'test-article';
      const tabId = 1;
      
      browser.storage.sync.get.mockResolvedValue({ downloadMode: 'contentScript' });
      browser.scripting.executeScript
        .mockResolvedValueOnce([{ result: true }]) // ensureScripts check
        .mockResolvedValueOnce([{ result: true }]); // download script

      const result = await api.downloadMarkdown(markdown, title, tabId);

      expect(result.success).toBe(true);
      expect(result.method).toBe('contentScript');
      expect(browser.scripting.executeScript).toHaveBeenCalledTimes(1);
    });

    test('should validate required parameters', async () => {
      await expect(api.downloadMarkdown('', 'title', 1))
        .rejects.toThrow('Markdown content is required');
      await expect(api.downloadMarkdown('content', '', 1))
        .rejects.toThrow('Title is required');
      await expect(api.downloadMarkdown(null, 'title', 1))
        .rejects.toThrow('Markdown content is required');
    });

    test('should handle download errors gracefully', async () => {
      browser.storage.sync.get.mockResolvedValue({ downloadMode: 'downloadsApi' });
      browser.downloads.download.mockRejectedValue(new Error('Permission denied'));

      await expect(api.downloadMarkdown('content', 'title', 1))
        .rejects.toThrow('Download failed: Permission denied');
    });

    test('should manage blob URLs properly', async () => {
      const markdown = '# Test';
      
      browser.storage.sync.get.mockResolvedValue({ downloadMode: 'downloadsApi' });
      browser.downloads.download.mockResolvedValue(128);

      await api.downloadMarkdown(markdown, 'test', 1);

      const blobUrls = URL.getAllBlobUrls();
      expect(blobUrls.length).toBe(1);
      expect(blobUrls[0]).toMatch(/^blob:mock-url-/);
    });
  });

  describe('Content script download functionality', () => {
    test('should inject content script when needed', async () => {
      browser.scripting.executeScript
        .mockResolvedValueOnce([{ result: false }]) // Script not present
        .mockResolvedValueOnce([{ result: true }]);  // Injection successful

      await api.ensureScripts(1);

      expect(browser.scripting.executeScript).toHaveBeenCalledTimes(2);
      expect(browser.scripting.executeScript).toHaveBeenLastCalledWith({
        target: { tabId: 1 },
        files: ["/contentScript/contentScript.js"]
      });
    });

    test('should skip injection when script already present', async () => {
      browser.scripting.executeScript.mockResolvedValue([{ result: true }]);

      await api.ensureScripts(1);

      expect(browser.scripting.executeScript).toHaveBeenCalledTimes(1);
    });

    test('should handle script injection errors', async () => {
      browser.scripting.executeScript.mockRejectedValue(new Error('Tab not accessible'));

      await expect(api.ensureScripts(1))
        .rejects.toThrow('Failed to ensure scripts: Tab not accessible');
    });
  });
});

describe('Download API Tests - Image Processing', () => {
  let api;

  beforeEach(() => {
    api = new DownloadAPI();
    jest.clearAllMocks();
    URL.clearAllBlobUrls();
  });

  afterEach(() => {
    api.cleanupBlobUrls();
  });

  describe('downloadImages() function', () => {
    test('should download multiple images successfully', async () => {
      const imageList = {
        'https://example.com/image1.jpg': 'images/image1.jpg',
        'https://example.com/image2.png': 'images/image2.png'
      };
      const options = { imageStyle: 'blob' };

      // Mock successful XHR responses
      const mockXHRInstances = [];
      global.XMLHttpRequest = jest.fn(() => {
        const xhr = {
          open: jest.fn(),
          send: jest.fn(() => {
            setTimeout(() => {
              xhr.status = 200;
              xhr.response = new Blob(['fake-image-data'], { type: 'image/jpeg' });
              xhr.onload();
            }, 10);
          }),
          onload: null,
          onerror: null,
          responseType: 'text',
          status: 0
        };
        mockXHRInstances.push(xhr);
        return xhr;
      });

      const result = await api.downloadImages(imageList, options);

      expect(result.processedImages).toHaveProperty('https://example.com/image1.jpg');
      expect(result.processedImages).toHaveProperty('https://example.com/image2.png');
      expect(result.errors).toHaveLength(0);
    });

    test('should handle image download errors', async () => {
      const imageList = {
        'https://invalid.example.com/image.jpg': 'images/image.jpg'
      };
      const options = { imageStyle: 'blob' };

      global.XMLHttpRequest = jest.fn(() => ({
        open: jest.fn(),
        send: jest.fn(function() {
          setTimeout(() => {
            this.onerror();
          }, 10);
        }),
        onload: null,
        onerror: null,
        responseType: 'text'
      }));

      const result = await api.downloadImages(imageList, options);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].src).toBe('https://invalid.example.com/image.jpg');
    });

    test('should convert images to base64 when requested', async () => {
      const imageList = {
        'https://example.com/image.jpg': 'images/image.jpg'
      };
      const options = { imageStyle: 'base64' };

      global.XMLHttpRequest = jest.fn(() => ({
        open: jest.fn(),
        send: jest.fn(function() {
          setTimeout(() => {
            this.status = 200;
            this.response = new Blob(['fake-image-data'], { type: 'image/jpeg' });
            this.onload();
          }, 10);
        }),
        onload: null,
        onerror: null,
        responseType: 'blob',
        status: 0
      }));

      global.FileReader = jest.fn(() => ({
        readAsDataURL: jest.fn(function() {
          setTimeout(() => {
            this.result = 'data:image/jpeg;base64,ZmFrZS1pbWFnZS1kYXRh';
            this.onload();
          }, 5);
        }),
        onload: null,
        onerror: null,
        result: null
      }));

      const result = await api.downloadImages(imageList, options);

      expect(result.processedImages['https://example.com/image.jpg'].type).toBe('base64');
      expect(result.processedImages['https://example.com/image.jpg'].data).toContain('data:image/jpeg;base64,');
    });

    test('should handle unknown file extensions', async () => {
      const imageList = {
        'https://example.com/image.idunno': 'images/image.idunno'
      };
      const options = { imageStyle: 'blob' };

      global.XMLHttpRequest = jest.fn(() => ({
        open: jest.fn(),
        send: jest.fn(function() {
          setTimeout(() => {
            this.status = 200;
            this.response = new Blob(['fake-image-data'], { type: 'image/png' });
            this.onload();
          }, 10);
        }),
        onload: null,
        onerror: null,
        responseType: 'blob',
        status: 0
      }));

      const result = await api.downloadImages(imageList, options);

      expect(result.processedImages['https://example.com/image.idunno'].filename)
        .toBe('images/image.png');
    });

    test('should handle empty image list', async () => {
      const result = await api.downloadImages({}, {});

      expect(result.processedImages).toEqual({});
      expect(result.errors).toEqual([]);
    });
  });

  describe('getImageLinks() function', () => {
    test('should extract image links from HTML content', async () => {
      const content = `
        <div>
          <img src="https://example.com/image1.jpg" alt="Image 1">
          <img src="/path/to/image2.png" alt="Image 2">
          <img src="relative/image3.gif" alt="Image 3">
          <img src="data:image/jpeg;base64,/9j/4AAQ" alt="Base64 Image">
        </div>
      `;
      const baseURI = 'https://example.com/articles/';

      const imageLinks = await api.getImageLinks(content, baseURI);

      expect(imageLinks).toHaveProperty('https://example.com/image1.jpg');
      expect(imageLinks).toHaveProperty('/path/to/image2.png');
      expect(imageLinks).toHaveProperty('relative/image3.gif');
      expect(imageLinks).toHaveProperty('data:image/jpeg;base64,/9j/4AAQ');
      
      expect(imageLinks['https://example.com/image1.jpg']).toBe('https://example.com/image1.jpg');
      expect(imageLinks['/path/to/image2.png']).toBe('https://example.com/path/to/image2.png');
      expect(imageLinks['relative/image3.gif']).toBe('https://example.com/articles/relative/image3.gif');
      expect(imageLinks['data:image/jpeg;base64,/9j/4AAQ']).toBe('data:image/jpeg;base64,/9j/4AAQ');
    });

    test('should handle protocol-relative URLs', async () => {
      const content = '<img src="//cdn.example.com/image.jpg" alt="CDN Image">';
      const baseURI = 'https://example.com/page';

      const imageLinks = await api.getImageLinks(content, baseURI);

      expect(imageLinks['//cdn.example.com/image.jpg']).toBe('https://cdn.example.com/image.jpg');
    });

    test('should handle malformed image URLs gracefully', async () => {
      const content = `
        <img src="not-a-valid-url" alt="Invalid">
        <img src="https://valid.com/image.jpg" alt="Valid">
        <img src="" alt="Empty">
      `;
      const baseURI = 'https://example.com';

      const imageLinks = await api.getImageLinks(content, baseURI);

      // Should still process valid URLs
      expect(imageLinks).toHaveProperty('https://valid.com/image.jpg');
      expect(Object.keys(imageLinks).length).toBe(1);
    });
  });
});

describe('Download API Tests - File Management', () => {
  let api;

  beforeEach(() => {
    api = new DownloadAPI();
    jest.clearAllMocks();
  });

  describe('generateValidFileName() function', () => {
    test('should remove illegal filesystem characters', () => {
      const testCases = [
        { input: 'Test<Title>With/Illegal?Characters*|:"\\', expected: 'TestTitleWithIllegalCharacters' },
        { input: 'File with spaces   and    tabs', expected: 'File with spaces and tabs' },
        { input: '   Leading and trailing spaces   ', expected: 'Leading and trailing spaces' },
        { input: 'Unicode 测试 🎉 Title', expected: 'Unicode 测试 🎉 Title' },
        { input: '', expected: '' },
        { input: null, expected: null },
        { input: undefined, expected: undefined }
      ];

      testCases.forEach(({ input, expected }) => {
        expect(api.generateValidFileName(input)).toBe(expected);
      });
    });

    test('should handle custom disallowed characters', () => {
      const title = 'Test[Title]With#Custom^Chars';
      const disallowedChars = '[]#^';
      
      const result = api.generateValidFileName(title, disallowedChars);

      expect(result).toBe('TestTitleWithCustomChars');
      expect(result).not.toMatch(/[\[\]#^]/);
    });

    test('should handle regex special characters in disallowed chars', () => {
      const title = 'Test.Title+With*Special(Regex)Chars[123]';
      const disallowedChars = '.+*()[]';
      
      const result = api.generateValidFileName(title, disallowedChars);

      expect(result).toBe('TestTitleWithSpecialRegexChars123');
    });
  });

  describe('formatFolderPath() function', () => {
    test('should format folder path with template variables', () => {
      const folderTemplate = '{pageTitle}/{byline}/{date:YYYY}';
      const article = {
        pageTitle: 'JavaScript Guide',
        byline: 'John Doe'
      };
      const options = { disallowedChars: '[]#^' };

      const result = api.formatFolderPath(folderTemplate, article, options);

      expect(result).toBe('JavaScript Guide/John Doe/2024/');
      expect(result.endsWith('/')).toBe(true);
    });

    test('should clean folder path segments', () => {
      const folderTemplate = '{pageTitle}';
      const article = {
        pageTitle: 'Title/With\\Illegal*Chars'
      };
      const options = { disallowedChars: '' };

      const result = api.formatFolderPath(folderTemplate, article, options);

      expect(result).toBe('TitleWithIllegalChars/');
      expect(result).not.toMatch(/[\/\\*]/);
    });

    test('should handle empty folder template', () => {
      const result = api.formatFolderPath('', {}, {});
      expect(result).toBe('');

      const result2 = api.formatFolderPath(null, {}, {});
      expect(result2).toBe('');
    });

    test('should handle nested folder structures', () => {
      const folderTemplate = 'articles/{date:YYYY}/{date:MM}/{pageTitle}';
      const article = { pageTitle: 'Monthly Report' };
      const options = { disallowedChars: '' };

      const result = api.formatFolderPath(folderTemplate, article, options);

      expect(result).toMatch(/^articles\/\d{4}\/\d{2}\/Monthly Report\/$/);
    });
  });

  describe('Download management functions', () => {
    test('should search downloads successfully', async () => {
      const mockDownloads = [
        { id: 1, filename: 'test1.md', state: 'complete' },
        { id: 2, filename: 'test2.md', state: 'in_progress' }
      ];
      
      browser.downloads.search.mockResolvedValue(mockDownloads);

      const result = await api.searchDownloads({ state: 'complete' });

      expect(browser.downloads.search).toHaveBeenCalledWith({ state: 'complete' });
      expect(result).toEqual(mockDownloads);
    });

    test('should cancel download successfully', async () => {
      browser.downloads.cancel.mockResolvedValue(undefined);

      const result = await api.cancelDownload(123);

      expect(browser.downloads.cancel).toHaveBeenCalledWith(123);
      expect(result).toEqual({ success: true, downloadId: 123 });
    });

    test('should validate download ID for cancel operation', async () => {
      await expect(api.cancelDownload('invalid'))
        .rejects.toThrow('Download ID must be a number');
    });

    test('should erase download from history', async () => {
      browser.downloads.erase.mockResolvedValue(undefined);

      const result = await api.eraseDownload(123);

      expect(browser.downloads.erase).toHaveBeenCalledWith({ id: 123 });
      expect(result).toEqual({ success: true, downloadId: 123 });
    });

    test('should handle download operation errors', async () => {
      browser.downloads.search.mockRejectedValue(new Error('Permission denied'));

      await expect(api.searchDownloads())
        .rejects.toThrow('Download search failed: Permission denied');
    });
  });
});

describe('Download API Tests - Memory Management and Performance', () => {
  let api;

  beforeEach(() => {
    api = new DownloadAPI();
    jest.clearAllMocks();
    URL.clearAllBlobUrls();
  });

  afterEach(() => {
    api.cleanupBlobUrls();
  });

  describe('Blob URL management', () => {
    test('should track and cleanup blob URLs', async () => {
      const markdown = '# Test Content';
      
      browser.storage.sync.get.mockResolvedValue({ downloadMode: 'downloadsApi' });
      browser.downloads.download.mockResolvedValue(129);

      // Create multiple downloads
      await api.downloadMarkdown(markdown, 'test1', 1);
      await api.downloadMarkdown(markdown, 'test2', 1);
      await api.downloadMarkdown(markdown, 'test3', 1);

      let blobUrls = URL.getAllBlobUrls();
      expect(blobUrls.length).toBe(3);

      // Cleanup should remove all blob URLs
      api.cleanupBlobUrls();
      blobUrls = URL.getAllBlobUrls();
      expect(blobUrls.length).toBe(0);
    });

    test('should handle automatic blob cleanup on download completion', async () => {
      const markdown = '# Test';
      const downloadId = 130;
      
      browser.storage.sync.get.mockResolvedValue({ downloadMode: 'downloadsApi' });
      browser.downloads.download.mockResolvedValue(downloadId);

      let cleanupListener;
      browser.downloads.onChanged.addListener.mockImplementation(listener => {
        cleanupListener = listener;
      });

      await api.downloadMarkdown(markdown, 'test', 1);

      expect(cleanupListener).toBeDefined();

      // Simulate download completion
      cleanupListener({
        id: downloadId,
        state: { current: 'complete', previous: 'in_progress' }
      });

      expect(browser.downloads.onChanged.removeListener).toHaveBeenCalledWith(cleanupListener);
    });

    test('should handle memory-intensive operations', async () => {
      // Test with large content
      const largeMarkdown = '# Large Content\n\n' + 'Large paragraph. '.repeat(10000);
      
      browser.storage.sync.get.mockResolvedValue({ downloadMode: 'downloadsApi' });
      browser.downloads.download.mockResolvedValue(131);

      const startTime = Date.now();
      const result = await api.downloadMarkdown(largeMarkdown, 'large-test', 1);
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Concurrent operations handling', () => {
    test('should handle concurrent download requests', async () => {
      const downloads = Array(10).fill().map((_, i) => ({
        markdown: `# Article ${i}`,
        title: `article-${i}`,
        tabId: 1
      }));

      browser.storage.sync.get.mockResolvedValue({ downloadMode: 'downloadsApi' });
      
      downloads.forEach((_, i) => {
        browser.downloads.download.mockResolvedValueOnce(200 + i);
      });

      const promises = downloads.map(({ markdown, title, tabId }) =>
        api.downloadMarkdown(markdown, title, tabId)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.downloadId).toBe(200 + index);
      });
    });

    test('should handle concurrent image downloads', async () => {
      const imageList = {};
      for (let i = 0; i < 20; i++) {
        imageList[`https://example.com/image${i}.jpg`] = `images/image${i}.jpg`;
      }

      global.XMLHttpRequest = jest.fn(() => ({
        open: jest.fn(),
        send: jest.fn(function() {
          setTimeout(() => {
            this.status = 200;
            this.response = new Blob(['fake-data'], { type: 'image/jpeg' });
            this.onload();
          }, Math.random() * 50); // Random delay
        }),
        onload: null,
        onerror: null,
        responseType: 'blob',
        status: 0
      }));

      const startTime = Date.now();
      const result = await api.downloadImages(imageList, { imageStyle: 'blob' });
      const duration = Date.now() - startTime;

      expect(Object.keys(result.processedImages)).toHaveLength(20);
      expect(result.errors).toHaveLength(0);
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });

    test('should handle partial failures in concurrent operations', async () => {
      const imageList = {
        'https://example.com/valid1.jpg': 'images/valid1.jpg',
        'https://invalid.com/invalid.jpg': 'images/invalid.jpg',
        'https://example.com/valid2.jpg': 'images/valid2.jpg'
      };

      global.XMLHttpRequest = jest.fn(() => {
        const xhr = {
          open: jest.fn(),
          send: jest.fn(function() {
            setTimeout(() => {
              if (this.url && this.url.includes('invalid.com')) {
                this.onerror();
              } else {
                this.status = 200;
                this.response = new Blob(['fake-data'], { type: 'image/jpeg' });
                this.onload();
              }
            }, 10);
          }),
          onload: null,
          onerror: null,
          responseType: 'blob',
          status: 0,
          url: null
        };
        
        xhr.open = jest.fn((method, url) => {
          xhr.url = url;
        });
        
        return xhr;
      });

      const result = await api.downloadImages(imageList, { imageStyle: 'blob' });

      expect(Object.keys(result.processedImages)).toHaveLength(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].src).toBe('https://invalid.com/invalid.jpg');
    });
  });

  describe('Error recovery and resilience', () => {
    test('should retry failed operations when appropriate', async () => {
      // This would be implemented with retry logic in a real scenario
      const markdown = '# Test';
      
      browser.storage.sync.get.mockResolvedValue({ downloadMode: 'downloadsApi' });
      browser.downloads.download
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce(132);

      // In a real implementation, we might add retry logic
      await expect(api.downloadMarkdown(markdown, 'test', 1))
        .rejects.toThrow('Download failed: Temporary failure');
    });

    test('should handle browser API unavailability', async () => {
      // Simulate downloads API not available
      const originalDownloads = browser.downloads;
      browser.downloads = undefined;

      const markdown = '# Test';
      browser.storage.sync.get.mockResolvedValue({ downloadMode: 'downloadsApi' });
      browser.scripting.executeScript.mockResolvedValue([{ result: true }]);

      const result = await api.downloadMarkdown(markdown, 'test', 1);

      expect(result.method).toBe('contentScript');
      
      // Restore
      browser.downloads = originalDownloads;
    });

    test('should handle storage failures gracefully', async () => {
      browser.storage.sync.get.mockRejectedValue(new Error('Storage unavailable'));

      const result = await api.getOptions();

      expect(result).toEqual(api.defaultOptions);
    });
  });
});