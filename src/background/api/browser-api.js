// Browser API Module
// Encapsulates browser-specific APIs and provides unified interface

(function() {
  'use strict';

  console.log('🔧 Loading Browser API module...');

  // API availability flags
  const apiAvailability = {
    downloads: false,
    scripting: false,
    tabs: false,
    storage: false,
    runtime: false
  };

  // Message listeners
  const messageListeners = new Map();

  /**
   * Safe browser API call helper
   */
  function safeBrowserCall(apiName, operation, fallback = null) {
    if (!isAPIAvailable(apiName)) {
      const error = new Error(`Browser API '${apiName}' is not available`);
      console.error(`❌ ${operation} failed:`, error.message);
      if (self.ErrorHandler) {
        self.ErrorHandler.handleServiceWorkerError(error, operation);
      }
      return fallback;
    }
    return true;
  }

  /**
   * Initialize browser APIs
   */
  function initializeAPIs() {
    console.log('🔧 Initializing browser APIs...');

    // Wait for browser object to be available
    if (typeof browser === 'undefined') {
      console.warn('⚠️ Browser object not available, APIs will be initialized later');
      // Set up a timeout to check again later
      setTimeout(() => {
        if (typeof browser !== 'undefined') {
          initializeAPIs();
        } else {
          console.error('❌ Browser object still not available after delay');
        }
      }, 100);
      return;
    }

    // Check API availability
    apiAvailability.downloads = !!(browser?.downloads);
    apiAvailability.scripting = !!(browser?.scripting);
    apiAvailability.tabs = !!(browser?.tabs);
    apiAvailability.storage = !!(browser?.storage);
    apiAvailability.runtime = !!(browser?.runtime);

    // Set up MV3 scripting polyfill
    if (typeof browser !== 'undefined' && !browser.scripting && typeof chrome !== 'undefined' && chrome.scripting) {
      browser.scripting = chrome.scripting;
      apiAvailability.scripting = true;
      console.log('✅ Scripting API polyfill applied');
    }

    console.log('✅ Browser APIs initialized:', apiAvailability);
  }

  /**
   * Check if specific API is available
   */
  function isAPIAvailable(apiName) {
    return apiAvailability[apiName] || false;
  }

  /**
   * Get all API availability status
   */
  function getAPIStatus() {
    return { ...apiAvailability };
  }

  /**
   * Execute script in tab
   */
  async function executeScriptInTab(tabId, scriptDetails) {
    if (!safeBrowserCall('scripting', 'executeScriptInTab')) {
      throw new Error('Scripting API not available');
    }

    try {
      const results = await browser.scripting.executeScript({
        target: { tabId: tabId },
        ...scriptDetails
      });

      return results;

    } catch (error) {
      console.error('❌ Script execution failed:', error);
      if (self.ErrorHandler) {
        self.ErrorHandler.handleServiceWorkerError(error, 'executeScriptInTab');
      }
      throw new Error('Script execution failed: ' + error.message);
    }
  }

  /**
   * Download file using Downloads API
   */
  async function downloadFile(downloadOptions) {
    if (!safeBrowserCall('downloads', 'downloadFile')) {
      throw new Error('Downloads API not available');
    }

    try {
      const downloadId = await browser.downloads.download(downloadOptions);
      return downloadId;

    } catch (error) {
      console.error('❌ File download failed:', error);
      if (self.ErrorHandler) {
        self.ErrorHandler.handleDownloadError(error, downloadOptions.filename || 'unknown', 'downloadFile');
      }
      throw new Error('File download failed: ' + error.message);
    }
  }

  /**
   * Search downloads
   */
  async function searchDownloads(query = {}) {
    if (!safeBrowserCall('downloads', 'searchDownloads')) {
      throw new Error('Downloads API not available');
    }

    try {
      const results = await browser.downloads.search(query);
      return results;

    } catch (error) {
      console.error('❌ Download search failed:', error);
      if (self.ErrorHandler) {
        self.ErrorHandler.handleServiceWorkerError(error, 'searchDownloads');
      }
      throw new Error('Download search failed: ' + error.message);
    }
  }

  /**
   * Listen for download changes
   */
  function onDownloadChanged(listener) {
    if (!safeBrowserCall('downloads', 'onDownloadChanged')) {
      console.warn('⚠️ Downloads API not available, cannot listen for changes');
      return () => {}; // Return no-op cleanup function
    }

    try {
      browser.downloads.onChanged.addListener(listener);

      // Return cleanup function
      return () => {
        try {
          browser.downloads.onChanged.removeListener(listener);
        } catch (error) {
          console.error('❌ Failed to remove download listener:', error);
        }
      };
    } catch (error) {
      console.error('❌ Failed to add download listener:', error);
      if (self.ErrorHandler) {
        self.ErrorHandler.handleServiceWorkerError(error, 'onDownloadChanged');
      }
      return () => {}; // Return no-op cleanup function
    }
  }

  /**
   * Get active tab
   */
  async function getActiveTab() {
    if (!isAPIAvailable('tabs')) {
      throw new Error('Tabs API not available');
    }

    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      return tabs[0];

    } catch (error) {
      console.error('❌ Get active tab failed:', error);
      throw new Error('Get active tab failed: ' + error.message);
    }
  }

  /**
   * Get tab by ID
   */
  async function getTab(tabId) {
    if (!isAPIAvailable('tabs')) {
      throw new Error('Tabs API not available');
    }

    try {
      const tab = await browser.tabs.get(tabId);
      return tab;

    } catch (error) {
      console.error('❌ Get tab failed:', error);
      throw new Error('Get tab failed: ' + error.message);
    }
  }

  /**
   * Send message to content script
   */
  async function sendMessageToTab(tabId, message) {
    if (!isAPIAvailable('tabs')) {
      throw new Error('Tabs API not available');
    }

    try {
      const response = await browser.tabs.sendMessage(tabId, message);
      return response;

    } catch (error) {
      console.error('❌ Send message to tab failed:', error);
      throw new Error('Send message to tab failed: ' + error.message);
    }
  }

  /**
   * Get extension options from storage
   */
  async function getOptions() {
    if (!isAPIAvailable('storage')) {
      console.warn('⚠️ Storage API not available, using defaults');
      return getDefaultOptions();
    }

    try {
      const result = await browser.storage.sync.get(null);
      return { ...getDefaultOptions(), ...result };

    } catch (error) {
      console.warn('⚠️ Get options from storage failed:', error);
      return getDefaultOptions();
    }
  }

  /**
   * Save extension options to storage
   */
  async function saveOptions(options) {
    if (!isAPIAvailable('storage')) {
      console.warn('⚠️ Storage API not available, options not saved');
      return false;
    }

    try {
      await browser.storage.sync.set(options);
      return true;

    } catch (error) {
      console.error('❌ Save options failed:', error);
      throw new Error('Save options failed: ' + error.message);
    }
  }

  /**
   * Get default options
   */
  function getDefaultOptions() {
    return {
      // Download options
      downloadMode: 'downloadsApi',
      saveAs: false,

      // Content options
      downloadImages: true,
      imageStyle: 'markdown',
      imageRefStyle: 'inline',
      imagePrefix: '',

      // Formatting options
      frontmatter: '',
      backmatter: '',
      turndownEscape: true,
      linkStyle: 'keep',
      codeBlockStyle: 'fenced',
      fence: '```',

      // File options
      disallowedChars: [],
      mdClipsFolder: '',

      // Advanced options
      includeTemplate: false,
      template: ''
    };
  }

  /**
   * Listen for runtime messages
   */
  function onMessage(listener) {
    if (!isAPIAvailable('runtime')) {
      console.warn('⚠️ Runtime API not available, cannot listen for messages');
      return;
    }

    const messageId = Symbol('messageListener');
    messageListeners.set(messageId, listener);
    browser.runtime.onMessage.addListener(listener);

    // Return cleanup function
    return () => {
      browser.runtime.onMessage.removeListener(listener);
      messageListeners.delete(messageId);
    };
  }

  /**
   * Send message to runtime (popup, options page, etc.)
   */
  async function sendRuntimeMessage(message) {
    if (!isAPIAvailable('runtime')) {
      throw new Error('Runtime API not available');
    }

    try {
      const response = await browser.runtime.sendMessage(message);
      return response;

    } catch (error) {
      console.error('❌ Send runtime message failed:', error);
      throw new Error('Send runtime message failed: ' + error.message);
    }
  }

  /**
   * Create notification
   */
  async function createNotification(notificationOptions) {
    if (!isAPIAvailable('runtime') || !browser.notifications) {
      console.warn('⚠️ Notifications API not available');
      return null;
    }

    try {
      const notificationId = await browser.notifications.create(notificationOptions);
      return notificationId;

    } catch (error) {
      console.error('❌ Create notification failed:', error);
      throw new Error('Create notification failed: ' + error.message);
    }
  }

  /**
   * Get platform information
   */
  async function getPlatformInfo() {
    if (!isAPIAvailable('runtime')) {
      return { os: 'unknown', arch: 'unknown' };
    }

    try {
      const platformInfo = await browser.runtime.getPlatformInfo();
      return platformInfo;

    } catch (error) {
      console.warn('⚠️ Get platform info failed:', error);
      return { os: 'unknown', arch: 'unknown' };
    }
  }

  /**
   * Get browser information
   */
  async function getBrowserInfo() {
    if (!isAPIAvailable('runtime') || !browser.runtime.getBrowserInfo) {
      return 'Browser info not available';
    }

    try {
      const browserInfo = await browser.runtime.getBrowserInfo();
      return browserInfo;

    } catch (error) {
      console.warn('⚠️ Get browser info failed:', error);
      return 'Browser info not available';
    }
  }

  /**
   * Open options page
   */
  async function openOptionsPage() {
    if (!isAPIAvailable('runtime') || !browser.runtime.openOptionsPage) {
      throw new Error('Options page not available');
    }

    try {
      await browser.runtime.openOptionsPage();
      return true;

    } catch (error) {
      console.error('❌ Open options page failed:', error);
      throw new Error('Open options page failed: ' + error.message);
    }
  }

  /**
   * Reload extension
   */
  async function reloadExtension() {
    if (!isAPIAvailable('runtime') || !browser.runtime.reload) {
      throw new Error('Extension reload not available');
    }

    try {
      browser.runtime.reload();
      return true;

    } catch (error) {
      console.error('❌ Reload extension failed:', error);
      throw new Error('Reload extension failed: ' + error.message);
    }
  }

  /**
   * Get message listener count
   */
  function getMessageListenerCount() {
    return messageListeners.size;
  }

  // Initialize APIs when module loads (with delay if browser is not ready)
  if (typeof browser !== 'undefined') {
    initializeAPIs();
  } else {
    console.log('⏳ Browser API module loaded but browser object not ready, will initialize later');
    // Browser polyfill should be loaded by service-worker.js, so this should be rare
    setTimeout(() => {
      if (typeof browser !== 'undefined') {
        initializeAPIs();
      } else {
        console.error('❌ Browser object still not available after delay in BrowserAPI module');
        if (self.ErrorHandler) {
          self.ErrorHandler.logError(
            new Error('Browser object not available in BrowserAPI module'),
            { module: 'BrowserAPI', phase: 'initialization' },
            self.ErrorHandler.CATEGORIES.INITIALIZATION,
            self.ErrorHandler.LEVELS.CRITICAL
          );
        }
      }
    }, 200);
  }

  // Export module interface
  self.BrowserAPI = {
    // API availability
    isAvailable: isAPIAvailable,
    getStatus: getAPIStatus,

    // Downloads API
    downloadFile: downloadFile,
    searchDownloads: searchDownloads,
    onDownloadChanged: onDownloadChanged,

    // Tabs API
    getActiveTab: getActiveTab,
    getTab: getTab,
    sendMessageToTab: sendMessageToTab,

    // Scripting API
    executeScriptInTab: executeScriptInTab,

    // Storage API
    getOptions: getOptions,
    saveOptions: saveOptions,
    getDefaultOptions: getDefaultOptions,

    // Runtime API
    onMessage: onMessage,
    sendRuntimeMessage: sendRuntimeMessage,

    // Notifications API
    createNotification: createNotification,

    // Platform/Browser info
    getPlatformInfo: getPlatformInfo,
    getBrowserInfo: getBrowserInfo,

    // Management
    openOptionsPage: openOptionsPage,
    reloadExtension: reloadExtension,

    // Utilities
    getMessageListenerCount: getMessageListenerCount
  };

  console.log('✅ Browser API module loaded');

})();
