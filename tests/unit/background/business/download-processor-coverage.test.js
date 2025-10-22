/**
 * Download Processor Coverage Tests
 * Target: 30% branch coverage for download-processor.js (95 branches → +29 covered)
 * Strategy: Focus on validation, error handling, fallback paths
 */

describe('Download Processor Coverage Tests', () => {
  let originalLegacyDownload;
  
  beforeEach(() => {
    // Clean up global state
    delete global.self.DownloadManager;
    delete global.self.ErrorHandler;
    
    // Mock jsdom
    global.self = {
      ...global.self,
      document: global.document,
      location: global.location
    };

    // Load the download processor module
    require('../../../../src/background/business/download-processor.js');
  });

  describe('Validation Branch Coverage', () => {
    test('should cover invalid data validation paths', async () => {
      const DownloadProcessor = global.self.DownloadProcessor;
      
      // Mock event with ports
      const mockEvent = {
        ports: [{
          postMessage: jest.fn()
        }]
      };

      // Test various invalid data scenarios to trigger validation branches
      const invalidCases = [
        null, // null data
        undefined, // undefined data
        {}, // empty object - missing required fields
        { title: '' }, // empty title
        { title: 'Test', markdown: null }, // null markdown
        { title: 'Test', markdown: '', tabId: 'invalid' }, // invalid tabId type
        { title: 'Test', markdown: 'x'.repeat(11 * 1024 * 1024) }, // content too large
        { title: 'x'.repeat(1001), markdown: '# Test' }, // title too long
        { title: 'Test', markdown: '# Test', tabId: -1 }, // invalid tabId
        { title: 'Test', markdown: '# Test', imageList: 'invalid' }, // invalid imageList type
        { title: 'Test', markdown: '# Test', options: 'invalid' }, // invalid options type  
        { title: 'Test', markdown: '# Test', mdClipsFolder: 'x'.repeat(256) }, // folder name too long
      ];

      for (const invalidData of invalidCases) {
        await expect(
          DownloadProcessor.handleDownloadRequest(mockEvent, invalidData)
        ).rejects.toThrow();

        // Verify error message posted
        expect(mockEvent.ports[0].postMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.any(String)
          })
        );
      }
    });

    test('should handle validation edge cases with valid data', () => {
      const DownloadProcessor = global.self.DownloadProcessor;

      // Test edge cases that should be valid
      const validCases = [
        { 
          title: 'Test', 
          markdown: '# Test',
          tabId: 1 // minimum valid tabId
        },
        { 
          title: 'Test', 
          markdown: '# Test',
          tabId: undefined // tabId is optional
        },
        { 
          title: 'Test', 
          markdown: '# Test',
          imageList: {} // empty imageList is valid
        },
        { 
          title: 'Test', 
          markdown: '# Test',
          imageList: { 'img1.jpg': { url: 'test' } } // populated imageList
        },
        { 
          title: 'Test', 
          markdown: '# Test',
          options: {} // empty options is valid
        },
        { 
          title: 'Test', 
          markdown: '# Test',
          mdClipsFolder: 'ValidFolder' // valid folder name
        },
        { 
          title: 'A'.repeat(1000), // maximum valid title length
          markdown: '# Test'
        },
        { 
          title: 'Test',
          markdown: 'x'.repeat(10 * 1024 * 1024) // maximum valid content length
        }
      ];

      validCases.forEach((validData, index) => {
        const result = DownloadProcessor.validateDownloadData(validData);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });
  });

  describe('Error Handling Branch Coverage', () => {
    test('should cover DownloadManager available path', async () => {
      const mockDownloadManager = {
        download: jest.fn().mockResolvedValue({ success: true, filename: 'test.md' })
      };
      
      global.self.DownloadManager = mockDownloadManager;
      const DownloadProcessor = global.self.DownloadProcessor;
      
      const mockEvent = {
        ports: [{
          postMessage: jest.fn()
        }]
      };

      const validData = {
        markdown: '# Test',
        title: 'Test Article',
        tabId: 123
      };

      await DownloadProcessor.handleDownloadRequest(mockEvent, validData);

      expect(mockDownloadManager.download).toHaveBeenCalledWith(validData);
      expect(mockEvent.ports[0].postMessage).toHaveBeenCalledWith({
        success: true,
        result: { success: true, filename: 'test.md' }
      });
    });

    test('should cover DownloadManager error path', async () => {
      const mockDownloadManager = {
        download: jest.fn().mockRejectedValue(new Error('Download failed'))
      };
      
      const mockErrorHandler = {
        handleDownloadError: jest.fn()
      };

      global.self.DownloadManager = mockDownloadManager;
      global.self.ErrorHandler = mockErrorHandler;
      const DownloadProcessor = global.self.DownloadProcessor;
      
      const mockEvent = {
        ports: [{
          postMessage: jest.fn()
        }]
      };

      const validData = {
        title: 'Test Article',
        markdown: '# Test',
        tabId: 123
      };

      await expect(
        DownloadProcessor.handleDownloadRequest(mockEvent, validData)
      ).rejects.toThrow('Download failed');

      expect(mockErrorHandler.handleDownloadError).toHaveBeenCalledWith(
        expect.any(Error),
        'unknown' // Uses data?.filename || 'unknown', no filename in our test data
      );
      expect(mockEvent.ports[0].postMessage).toHaveBeenCalledWith({
        success: false,
        error: 'Download failed'
      });
    });

    test('should cover legacy fallback path', async () => {
      // Ensure DownloadManager is not available
      delete global.self.DownloadManager;
      
      // Mock the legacyDownloadMarkdown function to return success instead of throwing
      const originalDownloadProcessor = global.self.DownloadProcessor;
      global.self.DownloadProcessor = {
        ...originalDownloadProcessor,
        legacyDownloadMarkdown: jest.fn().mockResolvedValue({ success: true, filename: 'test.md' })
      };
      
      const DownloadProcessor = global.self.DownloadProcessor;
      
      const mockEvent = {
        ports: [{
          postMessage: jest.fn()
        }]
      };

      const validData = {
        title: 'Test Article',
        markdown: '# Test',
        tabId: 123
      };

      // This should trigger the legacy path
      await DownloadProcessor.handleDownloadRequest(mockEvent, validData);

      expect(DownloadProcessor.legacyDownloadMarkdown).toHaveBeenCalledWith(validData);
      expect(mockEvent.ports[0].postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });

    test('should handle missing ErrorHandler gracefully', async () => {
      const mockDownloadManager = {
        download: jest.fn().mockRejectedValue(new Error('Download failed'))
      };
      
      // No ErrorHandler available
      delete global.self.ErrorHandler;
      global.self.DownloadManager = mockDownloadManager;
      const DownloadProcessor = global.self.DownloadProcessor;
      
      const mockEvent = {
        ports: [{
          postMessage: jest.fn()
        }]
      };

      const validData = {
        title: 'Test Article',
        markdown: '# Test',
        tabId: 123
      };

      await expect(
        DownloadProcessor.handleDownloadRequest(mockEvent, validData)
      ).rejects.toThrow('Download failed');

      // Should still post error message even without ErrorHandler
      expect(mockEvent.ports[0].postMessage).toHaveBeenCalledWith({
        success: false,
        error: 'Download failed'
      });
    });
  });

  describe('Data Processing Branch Coverage', () => {
    test('should handle optional fields presence/absence', async () => {
      // Mock the legacyDownloadMarkdown function since no DownloadManager
      delete global.self.DownloadManager;
      const originalDownloadProcessor = global.self.DownloadProcessor;
      global.self.DownloadProcessor = {
        ...originalDownloadProcessor,
        legacyDownloadMarkdown: jest.fn().mockResolvedValue({ success: true, filename: 'test.md' })
      };
      
      const DownloadProcessor = global.self.DownloadProcessor;
      
      const mockEvent = {
        ports: [{
          postMessage: jest.fn()
        }]
      };

      // Test with minimal required fields
      const minimalData = {
        title: 'Test Title',
        markdown: '# Test'
      };

      // Test with full optional fields
      const fullData = {
        title: 'Test Title',
        markdown: '# Test',
        tabId: 123,
        url: 'https://example.com',
        imageList: { 'img1.jpg': { url: 'https://example.com/img1.jpg' } },
        mdClipsFolder: 'CustomFolder',
        options: { downloadImages: true, clipSelection: false }
      };

      // Both should be processed successfully but trigger different branches
      await DownloadProcessor.handleDownloadRequest(mockEvent, minimalData);
      await DownloadProcessor.handleDownloadRequest(mockEvent, fullData);

      expect(mockEvent.ports[0].postMessage).toHaveBeenCalledTimes(2);
      expect(DownloadProcessor.legacyDownloadMarkdown).toHaveBeenCalledTimes(2);
    });

    test('should handle legacy message conversion', () => {
      const DownloadProcessor = global.self.DownloadProcessor;

      // Test legacy message format conversion
      const legacyMessage = {
        markdown: '# Test Content',
        title: 'Test Article',
        tab: { id: 123 },
        imageList: { 'img1.jpg': { url: 'test.jpg' } },
        mdClipsFolder: 'TestFolder',
        includeTemplate: true,
        downloadImages: false,
        clipSelection: true
      };

      const result = DownloadProcessor.convertLegacyMessageToNewFormat(legacyMessage);
      
      expect(result).toEqual({
        markdown: '# Test Content',
        title: 'Test Article',
        tabId: 123,
        imageList: { 'img1.jpg': { url: 'test.jpg' } },
        mdClipsFolder: 'TestFolder',
        options: {
          includeTemplate: true,
          downloadImages: false,
          clipSelection: true
        }
      });

      // Test with missing tab
      const legacyWithoutTab = {
        markdown: '# Test',
        title: 'Test'
      };

      const resultWithoutTab = DownloadProcessor.convertLegacyMessageToNewFormat(legacyWithoutTab);
      expect(resultWithoutTab.tabId).toBeUndefined();
    });
  });
});