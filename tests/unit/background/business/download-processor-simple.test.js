/**
 * Download Processor Simple Coverage Tests (PR-1) 
 * Target: ≥25% branch coverage for download-processor.js
 */

// Direct require to ensure coverage attribution
const downloadProcessorModule = require('../../../../src/background/business/download-processor.js');

describe('Download Processor Simple Coverage', () => {
  test('should validate various data scenarios', () => {
    const validator = global.self.DownloadProcessor.validateDownloadData;
    
    // Null data branch
    let result = validator(null);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('data is required');
    
    // Missing markdown branch
    result = validator({ title: 'Test' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('markdown must be a non-empty string');
    
    // Missing title branch  
    result = validator({ markdown: '# Test' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('title must be a non-empty string');
    
    // Empty title branch
    result = validator({ markdown: '# Test', title: '' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('title must be a non-empty string');
    
    // Invalid tabId branch
    result = validator({ 
      markdown: '# Test', 
      title: 'Test', 
      tabId: 'invalid' 
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('tabId must be a positive integer');
    
    // Negative tabId branch
    result = validator({ 
      markdown: '# Test', 
      title: 'Test', 
      tabId: -1 
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('tabId must be a positive integer');
    
    // Invalid imageList type branch
    result = validator({
      markdown: '# Test',
      title: 'Test',
      imageList: 'invalid'
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('imageList must be an object');
    
    // Invalid options type branch
    result = validator({
      markdown: '# Test', 
      title: 'Test',
      options: 'invalid'
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('options must be an object');
    
    // Too long title branch
    const longTitle = 'x'.repeat(1001);
    result = validator({ markdown: '# Test', title: longTitle });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('title too long (max 1000 characters)');
    
    // Too long folder branch
    const longFolder = 'x'.repeat(256);
    result = validator({
      markdown: '# Test',
      title: 'Test', 
      mdClipsFolder: longFolder
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('mdClipsFolder must be a string with max 255 characters');
    
    // Large content branch
    const largeContent = 'x'.repeat(11 * 1024 * 1024);
    result = validator({ title: 'Test', markdown: largeContent });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('markdown content too large (max 10MB)');
  });

  test('should validate valid data scenarios', () => {
    const validator = global.self.DownloadProcessor.validateDownloadData;
    
    // Valid minimal data
    let result = validator({
      markdown: '# Test',
      title: 'Test'
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    
    // Valid with tabId
    result = validator({
      markdown: '# Test',
      title: 'Test',
      tabId: 1
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    
    // Valid with optional fields
    result = validator({
      markdown: '# Test',
      title: 'Test',
      imageList: {},
      options: {},
      mdClipsFolder: 'ValidFolder'
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should convert legacy messages', () => {
    const converter = global.self.DownloadProcessor.convertLegacyMessageToNewFormat;
    
    // With tab branch
    let result = converter({
      markdown: '# Test',
      title: 'Test Article',
      tab: { id: 123 }
    });
    expect(result.tabId).toBe(123);
    expect(result.title).toBe('Test Article');
    
    // Without tab branch
    result = converter({
      markdown: '# Test',
      title: 'Test Article'
    });
    expect(result.tabId).toBeUndefined();
    
    // With options branch
    result = converter({
      markdown: '# Test',
      title: 'Test',
      includeTemplate: true,
      downloadImages: false
    });
    expect(result.options.includeTemplate).toBe(true);
    expect(result.options.downloadImages).toBe(false);
  });
});