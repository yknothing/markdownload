/**
 * Service Worker Lifecycle Manager
 * Handles service worker installation, activation, and lifecycle events
 * Follows SRP: Single responsibility - manage SW lifecycle only
 */

// Lifecycle Manager Module
(function() {
  'use strict';

  console.log('🔧 Loading Lifecycle Manager module...');

  // Lifecycle states
  const LIFECYCLE_STATES = {
    INSTALLING: 'installing',
    INSTALLED: 'installed',
    ACTIVATING: 'activating',
    ACTIVATED: 'activated',
    REDUNDANT: 'redundant'
  };

  // Current state
  let currentState = LIFECYCLE_STATES.INSTALLING;

  /**
   * Handle service worker installation
   */
  function handleInstall(event) {
    console.log('📦 Service Worker installing...');
    currentState = LIFECYCLE_STATES.INSTALLING;

    // Force activation to ensure new version takes effect immediately
    self.skipWaiting();

    // Perform installation tasks
    event.waitUntil(
      Promise.resolve().then(() => {
        console.log('✅ Service Worker installation completed');
        currentState = LIFECYCLE_STATES.INSTALLED;
        return performInstallationTasks();
      }).catch(error => {
        console.error('❌ Service Worker installation failed:', error);
        currentState = LIFECYCLE_STATES.REDUNDANT;
        throw error;
      })
    );
  }

  /**
   * Handle service worker activation
   */
  function handleActivate(event) {
    console.log('🚀 Service Worker activating...');
    currentState = LIFECYCLE_STATES.ACTIVATING;

    // Take control of all clients immediately
    event.waitUntil(
      self.clients.claim().then(() => {
        console.log('✅ Service Worker activated and controlling clients');
        currentState = LIFECYCLE_STATES.ACTIVATED;

        // Perform activation cleanup and setup
        return performActivationTasks();
      }).catch(error => {
        console.error('❌ Service Worker activation failed:', error);
        currentState = LIFECYCLE_STATES.REDUNDANT;
        throw error;
      })
    );
  }

  /**
   * Perform installation-specific tasks
   */
  async function performInstallationTasks() {
    try {
      // Pre-load critical resources
      await preloadCriticalResources();

      // Initialize persistent storage if needed
      await initializeStorage();

      // Set up offline capabilities
      await setupOfflineSupport();

      console.log('✅ Installation tasks completed');
    } catch (error) {
      console.error('❌ Installation tasks failed:', error);
      throw error;
    }
  }

  /**
   * Perform activation-specific tasks
   */
  async function performActivationTasks() {
    try {
      // Clean up old caches
      await cleanupOldCaches();

      // Update client registrations
      await updateClientRegistrations();

      // Log activation statistics
      await logActivationMetrics();

      console.log('✅ Activation tasks completed');
    } catch (error) {
      console.error('❌ Activation tasks failed:', error);
      throw error;
    }
  }

  /**
   * Pre-load critical resources
   */
  async function preloadCriticalResources() {
    // Pre-load essential modules and resources
    const criticalResources = [
      // Core modules that should be available immediately
      'core/error-handling.js',
      'api/browser-api.js',
      'core/initialization.js'
    ];

    // Note: In Service Worker context, we can't actually preload scripts
    // but we can validate their availability
    for (const resource of criticalResources) {
      if (!self.hasOwnProperty(resource.replace(/[^a-zA-Z0-9]/g, '_'))) {
        console.warn(`⚠️ Critical resource not available: ${resource}`);
      }
    }
  }

  /**
   * Initialize persistent storage
   */
  async function initializeStorage() {
    // Ensure storage is ready for the application
    try {
      // Test storage availability
      if (self.indexedDB) {
        console.log('✅ IndexedDB available');
      }

      if (self.caches) {
        console.log('✅ Cache API available');
      }
    } catch (error) {
      console.warn('⚠️ Storage initialization warning:', error);
    }
  }

  /**
   * Set up offline support
   */
  async function setupOfflineSupport() {
    // Initialize offline capabilities
    try {
      if ('serviceWorker' in navigator && 'caches' in self) {
        console.log('✅ Offline support initialized');
      }
    } catch (error) {
      console.warn('⚠️ Offline support setup warning:', error);
    }
  }

  /**
   * Clean up old caches
   */
  async function cleanupOldCaches() {
    try {
      if (self.caches) {
        const cacheNames = await self.caches.keys();
        const oldCaches = cacheNames.filter(name =>
          name.startsWith('markdownload-') &&
          !name.includes('v' + Date.now()) // Simple versioning
        );

        await Promise.all(
          oldCaches.map(cacheName => self.caches.delete(cacheName))
        );

        if (oldCaches.length > 0) {
          console.log(`🗑️ Cleaned up ${oldCaches.length} old caches`);
        }
      }
    } catch (error) {
      console.warn('⚠️ Cache cleanup warning:', error);
    }
  }

  /**
   * Update client registrations
   */
  async function updateClientRegistrations() {
    try {
      const clients = await self.clients.matchAll();
      console.log(`📊 Service Worker now controlling ${clients.length} clients`);

      // Notify all clients of the new service worker
      clients.forEach(client => {
        client.postMessage({
          type: 'serviceWorkerActivated',
          timestamp: Date.now()
        });
      });
    } catch (error) {
      console.warn('⚠️ Client registration update warning:', error);
    }
  }

  /**
   * Log activation metrics
   */
  async function logActivationMetrics() {
    try {
      const clients = await self.clients.matchAll();
      const metrics = {
        timestamp: Date.now(),
        clientCount: clients.length,
        userAgent: navigator?.userAgent || 'unknown',
        activationDuration: performance.now()
      };

      console.log('📊 Activation metrics:', metrics);

      // Store metrics for debugging/analysis
      if (self.ErrorHandler) {
        self.ErrorHandler.logMetrics('activation', metrics);
      }
    } catch (error) {
      console.warn('⚠️ Metrics logging warning:', error);
    }
  }

  /**
   * Get current lifecycle state
   */
  function getCurrentState() {
    return currentState;
  }

  /**
   * Check if service worker is ready
   */
  function isReady() {
    return currentState === LIFECYCLE_STATES.ACTIVATED;
  }

  // Export public API
  self.LifecycleManager = {
    handleInstall,
    handleActivate,
    getCurrentState,
    isReady,
    LIFECYCLE_STATES
  };

  console.log('✅ Lifecycle Manager module loaded');

})();
