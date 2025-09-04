// Download Manager Module
// Handles file downloads, image processing, and download coordination

(function() {
  'use strict';

  console.log('🔧 Loading Download Manager module...');

  // 🚨 SECURITY: Define SecurityError class for security-related exceptions
  class SecurityError extends Error {
    constructor(message) {
      super(message);
      this.name = 'SecurityError';
      this.isSecurityError = true;
    }
  }

  // 🚨 SECURITY: Validate URI for navigation to prevent code injection
  function validateUriForNavigation(uri) {
    try {
      if (!uri || typeof uri !== 'string') {
        throw new Error('Invalid URI: must be a non-empty string');
      }

      // 🚨 SECURITY: Remove null bytes and control characters
      uri = uri.replace(/[\x00-\x1F\x7F]/g, '');

      // 🚨 SECURITY: Only allow HTTP/HTTPS and custom protocols like obsidian://
      const allowedProtocols = ['http:', 'https:', 'obsidian:'];
      const url = new URL(uri);

      if (!allowedProtocols.includes(url.protocol.toLowerCase())) {
        console.warn(`🚨 SECURITY: Blocked unauthorized protocol: ${url.protocol}`);
        throw new SecurityError(`Unauthorized protocol: ${url.protocol}`);
      }

      // 🚨 SECURITY: Prevent directory traversal attacks
      if (uri.includes('..') || uri.includes('\\')) {
        console.warn('🚨 SECURITY: Blocked potential directory traversal:', uri);
        throw new SecurityError('Directory traversal detected');
      }

      // 🚨 SECURITY: Limit URI length to prevent DoS
      if (uri.length > 4096) {
        console.warn('🚨 SECURITY: URI too long, truncating');
        uri = uri.substring(0, 4096);
      }

      // 🚨 SECURITY: Validate domain for HTTP/HTTPS URLs
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        const domain = url.hostname.toLowerCase();

        // 🚨 SECURITY: Block suspicious domains
        const suspiciousDomains = [
          'localhost', '127.0.0.1', '0.0.0.0',
          '10.0.0.0', '172.16.0.0', '192.168.0.0'
        ];

        if (suspiciousDomains.some(suspicious => domain.includes(suspicious))) {
          console.warn(`🚨 SECURITY: Blocked suspicious domain: ${domain}`);
          throw new SecurityError(`Suspicious domain blocked: ${domain}`);
        }
      }

      return uri;

    } catch (error) {
      console.error('🚨 SECURITY: URI validation for navigation failed:', error.message);
      return null; // Return null to indicate validation failure
    }
  }

  // Download states and modes
  const DOWNLOAD_MODES = {
    DOWNLOADS_API: 'downloadsApi',
    CONTENT_SCRIPT: 'contentScript',
    OBSIDIAN_URI: 'obsidianUri'
  };

  const DOWNLOAD_STATES = {
    PENDING: 'pending',
    DOWNLOADING: 'downloading',
    COMPLETED: 'completed',
    FAILED: 'failed'
  };

  // Active downloads tracking
  const activeDownloads = new Map();
  const downloadListeners = new Map();

  /**
   * Main download function
   */
  async function download(data) {
    try {
      console.log('📥 Starting download process:', data);

      const {
        markdown,
        title,
        tabId,
        imageList = {},
        mdClipsFolder = '',
        options = {}
      } = data;

      // Get merged options
      const mergedOptions = await getMergedOptions(options);

      // Determine download mode
      const downloadMode = mergedOptions.downloadMode || DOWNLOAD_MODES.DOWNLOADS_API;

      // Pre-process images if needed
      const processedData = await preProcessImages(markdown, imageList, mergedOptions);

      // Execute download based on mode
      switch (downloadMode) {
        case DOWNLOAD_MODES.DOWNLOADS_API:
          return await downloadViaApi(processedData, title, tabId, mdClipsFolder, mergedOptions);

        case DOWNLOAD_MODES.OBSIDIAN_URI:
          return await downloadViaObsidian(processedData, title, tabId, mergedOptions);

        case DOWNLOAD_MODES.CONTENT_SCRIPT:
        default:
          return await downloadViaContentScript(processedData, title, tabId, mdClipsFolder, mergedOptions);
      }

    } catch (error) {
      console.error('❌ Download failed:', error);
      if (self.ErrorHandler) {
        self.ErrorHandler.handleDownloadError(error, data?.title || 'unknown');
      }

      // Return error result instead of throwing
      return {
        success: false,
        error: error.message || 'Download failed',
        title: data?.title || 'unknown'
      };
    }
  }

  /**
   * Download via Downloads API
   */
  async function downloadViaApi(data, title, tabId, mdClipsFolder, options) {
    try {
      if (!browser.downloads) {
        throw new Error('Downloads API not available');
      }

      const { markdown, imageList } = data;

      // Ensure folder path format
      const folderPath = mdClipsFolder && !mdClipsFolder.endsWith('/') ? mdClipsFolder + '/' : mdClipsFolder;

      // Create markdown blob and download
      const markdownUrl = createMarkdownBlob(markdown);
      let safeTitle = generateValidFileName(title, options.disallowedChars);
      // 确保不重复添加.md扩展名
      if (!safeTitle.endsWith('.md')) {
        safeTitle += '.md';
      }
      const filename = folderPath + safeTitle;

      console.log('📄 Downloading markdown file:', filename);

      const downloadId = await browser.downloads.download({
        url: markdownUrl,
        filename: filename,
        saveAs: options.saveAs
      });

      // Track download for cleanup
      trackDownload(downloadId, markdownUrl);

      // Download images if enabled
      if (options.downloadImages && Object.keys(imageList).length > 0) {
        await downloadImages(imageList, folderPath, title, options);
      }

      return {
        success: true,
        downloadId: downloadId,
        filename: filename,
        imagesDownloaded: Object.keys(imageList).length
      };
    } catch (error) {
      console.error('❌ Downloads API failed:', error);
      throw error; // Re-throw to be handled by main download function
    }
  }

  /**
   * Download via Content Script
   */
  async function downloadViaContentScript(data, title, tabId, mdClipsFolder, options) {
    try {
      const { markdown } = data;

      // Ensure content scripts are available
      await ensureScripts(tabId);

      // Content Script 模式不支持子目录，统一仅使用文件名
      const filename = generateValidFileName(title, options.disallowedChars) + '.md';

      await browser.scripting.executeScript({
        target: { tabId: tabId },
        func: downloadMarkdown,
        args: [filename, base64EncodeUnicode(markdown)]
      });

      return {
        success: true,
        filename: filename,
        method: 'contentScript'
      };

    } catch (error) {
      console.error('❌ Content script download failed:', error);
      throw new Error('Content script download failed: ' + error.message);
    }
  }

  /**
   * Download via Obsidian URI
   */
  async function downloadViaObsidian(data, title, tabId, options) {
    try {
      const { markdown } = data;

      await ensureScripts(tabId);

      let uri = 'obsidian://new?';
      uri += `${options.obsidianPathType}=${encodeURIComponent(title)}`;
      if (options.obsidianVault) {
        uri += `&vault=${encodeURIComponent(options.obsidianVault)}`;
      }
      uri += `&content=${encodeURIComponent(markdown)}`;

      // 🚨 SECURITY: Replace dangerous dynamic code execution with safe navigation
      // Instead of executing arbitrary code, use the browser.tabs.update API
      // which is safer and doesn't allow code injection

      try {
        // 🚨 SECURITY: Validate URI before navigation
        const validatedUri = validateUriForNavigation(uri);
        if (!validatedUri) {
          throw new SecurityError('Invalid URI for navigation');
        }

        // 🚨 SECURITY: Use browser.tabs.update instead of executeScript
        await browser.tabs.update(tabId, { url: validatedUri });

        console.log('✅ Safe navigation completed to:', validatedUri);

      } catch (error) {
        console.error('🚨 SECURITY: Navigation failed:', error.message);

        // 🚨 SECURITY: Don't execute any fallback code that could be dangerous
        throw new Error('Safe navigation failed: ' + error.message);
      }

      return {
        success: true,
        method: 'obsidianUri',
        uri: uri
      };

    } catch (error) {
      console.error('❌ Obsidian URI download failed:', error);
      throw new Error('Obsidian URI download failed: ' + error.message);
    }
  }

  /**
   * Download images
   */
  async function downloadImages(imageList, folderPath, title, options) {
    console.log('🖼️ Downloading images:', Object.keys(imageList).length);

    const downloadPromises = Object.entries(imageList).map(async ([src, filename]) => {
      try {
        // Calculate destination path
        const destPath = folderPath + title.substring(0, title.lastIndexOf('/'));
        const finalPath = destPath && !destPath.endsWith('/') ? destPath + '/' : destPath;

        const imageDownloadId = await browser.downloads.download({
          url: src,
          filename: finalPath ? finalPath + filename : filename,
          saveAs: false
        });

        // Track image download for cleanup
        trackDownload(imageDownloadId, src);

        console.log('✅ Image downloaded:', filename);
        return { success: true, filename: filename, downloadId: imageDownloadId };

      } catch (error) {
        console.error('❌ Image download failed:', filename, error);
        return { success: false, filename: filename, error: error.message };
      }
    });

    const results = await Promise.allSettled(downloadPromises);

    const successful = results.filter(result =>
      result.status === 'fulfilled' && result.value.success
    ).length;

    const failed = results.length - successful;

    console.log(`📊 Image download results: ${successful} successful, ${failed} failed`);

    return { successful, failed, results };
  }

  /**
   * Pre-process images (download and convert to base64 if needed)
   */
  async function preProcessImages(markdown, imageList, options) {
    if (!options.downloadImages || Object.keys(imageList).length === 0) {
      return { markdown, imageList };
    }

    console.log('🔄 Pre-processing images...');

    if (options.imageStyle === 'base64') {
      return await convertImagesToBase64(markdown, imageList, options);
    } else {
      return await prepareImagesForDownload(markdown, imageList, options);
    }
  }

  /**
   * Convert images to base64
   */
  async function convertImagesToBase64(markdown, imageList, options) {
    console.log('🔄 Converting images to base64...');

    const newImageList = {};

    await Promise.all(Object.entries(imageList).map(async ([src, filename]) => {
      try {
        const base64Data = await downloadImageAsBase64(src);
        markdown = markdown.replaceAll(src, base64Data);
        console.log('✅ Image converted to base64:', filename);
      } catch (error) {
        console.error('❌ Image base64 conversion failed:', filename, error);
      }
    }));

    return { markdown, imageList: newImageList };
  }

  /**
   * Prepare images for download (resolve file extensions, etc.)
   */
  async function prepareImagesForDownload(markdown, imageList, options) {
    console.log('🔄 Preparing images for download...');

    const newImageList = {};

    await Promise.all(Object.entries(imageList).map(async ([src, filename]) => {
      try {
        const blob = await downloadImageBlob(src);
        let newFilename = filename;

        // Handle unknown extensions
        if (newFilename.endsWith('.idunno')) {
          const extension = getExtensionFromMimeType(blob.type);
          newFilename = filename.replace('.idunno', '.' + extension);

          // Update markdown with correct filename
          if (!options.imageStyle.startsWith('obsidian')) {
            markdown = markdown.replaceAll(
              filename.split('/').map(s => encodeURI(s)).join('/'),
              newFilename.split('/').map(s => encodeURI(s)).join('/')
            );
          } else {
            markdown = markdown.replaceAll(filename, newFilename);
          }
        }

        // Create blob URL for download
        const blobUrl = URL.createObjectURL(blob);
        newImageList[blobUrl] = newFilename;

        console.log('✅ Image prepared:', newFilename);

      } catch (error) {
        console.error('❌ Image preparation failed:', filename, error);
      }
    }));

    return { markdown, imageList: newImageList };
  }

  /**
   * Download image as blob
   */
  function downloadImageBlob(src) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', src);
      xhr.responseType = 'blob';
      xhr.onload = () => resolve(xhr.response);
      xhr.onerror = () => reject(new Error('Network error downloading image: ' + src));
      xhr.send();
    });
  }

  /**
   * Download image as base64
   */
  async function downloadImageAsBase64(src) {
    const blob = await downloadImageBlob(src);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Get file extension from MIME type
   */
  function getExtensionFromMimeType(mimeType) {
    const mimeToExt = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
      'image/bmp': 'bmp'
    };

    return mimeToExt[mimeType] || 'png'; // Default to png
  }

  /**
   * Create markdown blob URL
   */
  function createMarkdownBlob(markdown) {
    try {
      if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
        const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
        return URL.createObjectURL(blob);
      }
    } catch (_) { /* fall through */ }
    // Fallback for MV3 service worker: use data URL
    return 'data:text/markdown;charset=utf-8,' + encodeURIComponent(markdown);
  }

  /**
   * Track download for cleanup
   */
  function trackDownload(downloadId, url) {
    activeDownloads.set(downloadId, url);

    const listener = createDownloadListener(downloadId, url);
    downloadListeners.set(downloadId, listener);
    browser.downloads.onChanged.addListener(listener);
  }

  /**
   * Create download completion listener
   */
  function createDownloadListener(id, url) {
    return function(delta) {
      if (delta.id === id && delta.state && delta.state.current === 'complete') {
        // Remove listener
        browser.downloads.onChanged.removeListener(downloadListeners.get(id));
        downloadListeners.delete(id);

        // Clean up blob URL
        try { URL.revokeObjectURL(url); } catch (_) { /* ignore for data: URLs */ }
        activeDownloads.delete(id);

        console.log('🧹 Download cleanup completed for ID:', id);
      }
    };
  }

  /**
   * Generate valid filename
   */
  function generateValidFileName(title, disallowedChars = null) {
    // 修复：提供标题兜底逻辑
    if (!title || (typeof title === 'string' && title.trim().length === 0)) {
      return 'download';
    }

    let name = String(title);

      // Remove illegal characters for cross-platform filesystem compatibility
  const illegalRe = /[\/\\*?"<>|:]/g;
  name = name.replace(illegalRe, '_').replace(/\u00A0/g, ' ');

    // Collapse whitespace
    name = name.replace(/\s+/g, ' ').trim();

    // Remove disallowed characters
    if (disallowedChars) {
      for (let char of disallowedChars) {
        if ('[\\^$.|?*+()'.includes(char)) {
          char = '\\' + char;
        }
        name = name.replace(new RegExp(char, 'g'), '');
      }
    }

    // Ensure maximum filename length (255 characters including extension)
    if (name.length > 255) {
      // Reserve space for extension
      const extension = name.substring(name.lastIndexOf('.'));
      const maxBaseLength = 255 - extension.length;
      name = name.substring(0, maxBaseLength) + extension;
    }

    return name;
  }

  /**
   * Base64 encode unicode string
   */
  function base64EncodeUnicode(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
      return String.fromCharCode('0x' + p1);
    }));
  }

  /**
   * Ensure scripts are available in tab
   */
  async function ensureScripts(tabId) {
    try {
      // This would need to be implemented based on existing ensureScripts function
      console.log('🔧 Ensuring scripts available in tab:', tabId);
    } catch (error) {
      throw new Error('Failed to ensure scripts: ' + error.message);
    }
  }

  /**
   * Get merged options (from storage + provided options)
   */
  async function getMergedOptions(providedOptions = {}) {
    try {
      // This would need to integrate with existing options system
      const defaultOptions = {
        downloadMode: DOWNLOAD_MODES.DOWNLOADS_API,
        downloadImages: true,
        imageStyle: 'markdown',
        saveAs: false,
        disallowedChars: []
      };

      // In a real implementation, this would fetch from storage
      const storedOptions = {};

      return { ...defaultOptions, ...storedOptions, ...providedOptions };
    } catch (error) {
      console.warn('⚠️ Failed to get merged options:', error);
      return providedOptions;
    }
  }

  /**
   * Get download statistics
   */
  function getDownloadStats() {
    return {
      activeDownloads: activeDownloads.size,
      trackedDownloads: Array.from(activeDownloads.keys()),
      listenersCount: downloadListeners.size
    };
  }

  /**
   * Clean up completed downloads
   */
  function cleanupCompletedDownloads() {
    console.log('🧹 Cleaning up completed downloads...');

    for (const [downloadId, url] of activeDownloads) {
      // Check if download is still active
      browser.downloads.search({ id: downloadId }).then(results => {
        const download = results[0];
        if (download && download.state === 'complete') {
          URL.revokeObjectURL(url);
          activeDownloads.delete(downloadId);

          if (downloadListeners.has(downloadId)) {
            browser.downloads.onChanged.removeListener(downloadListeners.get(downloadId));
            downloadListeners.delete(downloadId);
          }
        }
      }).catch(error => {
        console.warn('⚠️ Error checking download status:', error);
      });
    }
  }

  // Export module interface
  self.DownloadManager = {
    download: download,
    generateValidFileName: generateValidFileName,
    base64EncodeUnicode: base64EncodeUnicode,
    getStats: getDownloadStats,
    cleanup: cleanupCompletedDownloads,

    // Constants
    MODES: DOWNLOAD_MODES,
    STATES: DOWNLOAD_STATES
  };

  console.log('✅ Download Manager module loaded');

  // Export for Jest testing compatibility
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = self.DownloadManager;
  }

})();
