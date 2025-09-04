/**
 * Download Processor
 * Handles download-related business logic and message processing
 * Follows SRP: Single responsibility - process download operations
 */

// Download Processor Module
(function() {
  'use strict';

  console.log('🔧 Loading Download Processor module...');

  /**
   * Handle download requests from content scripts (new format)
   */
  async function handleDownloadRequest(event, data) {
    try {
      console.log('📥 Processing download request:', data);

      // Validate input data
      const validationResult = validateDownloadData(data);
      if (!validationResult.valid) {
        throw new Error(`Invalid download data: ${validationResult.errors.join(', ')}`);
      }

      // Use the modular download manager if available
      if (self.DownloadManager && typeof self.DownloadManager.download === 'function') {
        const result = await self.DownloadManager.download(data);
        event.ports[0].postMessage({ success: true, result });
        return result;
      } else {
        // Fallback to legacy implementation
        const result = await legacyDownloadMarkdown(data);
        event.ports[0].postMessage({ success: true, result });
        return result;
      }
    } catch (error) {
      console.error('❌ Download request failed:', error);
      if (self.ErrorHandler) {
        self.ErrorHandler.handleDownloadError(error, data?.filename || 'unknown');
      }
      event.ports[0].postMessage({
        success: false,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Handle legacy download requests from popup (old format)
   */
  async function handleLegacyDownloadRequest(event, message) {
    try {
      console.log('📥 Processing legacy download request:', message);

      // Convert legacy format to new format
      const downloadData = convertLegacyMessageToNewFormat(message);

      // Use the modular download manager if available
      if (self.DownloadManager && typeof self.DownloadManager.download === 'function') {
        const result = await self.DownloadManager.download(downloadData);
        // For legacy requests, we don't use ports, just return success
        console.log('✅ Legacy download completed:', result);
        return result;
      } else {
        // Fallback to legacy implementation
        const result = await legacyDownloadMarkdown(downloadData);
        console.log('✅ Legacy download completed (fallback):', result);
        return result;
      }
    } catch (error) {
      console.error('❌ Legacy download request failed:', error);
      if (self.ErrorHandler) {
        self.ErrorHandler.handleDownloadError(error, message?.title || 'unknown');
      }
      throw error; // Re-throw to be caught by outer handler
    }
  }

  /**
   * Validate download data structure and content
   */
  function validateDownloadData(data) {
    const errors = [];

    if (!data) {
      errors.push('data is required');
      return { valid: false, errors };
    }

    // Validate markdown content
    if (!data.markdown || typeof data.markdown !== 'string') {
      errors.push('markdown must be a non-empty string');
    } else if (data.markdown.length > 10 * 1024 * 1024) { // 10MB limit
      errors.push('markdown content too large (max 10MB)');
    }

    // Validate title
    if (!data.title || typeof data.title !== 'string') {
      errors.push('title must be a non-empty string');
    } else if (data.title.length > 1000) {
      errors.push('title too long (max 1000 characters)');
    }

    // Validate tabId
    if (data.tabId !== undefined && (!Number.isInteger(data.tabId) || data.tabId <= 0)) {
      errors.push('tabId must be a positive integer');
    }

    // Validate imageList
    if (data.imageList && typeof data.imageList !== 'object') {
      errors.push('imageList must be an object');
    }

    // Validate options
    if (data.options && typeof data.options !== 'object') {
      errors.push('options must be an object');
    }

    // Validate folder name
    if (data.mdClipsFolder && (typeof data.mdClipsFolder !== 'string' || data.mdClipsFolder.length > 255)) {
      errors.push('mdClipsFolder must be a string with max 255 characters');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Convert legacy message format to new format
   */
  function convertLegacyMessageToNewFormat(message) {
    return {
      markdown: message.markdown,
      title: message.title,
      tabId: message.tab?.id,
      imageList: message.imageList,
      mdClipsFolder: message.mdClipsFolder,
      options: {
        includeTemplate: message.includeTemplate,
        downloadImages: message.downloadImages,
        clipSelection: message.clipSelection
      }
    };
  }

  /**
   * Legacy download function (to be moved to download manager module)
   * TODO: Remove this once download manager module is fully implemented
   */
  async function legacyDownloadMarkdown(data) {
    // This is a placeholder - the actual implementation will be moved to the download module
    console.log('⚠️ Using legacy download implementation');
    throw new Error('Download functionality not yet modularized');
  }

  /**
   * Handle file operations (create, validate, sanitize filenames)
   */
  function handleFileOperations(operation, data) {
    switch (operation) {
      case 'validateFilename':
        return validateFilename(data.filename);
      case 'sanitizeFilename':
        return sanitizeFilename(data.filename);
      case 'generateUniqueName':
        return generateUniqueFilename(data.filename, data.existingFiles);
      default:
        throw new Error(`Unknown file operation: ${operation}`);
    }
  }

  /**
   * Validate filename for security and compatibility
   */
  function validateFilename(filename) {
    if (!filename || typeof filename !== 'string') {
      return { valid: false, error: 'Filename must be a non-empty string' };
    }

    // Check for dangerous characters
    // 修复：允许冒号(:)，因为它在标题中很常见
    const dangerousChars = /[<>"|?*\x00-\x1F]/;
    if (dangerousChars.test(filename)) {
      return { valid: false, error: 'Filename contains invalid characters' };
    }

    // Check length
    if (filename.length > 255) {
      return { valid: false, error: 'Filename too long (max 255 characters)' };
    }

    // Check for reserved names
    const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'LPT1', 'LPT2', 'LPT3'];
    const baseName = filename.split('.')[0].toUpperCase();
    if (reservedNames.includes(baseName)) {
      return { valid: false, error: 'Filename uses reserved name' };
    }

    return { valid: true };
  }

  /**
   * Sanitize filename to make it safe
   */
  function sanitizeFilename(filename) {
    if (!filename || typeof filename !== 'string') {
      return 'untitled.md';
    }

    // Remove or replace dangerous characters
    let sanitized = filename
      .replace(/[<>:"|?*\x00-\x1F]/g, '_')  // Replace dangerous chars with underscore
      .replace(/^\.+/, '')                   // Remove leading dots
      .replace(/\.+$/, '')                   // Remove trailing dots
      .replace(/[\s]+/g, ' ')                // Normalize whitespace
      .trim();

    // Ensure it has a .md extension
    if (!sanitized.toLowerCase().endsWith('.md')) {
      sanitized += '.md';
    }

    // Ensure it's not empty
    if (!sanitized || sanitized === '.md') {
      sanitized = 'untitled.md';
    }

    // Truncate if too long
    if (sanitized.length > 255) {
      const nameWithoutExt = sanitized.slice(0, 251); // Leave room for .md
      sanitized = nameWithoutExt + '.md';
    }

    return sanitized;
  }

  /**
   * Generate unique filename if conflicts exist
   */
  function generateUniqueFilename(filename, existingFiles = []) {
    if (!existingFiles.includes(filename)) {
      return filename;
    }

    const baseName = filename.replace(/\.md$/, '');
    let counter = 1;
    let uniqueName = `${baseName} (${counter}).md`;

    while (existingFiles.includes(uniqueName)) {
      counter++;
      uniqueName = `${baseName} (${counter}).md`;

      // Prevent infinite loop
      if (counter > 1000) {
        uniqueName = `${baseName}_${Date.now()}.md`;
        break;
      }
    }

    return uniqueName;
  }

  /**
   * Handle template processing
   */
  function handleTemplateProcessing(templateType, data) {
    switch (templateType) {
      case 'frontmatter':
        return generateFrontmatter(data);
      case 'backmatter':
        return generateBackmatter(data);
      case 'custom':
        return processCustomTemplate(data);
      default:
        return '';
    }
  }

  /**
   * Generate frontmatter for markdown files
   */
  function generateFrontmatter(data) {
    const frontmatter = [
      '---',
      `title: "${data.title || 'Untitled'}"`,
      `created: "${new Date().toISOString()}"`,
      `source: "${data.source || 'unknown'}"`,
      `tags: [${(data.tags || []).map(tag => `"${tag}"`).join(', ')}]`,
      '---',
      ''
    ];

    return frontmatter.join('\n');
  }

  /**
   * Generate backmatter for markdown files
   */
  function generateBackmatter(data) {
    const backmatter = [
      '',
      '---',
      `*Generated by MarkDownload on ${new Date().toLocaleDateString()}*`,
      data.source ? `*Source: ${data.source}*` : '',
      data.url ? `*URL: ${data.url}*` : ''
    ].filter(line => line).join('\n');

    return backmatter;
  }

  /**
   * Process custom templates
   */
  function processCustomTemplate(data) {
    // Placeholder for custom template processing
    // This would integrate with a template engine
    console.log('⚠️ Custom template processing not yet implemented');
    return '';
  }

  // Export public API
  self.DownloadProcessor = {
    handleDownloadRequest,
    handleLegacyDownloadRequest,
    validateDownloadData,
    convertLegacyMessageToNewFormat,
    handleFileOperations,
    handleTemplateProcessing,
    legacyDownloadMarkdown
  };

  console.log('✅ Download Processor module loaded');

})();
