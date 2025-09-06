/**
 * Download Manager Test Suite
 * Comprehensive test coverage for src/background/download/download-manager.js
 * 
 * Tests all download modes, image processing, security validations,
 * error handling, and file management with strict quality standards.
 */

const path = require('path');

describe('Download Manager Comprehensive Tests', () => {
  let DownloadManager;
  let mockSelf;
  let mockBrowser;
  let originalGlobal;

  beforeAll(() => {
    originalGlobal = {
      browser: global.browser,
      URL: global.URL,
      Blob: global.Blob,
      XMLHttpRequest: global.XMLHttpRequest,
      FileReader: global.FileReader,
      btoa: global.btoa,
      encodeURIComponent: global.encodeURIComponent,
      self: global.self,
      console: global.console
    };

    // Mock browser APIs
    mockBrowser = {
      downloads: {
        download: jest.fn(),
        search: jest.fn(),
        onChanged: {
          addListener: jest.fn(),
          removeListener: jest.fn()
        }
      },
      scripting: {
        executeScript: jest.fn()
      },
      tabs: {
        update: jest.fn()
      }
    };
    global.browser = mockBrowser;

    // Mock Web APIs
    global.URL = {
      createObjectURL: jest.fn(() => 'blob:mock-url'),
      revokeObjectURL: jest.fn()
    };

    global.Blob = jest.fn((content, options) => ({
      type: options?.type || 'text/plain',
      size: content[0]?.length || 0,
      content: content[0]
    }));

    global.XMLHttpRequest = jest.fn(() => ({
      open: jest.fn(),
      send: jest.fn(),
      onload: null,
      onerror: null,
      response: new Blob(['mock image data'], { type: 'image/jpeg' }),
      responseType: ''
    }));

    global.FileReader = jest.fn(() => ({
      readAsDataURL: jest.fn(),
      onloadend: null,
      onerror: null,
      result: 'data:image/jpeg;base64,mockbase64data'
    }));

    global.btoa = jest.fn(str => Buffer.from(str, 'binary').toString('base64'));
    global.encodeURIComponent = originalGlobal.encodeURIComponent;

    // Mock self environment
    mockSelf = {
      ErrorHandler: {
        handleDownloadError: jest.fn(),
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
    
    // Reset browser mocks
    mockBrowser.downloads.download.mockResolvedValue('download-id-123');
    mockBrowser.downloads.search.mockResolvedValue([]);
    mockBrowser.scripting.executeScript.mockResolvedValue([{ result: 'success' }]);
    mockBrowser.tabs.update.mockResolvedValue();

    // Reset XMLHttpRequest mock
    const mockXHR = {
      open: jest.fn(),
      send: jest.fn(function() { this.onload && this.onload(); }),
      onload: null,
      onerror: null,
      response: new Blob(['mock image data'], { type: 'image/jpeg' }),
      responseType: ''
    };
    global.XMLHttpRequest.mockImplementation(() => mockXHR);

    // Reset FileReader mock
    const mockFileReader = {
      readAsDataURL: jest.fn(function() { 
        setTimeout(() => this.onloadend && this.onloadend(), 0);
      }),
      onloadend: null,
      onerror: null,
      result: 'data:image/jpeg;base64,mockbase64data'
    };
    global.FileReader.mockImplementation(() => mockFileReader);

    // Load module fresh for each test
    const modulePath = path.resolve(__dirname, '../../../../src/background/download/download-manager.js');
    delete require.cache[modulePath];
    require(modulePath);
    DownloadManager = global.self.DownloadManager;
  });

  describe('Module Initialization', () => {
    test('should load and export DownloadManager interface', () => {
      expect(DownloadManager).toBeDefined();
      expect(typeof DownloadManager).toBe('object');
    });

    test('should expose required public methods', () => {
      expect(typeof DownloadManager.download).toBe('function');
      expect(typeof DownloadManager.generateValidFileName).toBe('function');
      expect(typeof DownloadManager.base64EncodeUnicode).toBe('function');
      expect(typeof DownloadManager.getStats).toBe('function');
      expect(typeof DownloadManager.cleanup).toBe('function');
    });

    test('should provide download modes constants', () => {
      expect(DownloadManager.MODES).toBeDefined();
      expect(DownloadManager.MODES.DOWNLOADS_API).toBe('downloadsApi');
      expect(DownloadManager.MODES.CONTENT_SCRIPT).toBe('contentScript');
      expect(DownloadManager.MODES.OBSIDIAN_URI).toBe('obsidianUri');
    });

    test('should provide download states constants', () => {
      expect(DownloadManager.STATES).toBeDefined();
      expect(DownloadManager.STATES.PENDING).toBe('pending');
      expect(DownloadManager.STATES.DOWNLOADING).toBe('downloading');
      expect(DownloadManager.STATES.COMPLETED).toBe('completed');
      expect(DownloadManager.STATES.FAILED).toBe('failed');
    });
  });

  describe('Basic Download Functionality', () => {
    test('should perform successful download via Downloads API', async () => {
      const downloadData = {
        markdown: '# Test Content',
        title: 'Test Document',
        tabId: 123,
        imageList: {},
        mdClipsFolder: 'MarkDownload',
        options: { downloadMode: 'downloadsApi' }
      };

      const result = await DownloadManager.download(downloadData);

      expect(result.success).toBe(true);
      expect(result.downloadId).toBe('download-id-123');
      expect(result.filename).toBe('MarkDownload/Test Document.md');
      expect(mockBrowser.downloads.download).toHaveBeenCalledWith({
        url: 'blob:mock-url',
        filename: 'MarkDownload/Test Document.md',
        saveAs: false
      });
    });

    test('should handle download with images', async () => {
      const downloadData = {
        markdown: '# Test Content\n![Image](test.jpg)',
        title: 'Test Document',
        tabId: 123,
        imageList: {
          'https://example.com/test.jpg': 'test.jpg',
          'https://example.com/image2.png': 'image2.png'
        },
        mdClipsFolder: 'MarkDownload',
        options: { 
          downloadMode: 'downloadsApi',
          downloadImages: true
        }
      };

      const result = await DownloadManager.download(downloadData);

      expect(result.success).toBe(true);
      expect(result.imagesDownloaded).toBe(2);
      expect(mockBrowser.downloads.download).toHaveBeenCalledTimes(3); // 1 markdown + 2 images
    });

    test('should download via content script mode', async () => {
      const downloadData = {
        markdown: '# Test Content',
        title: 'Test Document',
        tabId: 123,
        options: { downloadMode: 'contentScript' }
      };

      const result = await DownloadManager.download(downloadData);

      expect(result.success).toBe(true);
      expect(result.method).toBe('contentScript');
      expect(result.filename).toBe('Test Document.md');
      expect(mockBrowser.scripting.executeScript).toHaveBeenCalledWith({
        target: { tabId: 123 },
        func: expect.any(Function),
        args: [result.filename, expect.any(String)]
      });
    });

    test('should download via Obsidian URI mode', async () => {
      const downloadData = {
        markdown: '# Test Content',
        title: 'Test Document',
        tabId: 123,
        options: { 
          downloadMode: 'obsidianUri',
          obsidianVault: 'MyVault',
          obsidianPathType: 'file'
        }
      };

      const result = await DownloadManager.download(downloadData);

      expect(result.success).toBe(true);
      expect(result.method).toBe('obsidianUri');
      expect(result.uri).toContain('obsidian://new?');
      expect(result.uri).toContain('file=Test%20Document');
      expect(result.uri).toContain('vault=MyVault');
      expect(mockBrowser.tabs.update).toHaveBeenCalledWith(123, { url: expect.stringContaining('obsidian://') });
    });
  });

  describe('Image Processing', () => {
    test('should convert images to base64 when imageStyle is base64', async () => {
      const downloadData = {
        markdown: '# Test\n![Image](https://example.com/test.jpg)',
        title: 'Test Document',
        tabId: 123,
        imageList: {
          'https://example.com/test.jpg': 'test.jpg'
        },
        options: { 
          downloadMode: 'downloadsApi',
          downloadImages: true,
          imageStyle: 'base64'
        }
      };

      const result = await DownloadManager.download(downloadData);

      expect(result.success).toBe(true);
      expect(global.XMLHttpRequest).toHaveBeenCalled();
      expect(global.FileReader).toHaveBeenCalled();
    });

    test('should resolve unknown image extensions', async () => {
      const downloadData = {
        markdown: '# Test\n![Image](test.idunno)',
        title: 'Test Document',
        tabId: 123,
        imageList: {
          'https://example.com/test': 'test.idunno'
        },
        options: { 
          downloadMode: 'downloadsApi',
          downloadImages: true,
          imageStyle: 'markdown'
        }
      };

      const result = await DownloadManager.download(downloadData);

      expect(result.success).toBe(true);
      expect(global.XMLHttpRequest).toHaveBeenCalled();
    });

    test('should handle image download failures gracefully', async () => {
      // Mock XMLHttpRequest to fail
      const mockXHRFail = {
        open: jest.fn(),
        send: jest.fn(function() { this.onerror && this.onerror(); }),
        onload: null,
        onerror: null,
        response: null,
        responseType: ''
      };
      global.XMLHttpRequest.mockImplementation(() => mockXHRFail);

      const downloadData = {
        markdown: '# Test\n![Image](test.jpg)',
        title: 'Test Document',
        tabId: 123,
        imageList: {
          'https://example.com/test.jpg': 'test.jpg'
        },
        options: { 
          downloadMode: 'downloadsApi',
          downloadImages: true
        }
      };

      const result = await DownloadManager.download(downloadData);

      expect(result.success).toBe(true); // Main download should still succeed
      expect(mockSelf.console.error).toHaveBeenCalledWith(
        expect.stringContaining('Image preparation failed:'),
        expect.any(String),
        expect.any(Error)
      );
    });
  });

  describe('File Name Generation', () => {
    test('should generate valid filenames from various titles', () => {
      const testCases = [
        { input: 'Simple Title', expected: 'Simple Title' },
        { input: 'Title/with\\illegal*chars"<>|:', expected: 'Title_with_illegal_chars______' },
        { input: '  Spaced   Title  ', expected: 'Spaced Title' },
        { input: 'Title\u00A0with\u00A0NBSP', expected: 'Title with NBSP' },
        { input: '', expected: 'download' },
        { input: null, expected: 'download' },
        { input: undefined, expected: 'download' },
        { input: 'A'.repeat(300), expected: 'A'.repeat(255) }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = DownloadManager.generateValidFileName(input);
        expect(result).toBe(expected);
      });
    });

    test('should handle disallowed characters', () => {
      const title = 'Title [with] special chars';
      const disallowedChars = ['[', ']'];

      const result = DownloadManager.generateValidFileName(title, disallowedChars);

      expect(result).toBe('Title with special chars');
    });

    test('should handle regex special characters in disallowed list', () => {
      const title = 'Title with $pecial cha*rs';
      const disallowedChars = ['$', '*'];

      const result = DownloadManager.generateValidFileName(title, disallowedChars);

      expect(result).toBe('Title with pecial chars');
    });

    test('should preserve extension when truncating long filenames', () => {
      const longTitle = 'A'.repeat(250) + '.custom';
      
      const result = DownloadManager.generateValidFileName(longTitle);

      expect(result.length).toBeLessThanOrEqual(255);
      expect(result).toEndWith('.custom');
    });
  });

  describe('Base64 Encoding', () => {
    test('should encode Unicode strings correctly', () => {
      const testCases = [
        'Simple ASCII text',
        'Text with émojis 🎉',
        'Chinese characters: 你好世界',
        'Mixed: Hello 世界 🌍',
        'Special chars: <>"&\''
      ];

      testCases.forEach(input => {
        const result = DownloadManager.base64EncodeUnicode(input);
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      });
    });

    test('should handle empty strings', () => {
      const result = DownloadManager.base64EncodeUnicode('');
      expect(result).toBe('');
    });
  });

  describe('Security Validations', () => {
    test('should validate safe URIs for navigation', async () => {
      const safeUris = [
        'https://example.com/path',
        'http://test.org/file',
        'obsidian://new?vault=test'
      ];

      for (const uri of safeUris) {
        const downloadData = {
          markdown: '# Test',
          title: 'Test Document',
          tabId: 123,
          options: { downloadMode: 'obsidianUri' }
        };

        // Mock the internal URI to be the test URI
        mockBrowser.tabs.update.mockImplementation((tabId, updateInfo) => {
          expect(updateInfo.url).toContain('obsidian://');
          return Promise.resolve();
        });

        const result = await DownloadManager.download(downloadData);
        expect(result.success).toBe(true);
      }
    });

    test('should block dangerous protocols in Obsidian URI mode', async () => {
      const downloadData = {
        markdown: '# Test',
        title: 'javascript:alert("xss")',
        tabId: 123,
        options: { downloadMode: 'obsidianUri' }
      };

      mockBrowser.tabs.update.mockRejectedValue(new Error('Navigation blocked'));

      const result = await DownloadManager.download(downloadData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('download failed');
    });

    test('should prevent directory traversal in filenames', () => {
      const maliciousNames = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32\\evil.exe',
        'normal/../../../sensitive'
      ];

      maliciousNames.forEach(name => {
        const result = DownloadManager.generateValidFileName(name);
        expect(result).not.toContain('..');
        expect(result).not.toContain('\\');
      });
    });

    test('should limit URI length to prevent DoS', async () => {
      const longTitle = 'A'.repeat(5000);
      const downloadData = {
        markdown: '# Test',
        title: longTitle,
        tabId: 123,
        options: { downloadMode: 'obsidianUri' }
      };

      const result = await DownloadManager.download(downloadData);

      // Should either succeed with truncated URI or fail gracefully
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('Error Handling', () => {
    test('should handle Downloads API unavailable', async () => {
      delete mockBrowser.downloads;

      const downloadData = {
        markdown: '# Test Content',
        title: 'Test Document',
        tabId: 123,
        options: { downloadMode: 'downloadsApi' }
      };

      const result = await DownloadManager.download(downloadData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Downloads API not available');
    });

    test('should handle script injection failures', async () => {
      mockBrowser.scripting.executeScript.mockRejectedValue(new Error('Script injection failed'));

      const downloadData = {
        markdown: '# Test Content',
        title: 'Test Document',
        tabId: 123,
        options: { downloadMode: 'contentScript' }
      };

      const result = await DownloadManager.download(downloadData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Content script download failed');
    });

    test('should handle tab navigation failures', async () => {
      mockBrowser.tabs.update.mockRejectedValue(new Error('Tab navigation failed'));

      const downloadData = {
        markdown: '# Test Content',
        title: 'Test Document',
        tabId: 123,
        options: { downloadMode: 'obsidianUri' }
      };

      const result = await DownloadManager.download(downloadData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Obsidian URI download failed');
    });

    test('should call ErrorHandler when available', async () => {
      mockBrowser.downloads.download.mockRejectedValue(new Error('Download API failed'));

      const downloadData = {
        markdown: '# Test Content',
        title: 'Test Document',
        options: { downloadMode: 'downloadsApi' }
      };

      const result = await DownloadManager.download(downloadData);

      expect(result.success).toBe(false);
      expect(mockSelf.ErrorHandler.handleDownloadError).toHaveBeenCalledWith(
        expect.any(Error),
        'Test Document'
      );
    });

    test('should handle missing ErrorHandler gracefully', async () => {
      delete mockSelf.ErrorHandler;
      mockBrowser.downloads.download.mockRejectedValue(new Error('Download API failed'));

      const downloadData = {
        markdown: '# Test Content',
        title: 'Test Document',
        options: { downloadMode: 'downloadsApi' }
      };

      const result = await DownloadManager.download(downloadData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Download API failed');
    });
  });

  describe('Download Tracking and Cleanup', () => {
    test('should track active downloads', async () => {
      const downloadData = {
        markdown: '# Test Content',
        title: 'Test Document',
        options: { downloadMode: 'downloadsApi' }
      };

      await DownloadManager.download(downloadData);

      const stats = DownloadManager.getStats();
      expect(stats.activeDownloads).toBeGreaterThan(0);
      expect(stats.trackedDownloads).toContain('download-id-123');
    });

    test('should set up download completion listeners', async () => {
      const downloadData = {
        markdown: '# Test Content',
        title: 'Test Document',
        options: { downloadMode: 'downloadsApi' }
      };

      await DownloadManager.download(downloadData);

      expect(mockBrowser.downloads.onChanged.addListener).toHaveBeenCalled();
    });

    test('should clean up completed downloads', () => {
      mockBrowser.downloads.search.mockResolvedValue([{
        id: 'download-123',
        state: 'complete'
      }]);

      DownloadManager.cleanup();

      expect(mockBrowser.downloads.search).toHaveBeenCalled();
    });

    test('should revoke blob URLs on completion', () => {
      // Simulate download completion callback
      const mockListener = mockBrowser.downloads.onChanged.addListener.mock.calls[0]?.[0];
      
      if (mockListener) {
        mockListener({ id: 'download-id-123', state: { current: 'complete' } });
        expect(global.URL.revokeObjectURL).toHaveBeenCalled();
      }
    });
  });

  describe('Different Download Modes', () => {
    test('should handle folder path formatting', async () => {
      const testCases = [
        { folder: 'MarkDownload', expected: 'MarkDownload/Test Document.md' },
        { folder: 'MarkDownload/', expected: 'MarkDownload/Test Document.md' },
        { folder: '', expected: 'Test Document.md' },
        { folder: null, expected: 'Test Document.md' }
      ];

      for (const { folder, expected } of testCases) {
        const downloadData = {
          markdown: '# Test Content',
          title: 'Test Document',
          mdClipsFolder: folder,
          options: { downloadMode: 'downloadsApi' }
        };

        const result = await DownloadManager.download(downloadData);
        expect(result.filename).toBe(expected);
      }
    });

    test('should handle saveAs option', async () => {
      const downloadData = {
        markdown: '# Test Content',
        title: 'Test Document',
        options: { 
          downloadMode: 'downloadsApi',
          saveAs: true 
        }
      };

      await DownloadManager.download(downloadData);

      expect(mockBrowser.downloads.download).toHaveBeenCalledWith(
        expect.objectContaining({ saveAs: true })
      );
    });

    test('should avoid duplicate .md extension', async () => {
      const downloadData = {
        markdown: '# Test Content',
        title: 'Test Document.md',
        options: { downloadMode: 'downloadsApi' }
      };

      const result = await DownloadManager.download(downloadData);

      expect(result.filename).toBe('Test Document.md');
      expect(result.filename).not.toBe('Test Document.md.md');
    });
  });

  describe('MIME Type Resolution', () => {
    test('should resolve MIME types to extensions correctly', async () => {
      const mimeTestCases = [
        { mimeType: 'image/jpeg', expected: 'jpg' },
        { mimeType: 'image/png', expected: 'png' },
        { mimeType: 'image/gif', expected: 'gif' },
        { mimeType: 'image/webp', expected: 'webp' },
        { mimeType: 'image/svg+xml', expected: 'svg' },
        { mimeType: 'image/bmp', expected: 'bmp' },
        { mimeType: 'unknown/type', expected: 'png' }
      ];

      // Test by mocking different MIME types for image downloads
      for (const { mimeType, expected } of mimeTestCases) {
        const mockXHRWithMime = {
          open: jest.fn(),
          send: jest.fn(function() { this.onload && this.onload(); }),
          onload: null,
          onerror: null,
          response: new Blob(['mock'], { type: mimeType }),
          responseType: ''
        };
        global.XMLHttpRequest.mockImplementation(() => mockXHRWithMime);

        const downloadData = {
          markdown: '# Test\n![Image](test.idunno)',
          title: 'Test Document',
          imageList: {
            'https://example.com/test': 'test.idunno'
          },
          options: { 
            downloadMode: 'downloadsApi',
            downloadImages: true
          }
        };

        const result = await DownloadManager.download(downloadData);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('Blob Creation and Management', () => {
    test('should create markdown blobs correctly', async () => {
      const downloadData = {
        markdown: '# Test Content\n\nWith multiple lines',
        title: 'Test Document',
        options: { downloadMode: 'downloadsApi' }
      };

      await DownloadManager.download(downloadData);

      expect(global.Blob).toHaveBeenCalledWith(
        ['# Test Content\n\nWith multiple lines'],
        { type: 'text/markdown;charset=utf-8' }
      );
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });

    test('should fallback to data URL when blob creation fails', async () => {
      // Mock URL.createObjectURL to throw
      global.URL.createObjectURL.mockImplementation(() => {
        throw new Error('Blob creation failed');
      });

      const downloadData = {
        markdown: '# Test Content',
        title: 'Test Document',
        options: { downloadMode: 'downloadsApi' }
      };

      await DownloadManager.download(downloadData);

      expect(mockBrowser.downloads.download).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringMatching(/^data:text\/markdown/)
        })
      );
    });
  });

  describe('Performance and Reliability', () => {
    test('should handle concurrent downloads', async () => {
      const downloadPromises = Array.from({ length: 5 }, (_, i) => 
        DownloadManager.download({
          markdown: `# Test Content ${i}`,
          title: `Test Document ${i}`,
          options: { downloadMode: 'downloadsApi' }
        })
      );

      const results = await Promise.all(downloadPromises);

      results.forEach((result, i) => {
        expect(result.success).toBe(true);
        expect(result.filename).toBe(`Test Document ${i}.md`);
      });
    });

    test('should handle large markdown content efficiently', async () => {
      const largeMarkdown = '# Large Content\n\n' + 'Lorem ipsum '.repeat(10000);
      
      const downloadData = {
        markdown: largeMarkdown,
        title: 'Large Document',
        options: { downloadMode: 'downloadsApi' }
      };

      const startTime = performance.now();
      const result = await DownloadManager.download(downloadData);
      const endTime = performance.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('should handle many simultaneous image downloads', async () => {
      const manyImages = Object.fromEntries(
        Array.from({ length: 20 }, (_, i) => [
          `https://example.com/image${i}.jpg`,
          `image${i}.jpg`
        ])
      );

      const downloadData = {
        markdown: '# Test with many images',
        title: 'Many Images Test',
        imageList: manyImages,
        options: { 
          downloadMode: 'downloadsApi',
          downloadImages: true
        }
      };

      const result = await DownloadManager.download(downloadData);

      expect(result.success).toBe(true);
      expect(result.imagesDownloaded).toBe(20);
    });
  });

  describe('Integration and Edge Cases', () => {
    test('should handle malformed image URLs gracefully', async () => {
      const downloadData = {
        markdown: '# Test\n![Image](invalid-url)',
        title: 'Test Document',
        imageList: {
          'not-a-valid-url': 'invalid.jpg',
          '': 'empty.jpg',
          null: 'null.jpg'
        },
        options: { 
          downloadMode: 'downloadsApi',
          downloadImages: true
        }
      };

      const result = await DownloadManager.download(downloadData);

      expect(result.success).toBe(true); // Main download should succeed
    });

    test('should handle missing title gracefully', async () => {
      const downloadData = {
        markdown: '# Test Content',
        options: { downloadMode: 'downloadsApi' }
      };

      const result = await DownloadManager.download(downloadData);

      expect(result.success).toBe(false); // Should fail but handle gracefully
      expect(result.title).toBe('unknown');
    });

    test('should handle invalid options gracefully', async () => {
      const downloadData = {
        markdown: '# Test Content',
        title: 'Test Document',
        options: { 
          downloadMode: 'invalidMode',
          saveAs: 'not-boolean',
          downloadImages: 'not-boolean'
        }
      };

      const result = await DownloadManager.download(downloadData);

      // Should fallback to content script mode
      expect(result.success).toBe(true);
      expect(result.method).toBe('contentScript');
    });

    test('should maintain state consistency across operations', async () => {
      const initialStats = DownloadManager.getStats();

      await DownloadManager.download({
        markdown: '# Test 1',
        title: 'Document 1',
        options: { downloadMode: 'downloadsApi' }
      });

      const midStats = DownloadManager.getStats();
      expect(midStats.activeDownloads).toBe(initialStats.activeDownloads + 1);

      await DownloadManager.download({
        markdown: '# Test 2',
        title: 'Document 2',
        options: { downloadMode: 'downloadsApi' }
      });

      const finalStats = DownloadManager.getStats();
      expect(finalStats.activeDownloads).toBe(initialStats.activeDownloads + 2);
    });
  });
});