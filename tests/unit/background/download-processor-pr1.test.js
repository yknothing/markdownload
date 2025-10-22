/**
 * PR-1: Download Processor正确测试
 * 直接require源文件确保覆盖率正确入账到file-summary.json
 * 目标：≥25%分支覆盖率
 */

'use strict';

// 直接require源文件 - 确保覆盖率正确归集
require('../../../src/background/business/download-processor.js');

describe('Download Processor - PR1 Coverage Tests', () => {
  let mockErrorHandler, mockDownloadManager;
  
  beforeEach(() => {
    // 清理全局变量
    if (global.DownloadProcessor) {
      delete global.DownloadProcessor;
    }
    if (global.DownloadManager) {
      delete global.DownloadManager;
    }
    if (global.ErrorHandler) {
      delete global.ErrorHandler;
    }
    
    // 重新加载模块
    jest.isolateModules(() => {
      require('../../../src/background/business/download-processor.js');
    });
    
    // Setup mocks
    mockErrorHandler = {
      handleDownloadError: jest.fn()
    };
    
    mockDownloadManager = {
      download: jest.fn()
    };
    
    global.ErrorHandler = mockErrorHandler;
    global.console.log = jest.fn();
    global.console.error = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateDownloadData - Multiple Validation Branches', () => {
    test('should validate null/undefined data - Branch A', () => {
      const result1 = global.DownloadProcessor.validateDownloadData(null);
      expect(result1.valid).toBe(false);
      expect(result1.errors).toContain('data is required');
      
      const result2 = global.DownloadProcessor.validateDownloadData(undefined);
      expect(result2.valid).toBe(false);
      expect(result2.errors).toContain('data is required');
    });

    test('should validate markdown content branches - Branches B1-B4', () => {
      // B1: Missing markdown
      const result1 = global.DownloadProcessor.validateDownloadData({
        title: 'Test'
      });
      expect(result1.valid).toBe(false);
      expect(result1.errors).toContain('markdown must be a non-empty string');
      
      // B2: Invalid markdown type
      const result2 = global.DownloadProcessor.validateDownloadData({
        markdown: 123,
        title: 'Test'
      });
      expect(result2.valid).toBe(false);
      expect(result2.errors).toContain('markdown must be a non-empty string');
      
      // B3: Markdown too large
      const largeContent = 'x'.repeat(11 * 1024 * 1024); // 11MB
      const result3 = global.DownloadProcessor.validateDownloadData({
        markdown: largeContent,
        title: 'Test'
      });
      expect(result3.valid).toBe(false);
      expect(result3.errors).toContain('markdown content too large (max 10MB)');
      
      // B4: Valid markdown
      const result4 = global.DownloadProcessor.validateDownloadData({
        markdown: 'Valid content',
        title: 'Test'
      });
      expect(result4.valid).toBe(true);
    });

    test('should validate title branches - Branches C1-C3', () => {
      // C1: Missing title
      const result1 = global.DownloadProcessor.validateDownloadData({
        markdown: 'content'
      });
      expect(result1.valid).toBe(false);
      expect(result1.errors).toContain('title must be a non-empty string');
      
      // C2: Title too long
      const longTitle = 'x'.repeat(1001);
      const result2 = global.DownloadProcessor.validateDownloadData({
        markdown: 'content',
        title: longTitle
      });
      expect(result2.valid).toBe(false);
      expect(result2.errors).toContain('title too long (max 1000 characters)');
      
      // C3: Valid title
      const result3 = global.DownloadProcessor.validateDownloadData({
        markdown: 'content',
        title: 'Valid Title'
      });
      expect(result3.valid).toBe(true);
    });

    test('should validate tabId branches - Branches D1-D2', () => {
      // D1: Invalid tabId
      const result1 = global.DownloadProcessor.validateDownloadData({
        markdown: 'content',
        title: 'Test',
        tabId: -1
      });
      expect(result1.valid).toBe(false);
      expect(result1.errors).toContain('tabId must be a positive integer');
      
      // D2: Valid tabId
      const result2 = global.DownloadProcessor.validateDownloadData({
        markdown: 'content',
        title: 'Test',
        tabId: 123
      });
      expect(result2.valid).toBe(true);
    });

    test('should validate optional fields branches - Branches E1-E4', () => {
      // E1: Invalid imageList
      const result1 = global.DownloadProcessor.validateDownloadData({
        markdown: 'content',
        title: 'Test',
        imageList: 'invalid'
      });
      expect(result1.valid).toBe(false);
      expect(result1.errors).toContain('imageList must be an object');
      
      // E2: Invalid options
      const result2 = global.DownloadProcessor.validateDownloadData({
        markdown: 'content',
        title: 'Test',
        options: 'invalid'
      });
      expect(result2.valid).toBe(false);
      expect(result2.errors).toContain('options must be an object');
      
      // E3: Invalid mdClipsFolder
      const result3 = global.DownloadProcessor.validateDownloadData({
        markdown: 'content',
        title: 'Test',
        mdClipsFolder: 'x'.repeat(256)
      });
      expect(result3.valid).toBe(false);
      expect(result3.errors).toContain('mdClipsFolder must be a string with max 255 characters');
      
      // E4: All valid optional fields
      const result4 = global.DownloadProcessor.validateDownloadData({
        markdown: 'content',
        title: 'Test',
        tabId: 123,
        imageList: {},
        options: {},
        mdClipsFolder: 'valid-folder'
      });
      expect(result4.valid).toBe(true);
    });
  });

  describe('handleFileOperations - Switch Branches', () => {
    test('should handle validateFilename operation - Branch F1', () => {
      const result = global.DownloadProcessor.handleFileOperations('validateFilename', {
        filename: 'valid-file.md'
      });
      expect(result.valid).toBe(true);
    });

    test('should handle sanitizeFilename operation - Branch F2', () => {
      const result = global.DownloadProcessor.handleFileOperations('sanitizeFilename', {
        filename: 'invalid<>file'
      });
      expect(result).toBe('invalid__file.md');
    });

    test('should handle generateUniqueName operation - Branch F3', () => {
      const result = global.DownloadProcessor.handleFileOperations('generateUniqueName', {
        filename: 'test.md',
        existingFiles: ['test.md']
      });
      expect(result).toBe('test (1).md');
    });

    test('should handle unknown operation - Branch F4', () => {
      expect(() => {
        global.DownloadProcessor.handleFileOperations('unknown', {});
      }).toThrow('Unknown file operation: unknown');
    });
  });

  describe('validateFilename - Validation Branches', () => {
    test('should validate filename types and lengths - Branches G1-G4', () => {
      // G1: Invalid type
      const result1 = global.DownloadProcessor.handleFileOperations('validateFilename', {
        filename: null
      });
      expect(result1.valid).toBe(false);
      expect(result1.error).toContain('must be a non-empty string');
      
      // G2: Dangerous characters
      const result2 = global.DownloadProcessor.handleFileOperations('validateFilename', {
        filename: 'file<test>.md'
      });
      expect(result2.valid).toBe(false);
      expect(result2.error).toContain('invalid characters');
      
      // G3: Too long
      const longName = 'x'.repeat(256) + '.md';
      const result3 = global.DownloadProcessor.handleFileOperations('validateFilename', {
        filename: longName
      });
      expect(result3.valid).toBe(false);
      expect(result3.error).toContain('too long');
      
      // G4: Reserved name
      const result4 = global.DownloadProcessor.handleFileOperations('validateFilename', {
        filename: 'CON.md'
      });
      expect(result4.valid).toBe(false);
      expect(result4.error).toContain('reserved name');
    });
  });

  describe('handleTemplateProcessing - Template Branches', () => {
    test('should handle different template types - Branches H1-H4', () => {
      const testData = {
        title: 'Test Title',
        source: 'test-source',
        tags: ['tag1', 'tag2']
      };
      
      // H1: Frontmatter
      const result1 = global.DownloadProcessor.handleTemplateProcessing('frontmatter', testData);
      expect(result1).toContain('title: "Test Title"');
      expect(result1).toContain('source: "test-source"');
      
      // H2: Backmatter
      const result2 = global.DownloadProcessor.handleTemplateProcessing('backmatter', testData);
      expect(result2).toContain('Generated by MarkDownload');
      
      // H3: Custom
      const result3 = global.DownloadProcessor.handleTemplateProcessing('custom', testData);
      expect(result3).toBe('');
      
      // H4: Default
      const result4 = global.DownloadProcessor.handleTemplateProcessing('unknown', testData);
      expect(result4).toBe('');
    });
  });
});