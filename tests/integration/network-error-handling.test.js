/**
 * Network Error Handling Integration Tests
 * Tests how the extension handles various network-related errors and edge cases
 */

// Import core modules
const downloadManager = require('@download/download-manager.js');
const browserApi = require('@api/browser-api.js');

describe('Network Error Handling Integration', () => {
  let mockBrowser;
  let mockXMLHttpRequest;

  beforeEach(() => {
    // Setup enhanced browser mocks
    mockBrowser = {
      downloads: {
        download: jest.fn(),
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
            downloadImages: true,
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

    // Setup XMLHttpRequest mock for network requests
    mockXMLHttpRequest = jest.fn(() => ({
      open: jest.fn(),
      send: jest.fn(),
      onload: null,
      onerror: null,
      ontimeout: null,
      response: null,
      responseType: 'blob',
      status: 200,
      readyState: 4,
      timeout: 30000
    }));

    global.XMLHttpRequest = mockXMLHttpRequest;
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete global.browser;
    delete global.XMLHttpRequest;
  });

  test('should handle network timeouts gracefully', async () => {
    // Arrange: Mock network timeout
    const mockXHR = mockXMLHttpRequest();
    mockXHR.status = 0; // Network timeout
    mockXHR.readyState = 4;

    global.XMLHttpRequest = jest.fn(() => mockXHR);

    const downloadData = {
      markdown: '# Test Content\n\nTest article.',
      title: 'Test Article',
      tabId: 123,
      imageList: {
        'image.jpg': {
          url: 'https://example.com/image.jpg',
          filename: 'image.jpg',
          status: 'pending'
        }
      },
      mdClipsFolder: 'MarkDownload',
      options: {
        includeTemplate: false,
        downloadImages: true,
        clipSelection: false
      }
    };

    // Act: Attempt download with network timeout
    const result = await downloadManager.download(downloadData);

    // Assert: Should complete download but mark image as failed
    expect(result.success).toBe(true); // Markdown download should succeed
    expect(result.failedImages).toBeDefined();
    expect(result.failedImages).toHaveLength(1);
    expect(result.failedImages[0].filename).toBe('image.jpg');
  });

  test('should retry failed requests with exponential backoff', async () => {
    // Arrange: Mock progressive failures then success
    let attemptCount = 0;
    global.XMLHttpRequest = jest.fn(() => {
      attemptCount++;
      const xhr = {
        open: jest.fn(),
        send: jest.fn(),
        onload: null,
        onerror: null,
        ontimeout: null,
        response: null,
        responseType: 'blob',
        timeout: 30000
      };

      // Fail first 2 attempts, succeed on 3rd
      if (attemptCount <= 2) {
        xhr.status = 500;
        xhr.readyState = 4;
        setTimeout(() => {
          if (xhr.onerror) xhr.onerror();
        }, 100);
      } else {
        xhr.status = 200;
        xhr.readyState = 4;
        xhr.response = new Blob(['success'], { type: 'image/jpeg' });
        setTimeout(() => {
          if (xhr.onload) xhr.onload();
        }, 100);
      }

      return xhr;
    });

    const downloadData = {
      markdown: '# Test Content',
      title: 'Test Article',
      tabId: 123,
      imageList: {
        'retry-image.jpg': {
          url: 'https://example.com/retry-image.jpg',
          filename: 'retry-image.jpg',
          status: 'pending'
        }
      },
      mdClipsFolder: 'MarkDownload',
      options: {
        includeTemplate: false,
        downloadImages: true,
        clipSelection: false
      }
    };

    // Act: Attempt download
    const result = await downloadManager.download(downloadData);

    // Assert: Should eventually succeed after retries
    expect(result.success).toBe(true);
    expect(result.imagesDownloaded).toHaveLength(1);
    expect(attemptCount).toBe(3); // Should have made 3 attempts
  });

  test('should handle CORS errors correctly', async () => {
    // Arrange: Mock CORS error
    const mockXHR = mockXMLHttpRequest();
    mockXHR.status = 0; // CORS error
    mockXHR.readyState = 4;

    // Simulate CORS error event
    setTimeout(() => {
      if (mockXHR.onerror) mockXHR.onerror();
    }, 10);

    global.XMLHttpRequest = jest.fn(() => mockXHR);

    const downloadData = {
      markdown: '# Test Content',
      title: 'Test Article',
      tabId: 123,
      imageList: {
        'cors-image.jpg': {
          url: 'https://external-site.com/cors-image.jpg',
          filename: 'cors-image.jpg',
          status: 'pending'
        }
      },
      mdClipsFolder: 'MarkDownload',
      options: {
        includeTemplate: false,
        downloadImages: true,
        clipSelection: false
      }
    };

    // Act: Attempt download
    const result = await downloadManager.download(downloadData);

    // Assert: Should handle CORS error gracefully
    expect(result.success).toBe(true); // Markdown should still download
    expect(result.failedImages).toHaveLength(1);
    expect(result.failedImages[0].error).toContain('CORS');
  });

  test('should handle DNS resolution failures', async () => {
    // Arrange: Mock DNS failure
    const mockXHR = mockXMLHttpRequest();
    mockXHR.status = 0; // DNS failure
    mockXHR.readyState = 4;

    setTimeout(() => {
      if (mockXHR.onerror) mockXHR.onerror();
    }, 10);

    global.XMLHttpRequest = jest.fn(() => mockXHR);

    const downloadData = {
      markdown: '# Test Content',
      title: 'Test Article',
      tabId: 123,
      imageList: {
        'dns-fail.jpg': {
          url: 'https://nonexistent-domain-12345.com/image.jpg',
          filename: 'dns-fail.jpg',
          status: 'pending'
        }
      },
      mdClipsFolder: 'MarkDownload',
      options: {
        includeTemplate: false,
        downloadImages: true,
        clipSelection: false
      }
    };

    // Act: Attempt download
    const result = await downloadManager.download(downloadData);

    // Assert: Should handle DNS failure
    expect(result.success).toBe(true);
    expect(result.failedImages).toHaveLength(1);
    expect(result.failedImages[0].error).toContain('DNS');
  });

  test('should handle HTTP 404 errors', async () => {
    // Arrange: Mock 404 error
    const mockXHR = mockXMLHttpRequest();
    mockXHR.status = 404;
    mockXHR.statusText = 'Not Found';
    mockXHR.readyState = 4;

    setTimeout(() => {
      if (mockXHR.onload) mockXHR.onload();
    }, 10);

    global.XMLHttpRequest = jest.fn(() => mockXHR);

    const downloadData = {
      markdown: '# Test Content',
      title: 'Test Article',
      tabId: 123,
      imageList: {
        'not-found.jpg': {
          url: 'https://example.com/not-found.jpg',
          filename: 'not-found.jpg',
          status: 'pending'
        }
      },
      mdClipsFolder: 'MarkDownload',
      options: {
        includeTemplate: false,
        downloadImages: true,
        clipSelection: false
      }
    };

    // Act: Attempt download
    const result = await downloadManager.download(downloadData);

    // Assert: Should handle 404 error
    expect(result.success).toBe(true);
    expect(result.failedImages).toHaveLength(1);
    expect(result.failedImages[0].error).toContain('404');
  });

  test('should handle HTTP 403 Forbidden errors', async () => {
    // Arrange: Mock 403 error
    const mockXHR = mockXMLHttpRequest();
    mockXHR.status = 403;
    mockXHR.statusText = 'Forbidden';
    mockXHR.readyState = 4;

    setTimeout(() => {
      if (mockXHR.onload) mockXHR.onload();
    }, 10);

    global.XMLHttpRequest = jest.fn(() => mockXHR);

    const downloadData = {
      markdown: '# Test Content',
      title: 'Test Article',
      tabId: 123,
      imageList: {
        'forbidden.jpg': {
          url: 'https://example.com/forbidden.jpg',
          filename: 'forbidden.jpg',
          status: 'pending'
        }
      },
      mdClipsFolder: 'MarkDownload',
      options: {
        includeTemplate: false,
        downloadImages: true,
        clipSelection: false
      }
    };

    // Act: Attempt download
    const result = await downloadManager.download(downloadData);

    // Assert: Should handle 403 error
    expect(result.success).toBe(true);
    expect(result.failedImages).toHaveLength(1);
    expect(result.failedImages[0].error).toContain('403');
  });

  test('should handle connection reset errors', async () => {
    // Arrange: Mock connection reset
    let callCount = 0;
    global.XMLHttpRequest = jest.fn(() => {
      callCount++;
      const xhr = mockXMLHttpRequest();

      // First call succeeds, second call fails with connection reset
      if (callCount === 1) {
        xhr.status = 200;
        xhr.response = new Blob(['success'], { type: 'image/jpeg' });
        setTimeout(() => {
          if (xhr.onload) xhr.onload();
        }, 10);
      } else {
        xhr.status = 0; // Connection reset
        setTimeout(() => {
          if (xhr.onerror) xhr.onerror();
        }, 10);
      }

      return xhr;
    });

    const downloadData = {
      markdown: '# Test Content',
      title: 'Test Article',
      tabId: 123,
      imageList: {
        'reset1.jpg': {
          url: 'https://example.com/reset1.jpg',
          filename: 'reset1.jpg',
          status: 'pending'
        },
        'reset2.jpg': {
          url: 'https://example.com/reset2.jpg',
          filename: 'reset2.jpg',
          status: 'pending'
        }
      },
      mdClipsFolder: 'MarkDownload',
      options: {
        includeTemplate: false,
        downloadImages: true,
        clipSelection: false
      }
    };

    // Act: Attempt download
    const result = await downloadManager.download(downloadData);

    // Assert: Should handle mixed success/failure
    expect(result.success).toBe(true);
    expect(result.imagesDownloaded).toHaveLength(1);
    expect(result.failedImages).toHaveLength(1);
  });

  test('should handle SSL/TLS certificate errors', async () => {
    // Arrange: Mock SSL certificate error
    const mockXHR = mockXMLHttpRequest();
    mockXHR.status = 0; // SSL error
    mockXHR.readyState = 4;

    setTimeout(() => {
      if (mockXHR.onerror) mockXHR.onerror();
    }, 10);

    global.XMLHttpRequest = jest.fn(() => mockXHR);

    const downloadData = {
      markdown: '# Test Content',
      title: 'Test Article',
      tabId: 123,
      imageList: {
        'ssl-error.jpg': {
          url: 'https://expired-cert.example.com/image.jpg',
          filename: 'ssl-error.jpg',
          status: 'pending'
        }
      },
      mdClipsFolder: 'MarkDownload',
      options: {
        includeTemplate: false,
        downloadImages: true,
        clipSelection: false
      }
    };

    // Act: Attempt download
    const result = await downloadManager.download(downloadData);

    // Assert: Should handle SSL error
    expect(result.success).toBe(true);
    expect(result.failedImages).toHaveLength(1);
    expect(result.failedImages[0].error).toContain('SSL');
  });

  test('should handle proxy authentication errors', async () => {
    // Arrange: Mock proxy authentication error
    const mockXHR = mockXMLHttpRequest();
    mockXHR.status = 407;
    mockXHR.statusText = 'Proxy Authentication Required';
    mockXHR.readyState = 4;

    setTimeout(() => {
      if (mockXHR.onload) mockXHR.onload();
    }, 10);

    global.XMLHttpRequest = jest.fn(() => mockXHR);

    const downloadData = {
      markdown: '# Test Content',
      title: 'Test Article',
      tabId: 123,
      imageList: {
        'proxy-error.jpg': {
          url: 'https://example.com/proxy-error.jpg',
          filename: 'proxy-error.jpg',
          status: 'pending'
        }
      },
      mdClipsFolder: 'MarkDownload',
      options: {
        includeTemplate: false,
        downloadImages: true,
        clipSelection: false
      }
    };

    // Act: Attempt download
    const result = await downloadManager.download(downloadData);

    // Assert: Should handle proxy error
    expect(result.success).toBe(true);
    expect(result.failedImages).toHaveLength(1);
    expect(result.failedImages[0].error).toContain('407');
  });

  test('should handle request timeouts', async () => {
    // Arrange: Mock request timeout
    const mockXHR = mockXMLHttpRequest();
    mockXHR.timeout = 1000; // Short timeout

    // Simulate timeout
    setTimeout(() => {
      if (mockXHR.ontimeout) mockXHR.ontimeout();
    }, 1100);

    global.XMLHttpRequest = jest.fn(() => mockXHR);

    const downloadData = {
      markdown: '# Test Content',
      title: 'Test Article',
      tabId: 123,
      imageList: {
        'timeout.jpg': {
          url: 'https://slow-server.example.com/timeout.jpg',
          filename: 'timeout.jpg',
          status: 'pending'
        }
      },
      mdClipsFolder: 'MarkDownload',
      options: {
        includeTemplate: false,
        downloadImages: true,
        clipSelection: false
      }
    };

    // Act: Attempt download
    const result = await downloadManager.download(downloadData);

    // Assert: Should handle timeout
    expect(result.success).toBe(true);
    expect(result.failedImages).toHaveLength(1);
    expect(result.failedImages[0].error).toContain('timeout');
  });

  test('should handle concurrent network failures', async () => {
    // Arrange: Multiple network failures
    global.XMLHttpRequest = jest.fn(() => {
      const xhr = mockXMLHttpRequest();
      xhr.status = 0; // Network error
      setTimeout(() => {
        if (xhr.onerror) xhr.onerror();
      }, 10);
      return xhr;
    });

    const downloadData = {
      markdown: '# Test Content',
      title: 'Test Article',
      tabId: 123,
      imageList: {
        'fail1.jpg': { url: 'https://fail1.com/img.jpg', filename: 'fail1.jpg', status: 'pending' },
        'fail2.jpg': { url: 'https://fail2.com/img.jpg', filename: 'fail2.jpg', status: 'pending' },
        'fail3.jpg': { url: 'https://fail3.com/img.jpg', filename: 'fail3.jpg', status: 'pending' }
      },
      mdClipsFolder: 'MarkDownload',
      options: {
        includeTemplate: false,
        downloadImages: true,
        clipSelection: false
      }
    };

    // Act: Attempt download with all failures
    const result = await downloadManager.download(downloadData);

    // Assert: Should handle all failures gracefully
    expect(result.success).toBe(true); // Markdown should still succeed
    expect(result.failedImages).toHaveLength(3);
    expect(result.imagesDownloaded).toHaveLength(0);
  });

  test('should provide detailed error information', async () => {
    // Arrange: Mock specific error with details
    const mockXHR = mockXMLHttpRequest();
    mockXHR.status = 429;
    mockXHR.statusText = 'Too Many Requests';
    mockXHR.getResponseHeader = jest.fn((header) => {
      if (header === 'Retry-After') return '3600';
      return null;
    });

    setTimeout(() => {
      if (mockXHR.onload) mockXHR.onload();
    }, 10);

    global.XMLHttpRequest = jest.fn(() => mockXHR);

    const downloadData = {
      markdown: '# Test Content',
      title: 'Test Article',
      tabId: 123,
      imageList: {
        'rate-limited.jpg': {
          url: 'https://rate-limited.example.com/image.jpg',
          filename: 'rate-limited.jpg',
          status: 'pending'
        }
      },
      mdClipsFolder: 'MarkDownload',
      options: {
        includeTemplate: false,
        downloadImages: true,
        clipSelection: false
      }
    };

    // Act: Attempt download
    const result = await downloadManager.download(downloadData);

    // Assert: Should provide detailed error info
    expect(result.success).toBe(true);
    expect(result.failedImages).toHaveLength(1);

    const failedImage = result.failedImages[0];
    expect(failedImage.error).toContain('429');
    expect(failedImage.error).toContain('Too Many Requests');
    expect(failedImage.retryAfter).toBe('3600');
  });
});
