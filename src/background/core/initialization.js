// Service Worker Initialization Module
// Handles startup, dependency loading, and readiness verification

(function() {
  'use strict';

  console.log('🔧 Loading Initialization module...');

  // Initialization state tracking
  const initState = {
    started: false,
    browserPolyfillLoaded: false,
    domPolyfillReady: false,
    turndownServiceReady: false,
    allDependenciesLoaded: false,
    errors: []
  };

  // Global download state (moved from main service worker)
  let globalDownloadInProgress = false;
  const downloadDebounceTime = 1000; // 1 second debounce

  /**
   * Service Worker health check - expose status for debugging
   */
  const serviceWorkerStatus = {
    initialized: false,
    dependenciesLoaded: false,
    domPolyfillReady: false,
    turndownServiceReady: false,
    errors: initState.errors
  };

  /**
   * CRITICAL: Initialization gate to prevent premature operations
   */
  let workerInitializationPromise = null;
  let workerReady = false;

  /**
   * Load browser polyfill for cross-browser compatibility
   */
  function checkBrowserPolyfill() {
    return new Promise((resolve, reject) => {
      try {
        // Browser polyfill should already be loaded by service-worker.js
        if (typeof browser !== 'undefined') {
          console.log("✅ Browser polyfill already available");
          initState.browserPolyfillLoaded = true;
          resolve();
        } else {
          console.warn("⚠️ Browser polyfill not available, waiting...");
          // Wait a bit for it to load
          setTimeout(() => {
            if (typeof browser !== 'undefined') {
              console.log("✅ Browser polyfill loaded after delay");
              initState.browserPolyfillLoaded = true;
              resolve();
            } else {
              const error = new Error("Browser polyfill failed to load");
              console.error("❌", error.message);
              initState.errors.push({
                phase: 'browser-polyfill-check',
                error: error.message
              });
              reject(error);
            }
          }, 200);
        }
      } catch (error) {
        console.error("❌ Browser polyfill check failed:", error);
        initState.errors.push({
          phase: 'browser-polyfill-check',
          error: error.message,
          stack: error.stack
        });
        reject(error);
      }
    });
  }

  /**
   * MV3 Scripting API polyfill - ensure browser.scripting works
   */
  function setupScriptingPolyfill() {
    if (typeof browser !== 'undefined' && !browser.scripting && typeof chrome !== 'undefined' && chrome.scripting) {
      browser.scripting = chrome.scripting;
      console.log("✅ Added scripting API polyfill to browser object");
    }
  }

  /**
   * CRITICAL: Synchronous DOM polyfill initialization
   */
  function initializeDOMPolyfillSync() {
    console.log('🔧 Installing DOM polyfill synchronously...');

    if (self.DOMPolyfill && typeof self.DOMPolyfill.install === 'function') {
      self.DOMPolyfill.install();
      initState.domPolyfillReady = true;
      serviceWorkerStatus.domPolyfillReady = true;
      console.log('✅ DOM polyfill installation complete');
    } else {
      console.error('❌ DOMPolyfill module not available');
      initState.errors.push('DOMPolyfill module not available');
    }
  }

  /**
   * Check if TurndownService is ready
   */
  function checkTurndownServiceReady() {
    if (typeof TurndownService !== 'undefined') {
      initState.turndownServiceReady = true;
      serviceWorkerStatus.turndownServiceReady = true;
      console.log('✅ TurndownService is ready');
      return true;
    }
    return false;
  }

  /**
   * Perform comprehensive health check
   */
  function performHealthCheck() {
    console.log('🔍 Performing comprehensive health check...');

    const healthCheck = {
      timestamp: Date.now(),
      domPolyfillReady: initState.domPolyfillReady,
      turndownServiceReady: checkTurndownServiceReady(),
      browserAPIs: {
        browser: typeof browser !== 'undefined',
        chrome: typeof chrome !== 'undefined',
        scripting: !!(browser?.scripting || chrome?.scripting)
      },
      errors: initState.errors.slice()
    };

    console.log('🏥 Health check results:', healthCheck);
    return healthCheck;
  }

  /**
   * Initialize all dependencies
   */
  async function initializeDependencies() {
    console.log('🔄 Initializing service worker dependencies...');

    try {
      // Check browser polyfill availability
      await checkBrowserPolyfill();

      // Setup scripting polyfill
      setupScriptingPolyfill();

      // Initialize DOM polyfill synchronously (critical)
      initializeDOMPolyfillSync();

      // Check TurndownService
      checkTurndownServiceReady();

      initState.allDependenciesLoaded = true;
      serviceWorkerStatus.dependenciesLoaded = true;

      console.log('✅ All dependencies initialized successfully');

    } catch (error) {
      console.error('❌ Dependency initialization failed:', error);
      initState.errors.push('Dependency initialization failed: ' + error.message);
      throw error;
    }
  }

  /**
   * Main initialization function
   */
  async function initializeServiceWorker() {
    if (initState.started) {
      console.log('ℹ️ Service worker initialization already started');
      return workerInitializationPromise;
    }

    initState.started = true;
    console.log("🔄 MarkDownload Service Worker: Starting initialization...");

    // Create initialization promise
    workerInitializationPromise = (async () => {
      try {
        await initializeDependencies();

        // Perform final health check
        const healthCheck = performHealthCheck();

        // Mark as ready
        workerReady = true;
        serviceWorkerStatus.initialized = true;

        console.log("🎉 MarkDownload Service Worker: Fully initialized and ready!");

        return { success: true, healthCheck };

      } catch (error) {
        console.error('🚨 Service Worker initialization failed:', error);
        initState.errors.push('Initialization failed: ' + error.message);

        return {
          success: false,
          error: error.message,
          healthCheck: performHealthCheck()
        };
      }
    })();

    return workerInitializationPromise;
  }

  /**
   * Check if service worker is ready
   */
  function isWorkerReady() {
    return workerReady;
  }

  /**
   * Get initialization status
   */
  function getInitializationStatus() {
    return {
      ...initState,
      serviceWorkerStatus: { ...serviceWorkerStatus }
    };
  }

  /**
   * Wait for initialization to complete
   */
  async function waitForReady(timeout = 10000) {
    if (workerReady) {
      return true;
    }

    if (!workerInitializationPromise) {
      await initializeServiceWorker();
    }

    return Promise.race([
      workerInitializationPromise.then(() => true),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Service worker initialization timeout')), timeout)
      )
    ]);
  }

  // Export module interface
  self.ServiceWorkerInit = {
    initialize: initializeServiceWorker,
    isReady: isWorkerReady,
    waitForReady: waitForReady,
    getStatus: getInitializationStatus,
    performHealthCheck: performHealthCheck,

    // Global state access
    get globalDownloadInProgress() { return globalDownloadInProgress; },
    set globalDownloadInProgress(value) { globalDownloadInProgress = value; },
    downloadDebounceTime: downloadDebounceTime,

    // Service worker status (for backward compatibility)
    serviceWorkerStatus: serviceWorkerStatus
  };

  console.log('✅ Initialization module loaded');

})();
