// Build Integration Module
// Demonstrates how to integrate all modules together

(function() {
  'use strict';

  console.log('🔧 Loading Build Integration module...');

  /**
   * Main integration function that demonstrates full workflow
   */
  async function processContentWorkflow(htmlString, baseURI, pageTitle, tabId, options = {}) {
    try {
      console.log('🚀 Starting integrated content processing workflow...');

      // Step 1: Extract content using Content Extractor
      const article = await self.ContentExtractor.extract(htmlString, baseURI, pageTitle, options);
      console.log('✅ Content extracted:', article.title);

      // Step 2: Convert to Markdown using Turndown Manager
      const conversionResult = await self.TurndownManager.convert(
        article.content,
        options,
        article
      );
      console.log('✅ Content converted to Markdown');

      // Step 3: Handle downloads using Download Manager
      const downloadResult = await self.DownloadManager.download({
        markdown: conversionResult.markdown,
        title: article.title,
        tabId: tabId,
        imageList: conversionResult.imageList,
        mdClipsFolder: options.mdClipsFolder || '',
        options: options
      });
      console.log('✅ Download completed:', downloadResult);

      // Step 4: Clean up Turndown state
      self.TurndownManager.clearState();

      return {
        success: true,
        article: article,
        markdown: conversionResult.markdown,
        imageList: conversionResult.imageList,
        downloadResult: downloadResult
      };

    } catch (error) {
      console.error('❌ Integrated workflow failed:', error);

      // Log error using Error Handler
      if (self.ErrorHandler) {
        self.ErrorHandler.handleTurndownError(error, htmlString, 'integrated-workflow');
      }

      throw error;
    }
  }

  /**
   * Health check for all modules
   */
  function performModuleHealthCheck() {
    console.log('🏥 Performing module health check...');

    const healthStatus = {
      timestamp: Date.now(),
      modules: {}
    };

    // Check each module
    const modulesToCheck = [
      { name: 'ContentExtractor', module: self.ContentExtractor },
      { name: 'TurndownManager', module: self.TurndownManager },
      { name: 'DownloadManager', module: self.DownloadManager },
      { name: 'BrowserAPI', module: self.BrowserAPI },
      { name: 'ErrorHandler', module: self.ErrorHandler },
      { name: 'ServiceWorkerInit', module: self.ServiceWorkerInit },
      { name: 'DOMPolyfill', module: self.DOMPolyfill }
    ];

    modulesToCheck.forEach(({ name, module }) => {
      healthStatus.modules[name] = {
        loaded: !!module,
        status: module ? 'available' : 'missing'
      };

      if (module && typeof module.getStats === 'function') {
        try {
          healthStatus.modules[name].stats = module.getStats();
        } catch (error) {
          healthStatus.modules[name].stats = { error: error.message };
        }
      }
    });

    console.log('🏥 Health check results:', healthStatus);
    return healthStatus;
  }

  /**
   * Initialize all modules in correct order
   */
  async function initializeAllModules() {
    console.log('🔄 Initializing all modules...');

    const initOrder = [
      'ErrorHandler',
      'DOMPolyfill',
      'ServiceWorkerInit',
      'ContentExtractor',
      'TurndownManager',
      'DownloadManager',
      'BrowserAPI'
    ];

    const results = {};

    for (const moduleName of initOrder) {
      try {
        const module = self[moduleName];
        if (module) {
          if (typeof module.initialize === 'function') {
            await module.initialize();
          }
          results[moduleName] = { status: 'initialized', available: true };
        } else {
          results[moduleName] = { status: 'missing', available: false };
        }
      } catch (error) {
        results[moduleName] = {
          status: 'error',
          available: true,
          error: error.message
        };
      }
    }

    console.log('✅ Module initialization complete:', results);
    return results;
  }

  /**
   * Get workflow statistics
   */
  function getWorkflowStats() {
    const stats = {
      modules: performModuleHealthCheck(),
      workflow: {
        supported: true,
        lastExecution: null,
        successRate: null
      }
    };

    // Add workflow-specific stats
    if (self.DownloadManager && typeof self.DownloadManager.getStats === 'function') {
      stats.workflow.downloadStats = self.DownloadManager.getStats();
    }

    if (self.TurndownManager && typeof self.TurndownManager.getStats === 'function') {
      stats.workflow.conversionStats = self.TurndownManager.getStats();
    }

    return stats;
  }

  /**
   * Clean up all modules
   */
  function cleanupAllModules() {
    console.log('🧹 Cleaning up all modules...');

    // Clean up Turndown state
    if (self.TurndownManager && typeof self.TurndownManager.clearState === 'function') {
      self.TurndownManager.clearState();
    }

    // Clean up download resources
    if (self.DownloadManager && typeof self.DownloadManager.cleanup === 'function') {
      self.DownloadManager.cleanup();
    }

    console.log('✅ Module cleanup complete');
  }

  // Export module interface
  self.BuildIntegration = {
    processContent: processContentWorkflow,
    healthCheck: performModuleHealthCheck,
    initializeAll: initializeAllModules,
    getStats: getWorkflowStats,
    cleanup: cleanupAllModules,

    // Constants
    MODULE_LOAD_ORDER: [
      'ErrorHandler',
      'DOMPolyfill',
      'ServiceWorkerInit',
      'ContentExtractor',
      'TurndownManager',
      'DownloadManager',
      'BrowserAPI'
    ]
  };

  console.log('✅ Build Integration module loaded');

})();
